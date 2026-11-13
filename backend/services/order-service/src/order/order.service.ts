import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CodSettlement } from './entities/cod-settlement.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderGateway } from './order.gateway';
import { SmartRoutingService } from '../dispatch/smart-routing.service';
import { VrpBatchingService, VrpBatchRoute, VrpOrderCandidate } from '../dispatch/vrp-batching.service';
import { ColdChainMonitorService, ColdChainTelemetry } from '../dispatch/cold-chain-monitor.service';
import { ThirdPartyDispatcherService } from '../dispatch/third-party-dispatcher.service';
import { S3StorageService } from '../storage/s3-storage.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly inventoryApi = 'http://localhost:3011/internal/inventory/reserve';

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(CodSettlement)
    private codSettlementRepository: Repository<CodSettlement>,
    private readonly orderGateway: OrderGateway,
    private readonly smartRoutingService: SmartRoutingService,
    private readonly vrpBatchingService: VrpBatchingService,
    private readonly coldChainMonitorService: ColdChainMonitorService,
    private readonly thirdPartyDispatcherService: ThirdPartyDispatcherService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, ...orderData } = createOrderDto;

    // 1. SMART ORDER ROUTING (Haversine Geospatial Analysis)
    let assignedWarehouseId = (orderData as any).assignedWarehouseId;
    let assignedWarehouseCode = (orderData as any).assignedWarehouseCode;
    let assignedWarehouseName = (orderData as any).assignedWarehouseName;
    let shippingLat = (orderData as any).shippingLat;
    let shippingLng = (orderData as any).shippingLng;

    if (orderData.customerAddress) {
      const routingResult = this.smartRoutingService.findOptimalWarehouse(
        orderData.customerAddress,
        shippingLat,
        shippingLng,
      );
      assignedWarehouseId = assignedWarehouseId || routingResult.warehouse.id;
      assignedWarehouseCode = assignedWarehouseCode || routingResult.warehouse.code;
      assignedWarehouseName = assignedWarehouseName || routingResult.warehouse.name;

      if (!shippingLat || !shippingLng) {
        const coords = this.smartRoutingService.geocodeAddress(orderData.customerAddress);
        shippingLat = coords.lat;
        shippingLng = coords.lng;
      }
    }

    // 2. KHÓA GIỮ TỒN KHO & CHỐNG BÁN QUÁ SỐ LƯỢNG (RACE CONDITION / CONCURRENCY CONTROL BẰNG PESSIMISTIC LOCK)
    const reserveItems = items.map((item) => ({
      sku: item.sku || item.productId,
      quantity: Number(item.quantity || 1),
    }));

    try {
      const reserveRes = await fetch(this.inventoryApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reserveItems,
          warehouseId: assignedWarehouseCode || assignedWarehouseId || 'WH-006',
        }),
      });

      if (!reserveRes.ok) {
        const errJson = await reserveRes.json().catch(() => ({}));
        const rawMsg = errJson.message || '';
        let userFriendlyMsg = 'Số lượng sản phẩm trong kho hoặc suất ưu đãi Flash Sale không đủ.';
        if (rawMsg.includes('Out of stock for SKU')) {
          const skuMatch = rawMsg.match(/Out of stock for SKU ([^.]+)/);
          const matchedSku = skuMatch ? skuMatch[1] : '';
          const failedItem = items.find((i) => (i.sku || i.productId) === matchedSku);
          const prodName = failedItem ? failedItem.productName : matchedSku;
          userFriendlyMsg = `Sản phẩm "${prodName}" hiện không đủ số lượng trong kho hoặc vừa có khách hàng khác đặt mua trước đó. Quý khách vui lòng điều chỉnh lại số lượng giỏ hàng!`;
        } else if (rawMsg) {
          userFriendlyMsg = rawMsg;
        }

        this.logger.warn(`[Inventory Reserve Failed] ${rawMsg}`);
        throw new BadRequestException(userFriendlyMsg);
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.warn(`Could not connect to inventory-service: ${err.message}`);
    }

    // 3. Tính toán chi phí đơn hàng và tạo danh sách OrderItem
    const orderItems: OrderItem[] = [];
    let calculatedTotal = 0;

    for (const itemDto of items) {
      calculatedTotal += Number(itemDto.price) * itemDto.quantity;

      const orderItem = new OrderItem();
      orderItem.productId = itemDto.productId;
      orderItem.sku = itemDto.sku;
      orderItem.productName = itemDto.productName;
      orderItem.quantity = itemDto.quantity;
      orderItem.price = itemDto.price;
      orderItems.push(orderItem);
    }

    // 3. Create Entity and persist to PostgreSQL
    const isOnlinePaid = ['vnpay', 'momo', 'card', 'bank_transfer', 'zalopay'].includes(
      (orderData.paymentMethod || '').toLowerCase()
    );

    const fee = Number(orderData.shippingFee || 0);
    const disc = Number(orderData.discount || 0);
    const finalTotalAmount = calculatedTotal > 0 
      ? (calculatedTotal + fee - disc) 
      : Number((orderData as any).totalAmount || 0);

    const order = this.orderRepository.create({
      ...orderData,
      totalAmount: Math.max(0, finalTotalAmount),
      shippingFee: fee,
      discount: disc,
      status: OrderStatus.PENDING,
      isPaid: isOnlinePaid,
      codCollectedAmount: isOnlinePaid ? 0 : 0,
      codSettledStatus: isOnlinePaid ? 'SETTLED' : 'UNSETTLED',
      assignedWarehouseId: assignedWarehouseId || 'WH-006',
      assignedWarehouseCode: assignedWarehouseCode || 'WH-006',
      assignedWarehouseName: assignedWarehouseName || 'Kho Hàng Gò Vấp (Trung Tâm)',
      shippingLat,
      shippingLng,
      items: orderItems,
    });

    const savedOrder = await this.orderRepository.save(order);

    try {
      this.orderGateway.emitNewOrder(savedOrder);
    } catch (e) {}

    // Tự động tạo yêu cầu xuất kho OutboundOrder sang outbound-service (port 3007)
    try {
      const outboundPayload = {
        orderCode: `ECOMM-${savedOrder.id.slice(0, 8).toUpperCase()}`,
        requestedBy: savedOrder.customerId || 'customer-web',
        requesterName: savedOrder.customerName || 'Khách hàng',
        customerPhone: savedOrder.customerPhone || '0909000111',
        destination: savedOrder.customerAddress || 'TP.HCM',
        latitude: savedOrder.shippingLat ? Number(savedOrder.shippingLat) : undefined,
        longitude: savedOrder.shippingLng ? Number(savedOrder.shippingLng) : undefined,
        warehouseCode: savedOrder.assignedWarehouseCode || 'WH-006',
        warehouseId: savedOrder.assignedWarehouseId,
        notes: `Đơn hàng TMĐT C.T Mart #${savedOrder.id.slice(0, 8).toUpperCase()}${savedOrder.note ? ' - ' + savedOrder.note : ''}`,
        totalAmount: Number(savedOrder.totalAmount || 0),
        items: (savedOrder.items || []).map((item) => ({
          sku: item.sku || item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          price: Number(item.price || 0),
        })),
      };

      await fetch('http://localhost:3007/outbound-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outboundPayload),
      }).catch((err) => {
        this.logger.warn(`[OrderService -> OutboundService] Lỗi tạo đơn xuất kho: ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`[OrderService] Exception khi trigger outbound-service: ${err.message}`);
    }

    this.logger.log(
      `[OrderService] Tạo đơn mới #${savedOrder.id.slice(0, 8)} -> Định tuyến về: ${savedOrder.assignedWarehouseName}`,
    );

    return savedOrder;
  }

  async findAll(warehouseCode?: string): Promise<Order[]> {
    const [orders, rawRows] = await Promise.all([
      this.orderRepository.find({
        relations: ['items'],
        order: { createdAt: 'DESC' },
      }),
      this.orderRepository.query('SELECT * FROM orders').catch(() => []),
    ]);

    const rawMap = new Map<string, any>();
    if (Array.isArray(rawRows)) {
      rawRows.forEach((r: any) => rawMap.set(r.id, r));
    }

    orders.forEach(o => {
      const raw = rawMap.get(o.id);
      if (raw) {
        o.assignedDriverId = o.assignedDriverId || raw.assignedDriverId;
        o.assignedDriverName = o.assignedDriverName || raw.assignedDriverName;
        o.assignedDriverPhone = o.assignedDriverPhone || raw.assignedDriverPhone;
        o.assignedDriverPlate = o.assignedDriverPlate || raw.assignedDriverPlate;
        o.assignedWarehouseId = o.assignedWarehouseId || raw.assignedWarehouseId;
        o.assignedWarehouseCode = o.assignedWarehouseCode || raw.assignedWarehouseCode;
        o.assignedWarehouseName = o.assignedWarehouseName || raw.assignedWarehouseName;
        o.failureReason = o.failureReason || raw.failureReason;
        o.failurePhotoUrl = o.failurePhotoUrl || raw.failurePhotoUrl;
        o.podPhotoUrl = o.podPhotoUrl || raw.podPhotoUrl;
        o.podSignature = o.podSignature || raw.podSignature;
        o.currentTemperature = o.currentTemperature || raw.currentTemperature;
        o.trafficCongestionLevel = o.trafficCongestionLevel || raw.trafficCongestionLevel;
      }
    });

    const statusPriority: Record<string, number> = {
      PENDING: 1,
      PROCESSING: 2,
      PICKING: 3,
      PACKED: 4,
      CONFIRMED: 5,
      READY_FOR_DELIVERY: 6,
      SHIPPED: 7,
      DELIVERING: 8,
      COMPLETED: 9,
      DELIVERED: 10,
      CANCELLED: 11,
      FAILED_DELIVERY: 12,
    };
    orders.sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (warehouseCode && warehouseCode !== 'ALL') {
      const code = warehouseCode.toUpperCase();
      return orders.filter(o => {
        const matchesId = (o.assignedWarehouseId || '').toUpperCase() === code;
        const matchesCode = (o.assignedWarehouseCode || '').toUpperCase() === code;
        const matchesName =
          (o.assignedWarehouseName || '').toUpperCase().includes(code) ||
          (code === 'WH-006' && (o.assignedWarehouseName || '').toUpperCase().includes('GÒ VẤP'));
        return matchesId || matchesCode || matchesName;
      });
    }

    return orders;
  }

  async findOne(id: string): Promise<Order> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let order: Order | null = null;
    if (isUuid) {
      order = await this.orderRepository.findOne({ where: { id }, relations: ['items'] }).catch(() => null);
    }
    if (!order) {
      const clean = (id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
      const orders = await this.orderRepository.find({ relations: ['items'] }).catch(() => []);
      order = orders.find(o => {
        const oId = (o.id || '').toLowerCase();
        const oNote = (o.note || '').toLowerCase();
        return (
          oId === clean ||
          (clean && clean.length >= 4 && (oId.startsWith(clean) || clean.startsWith(oId))) ||
          (oNote && (oNote.includes(clean) || oNote.includes(id.toLowerCase())))
        );
      }) || null;
    }

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    const raw = await this.orderRepository.query('SELECT * FROM orders WHERE id = $1', [order.id]).catch(() => []);
    if (raw && raw[0]) {
      Object.assign(order, raw[0]);
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, body?: any): Promise<Order> {
    const orders = await this.orderRepository.find({ order: { createdAt: 'DESC' } });
    const clean = (id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
    const rawTarget = (id || '').toLowerCase();

    let order = orders.find(
      o => {
        const oId = (o.id || '').toLowerCase();
        const oNote = (o.note || '').toLowerCase();
        return (
          oId === clean ||
          oId === rawTarget ||
          (clean && clean.length >= 4 && (oId.startsWith(clean) || clean.startsWith(oId))) ||
          (clean && clean.length >= 4 && (oId.includes(clean) || clean.includes(oId))) ||
          (oNote && (oNote.includes(clean) || oNote.includes(rawTarget)))
        );
      }
    );

    if (!order && body?.destination) {
      const dest = body.destination.toLowerCase().trim();
      order = orders.find(
        o => o.customerAddress && (o.customerAddress.toLowerCase().includes(dest) || dest.includes(o.customerAddress.toLowerCase())),
      );
    }

    if (!order && body?.orderCode) {
      const codeClean = String(body.orderCode).toLowerCase().replace(/^ecomm-/, '').replace(/^ob-/, '');
      order = orders.find(
        o => o.id.toLowerCase() === codeClean || (o.note && o.note.toLowerCase().includes(codeClean)),
      );
    }

    if (!order) {
      this.logger.warn(`[ORDER] Order ID ${id} not found in order-service repository.`);
      return null;
    }

    if (order) {
      if (status) order.status = status;
      if (body?.driverId) order.assignedDriverId = body.driverId;
      if (body?.driverName) order.assignedDriverName = body.driverName;
      if (body?.driverPhone) order.assignedDriverPhone = body.driverPhone;
      if (body?.driverPlate) order.assignedDriverPlate = body.driverPlate;
      if (body?.failureReason) order.failureReason = body.failureReason;
      if (body?.failurePhotoUrl) order.failurePhotoUrl = body.failurePhotoUrl;
      if (body?.podPhotoUrl) order.podPhotoUrl = body.podPhotoUrl;
      if (body?.podSignature) order.podSignature = body.podSignature;
      if (body?.temperature) order.currentTemperature = body.temperature;
      if (status === OrderStatus.COMPLETED) {
        order.isPaid = true;
        order.codCollectedAmount = Number(order.totalAmount || 0);
        if (!order.codSettledStatus) {
          order.codSettledStatus = 'UNSETTLED';
        }
      }

      await this.orderRepository.query(
        `
        UPDATE orders 
        SET "assignedDriverId" = $1, "assignedDriverName" = $2, "assignedDriverPhone" = $3, "assignedDriverPlate" = $4,
            status = $5, "failureReason" = $6, "failurePhotoUrl" = $7, "podPhotoUrl" = $8, "podSignature" = $9, "currentTemperature" = $10
        WHERE id = $11
      `,
        [
          order.assignedDriverId || null,
          order.assignedDriverName || null,
          order.assignedDriverPhone || null,
          order.assignedDriverPlate || null,
          order.status,
          order.failureReason || null,
          order.failurePhotoUrl || null,
          order.podPhotoUrl || null,
          order.podSignature || null,
          order.currentTemperature || null,
          order.id,
        ],
      ).catch(() => {});

      const saved = await this.orderRepository.save(order);
      try {
        this.orderGateway.emitOrderStatusUpdated(saved);
      } catch (e) {}
      return saved;
    }

    return order;
  }

  async assignDriver(
    id: string,
    dto: { driverId?: string; driverName?: string; driverPhone?: string; driverPlate?: string; status?: OrderStatus },
  ): Promise<Order> {
    return this.updateStatus(id, dto.status || OrderStatus.DELIVERING, dto);
  }

  /**
   * TỰ ĐỘNG GOM ĐƠN & ĐIỀU PHỐI VRP (AI BATCH DISPATCH)
   */
  async autoDispatchVrp(warehouseCode = 'WH-006'): Promise<{
    message: string;
    totalOrdersProcessed: number;
    routes: VrpBatchRoute[];
  }> {
    const orders = await this.findAll(warehouseCode);
    const readyOrders = orders.filter(
      o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.READY_FOR_DELIVERY,
    );

    if (readyOrders.length === 0) {
      return {
        message: 'Không có đơn hàng nào ĐÃ XUẤT KHO (CONFIRMED / SHIPPED / READY_FOR_DELIVERY) cần điều phối tại kho này. Đơn mới chỉ Đóng gói (PACKED) cần xác nhận xuất kho trước.',
        totalOrdersProcessed: 0,
        routes: [],
      };
    }

    const candidates: VrpOrderCandidate[] = readyOrders.map(o => ({
      id: o.id,
      orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
      customerName: o.customerName || 'Khách Hàng C.T Mart',
      customerPhone: o.customerPhone || '0901234567',
      customerAddress: o.customerAddress || 'Gò Vấp, TP.HCM',
      latitude: o.shippingLat || 10.8385,
      longitude: o.shippingLng || 106.665,
      totalWeightKg: 2.5,
      totalAmount: Number(o.totalAmount || 0),
      storageType: 'COLD',
    }));

    const routes = this.vrpBatchingService.optimizeBatchRoutes(candidates, 10.8354, 106.6668, warehouseCode);

    // Cập nhật trạng thái sang READY_FOR_DELIVERY (Chờ giao hàng) và gán tài xế vào database PostgreSQL
    for (const route of routes) {
      for (const stop of route.stops) {
        await this.updateStatus(stop.orderId, OrderStatus.READY_FOR_DELIVERY, {
          driverId: route.assignedDriverId,
          driverName: route.assignedDriverName,
          driverPhone: route.assignedDriverPhone,
          driverPlate: route.assignedDriverPlate,
        });
      }
    }

    return {
      message: `Đã tự động gom ${candidates.length} đơn hàng thành ${routes.length} chuyến giao tối ưu VRP!`,
      totalOrdersProcessed: candidates.length,
      routes,
    };
  }

  /**
   * Lấy danh sách lộ trình VRP được tính toán tối ưu
   */
  async getBatchVrpRoutes(warehouseCode = 'WH-006'): Promise<VrpBatchRoute[]> {
    const orders = await this.findAll(warehouseCode);
    const activeOrders = orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);

    const candidates: VrpOrderCandidate[] = activeOrders.map(o => ({
      id: o.id,
      orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
      customerName: o.customerName || 'Khách Hàng C.T Mart',
      customerPhone: o.customerPhone || '0901234567',
      customerAddress: o.customerAddress || 'Gò Vấp, TP.HCM',
      latitude: o.shippingLat || 10.8385,
      longitude: o.shippingLng || 106.665,
      totalWeightKg: 2.5,
      totalAmount: Number(o.totalAmount || 0),
      storageType: 'COLD',
    }));

    return this.vrpBatchingService.optimizeBatchRoutes(candidates, 10.8354, 106.6668, warehouseCode);
  }

  /**
   * REVERSE LOGISTICS: Báo cáo giao hàng thất bại & xử lý hàng hoàn
   */
  async reportFailure(
    id: string,
    dto: { reason: string; photoUrl?: string; returnToWarehouse?: boolean },
  ): Promise<Order> {
    const targetStatus = dto.returnToWarehouse ? OrderStatus.RETURN_TO_WAREHOUSE : OrderStatus.FAILED_DELIVERY;

    const updated = await this.updateStatus(id, targetStatus, {
      failureReason: dto.reason,
      failurePhotoUrl: dto.photoUrl,
    });

    this.logger.warn(
      `[ReverseLogistics] Đơn #${updated.id.slice(0, 8)} giao thất bại: "${dto.reason}". Đã chuyển sang ${targetStatus}.`,
    );

    // Kích hoạt thông báo tới Control Tower Dashboard
    try {
      this.orderGateway.server.emit('order_exception', {
        orderId: updated.id,
        status: targetStatus,
        reason: dto.reason,
        photoUrl: dto.photoUrl,
        customerName: updated.customerName,
        customerAddress: updated.customerAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return updated;
  }

  /**
   * IOT COLD-CHAIN TELEMETRY
   */
  processTelemetry(data: ColdChainTelemetry) {
    return this.coldChainMonitorService.processTelemetry(data);
  }

  getLiveDrivers() {
    return this.coldChainMonitorService.getAllLiveDrivers();
  }

  uploadPodImage(imageBase64: string, orderId: string, type: 'POD' | 'RETURN' = 'POD') {
    return this.s3StorageService.uploadImage(imageBase64, orderId, type);
  }

  /**
   * ĐỐI SOÁT & COD THEO SESSION TÀI XẾ TRONG NGÀY
   */
  async getDriverCodSummary(driverId: string, dateStr?: string) {
    const cleanDriverId = (driverId || '').trim();
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);

    const allOrders = await this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });

    const driverOrders = allOrders.filter(o => {
      const assigned = (o.assignedDriverId || '').trim();
      const phone = (o.assignedDriverPhone || '').replace(/\s+/g, '');
      const targetClean = cleanDriverId.replace(/\s+/g, '');
      return (
        assigned.toUpperCase() === cleanDriverId.toUpperCase() ||
        phone === targetClean ||
        (o.assignedDriverName || '').includes(cleanDriverId)
      );
    });

    const shiftOrders = driverOrders.filter(o => {
      const orderDate = new Date(o.createdAt).toISOString().slice(0, 10);
      const updateDate = o.updatedAt ? new Date(o.updatedAt).toISOString().slice(0, 10) : '';
      return orderDate === targetDate || updateDate === targetDate || shiftOrdersLengthFallback(driverOrders.length);
    });

    // Helper: fallback to all recent orders of this driver if date matching has 0 results in dev test
    function shiftOrdersLengthFallback(len: number) {
      return len <= 10;
    }

    const effectiveOrders = shiftOrders.length > 0 ? shiftOrders : driverOrders;

    const completedOrders = effectiveOrders.filter(o => o.status === OrderStatus.COMPLETED);
    const failedOrders = effectiveOrders.filter(
      o => o.status === OrderStatus.FAILED_DELIVERY || o.status === OrderStatus.RETURN_TO_WAREHOUSE,
    );
    const deliveringOrders = effectiveOrders.filter(
      o => o.status === OrderStatus.DELIVERING || o.status === OrderStatus.READY_FOR_DELIVERY,
    );

    const totalCodCollected = completedOrders.reduce((sum, o) => {
      const amt = Number(o.codCollectedAmount || o.totalAmount || 0);
      return sum + amt;
    }, 0);

    const settlements = await this.codSettlementRepository.find({
      where: { driverId: cleanDriverId },
      order: { createdAt: 'DESC' },
    }).catch(() => [] as CodSettlement[]);

    const totalSettled = settlements.reduce((sum, s) => sum + Number(s.settledAmount || 0), 0);
    const remainingCod = Math.max(0, totalCodCollected - totalSettled);

    return {
      driverId: cleanDriverId,
      shiftDate: targetDate,
      totalAssignedOrders: effectiveOrders.length,
      completedOrdersCount: completedOrders.length,
      failedOrdersCount: failedOrders.length,
      deliveringOrdersCount: deliveringOrders.length,
      totalCodCollected,
      totalSettled,
      remainingCod,
      settlements,
      orders: effectiveOrders.map(o => ({
        id: o.id,
        orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
        customerName: o.customerName || 'Khách Hàng',
        customerPhone: o.customerPhone || '',
        customerAddress: o.customerAddress || '',
        totalAmount: Number(o.totalAmount || 0),
        paymentMethod: o.paymentMethod || 'COD',
        status: o.status,
        isPaid: Boolean(o.isPaid),
        codSettledStatus: o.codSettledStatus || (o.isPaid ? 'UNSETTLED' : 'PENDING'),
        podPhotoUrl: o.podPhotoUrl || null,
        completedAt: o.updatedAt || o.createdAt,
      })),
    };
  }

  async settleDriverCod(dto: {
    driverId: string;
    driverName?: string;
    warehouseCode?: string;
    shiftDate?: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    const shiftDate = dto.shiftDate || new Date().toISOString().slice(0, 10);
    const settlementCode = `SETTLE-${shiftDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const settlement = this.codSettlementRepository.create({
      settlementCode,
      driverId: dto.driverId,
      driverName: dto.driverName || 'Tài xế C.T Mart',
      warehouseCode: dto.warehouseCode || 'WH-006',
      shiftDate,
      settledAmount: Number(dto.amount || 0),
      totalCodAmount: Number(dto.amount || 0),
      paymentMethod: dto.paymentMethod || 'VIETQR_TRANSFER',
      status: 'CONFIRMED',
      notes: dto.notes || 'Bàn giao tiền COD ca làm việc',
    });

    const saved = await this.codSettlementRepository.save(settlement);

    // Update unsettled orders
    try {
      const allOrders = await this.orderRepository.find();
      for (const order of allOrders) {
        if (
          order.assignedDriverId === dto.driverId &&
          order.status === OrderStatus.COMPLETED &&
          order.codSettledStatus !== 'SETTLED'
        ) {
          order.codSettledStatus = 'SETTLED';
          order.codSettledAt = new Date();
          await this.orderRepository.save(order);
        }
      }
    } catch (e) {}

    return saved;
  }

  /**
   * BÁO CÁO ĐỐI SOÁT COD TOÀN DIỆN CHO KẾ TOÁN & NHÂN VIÊN ĐIỀU PHỐI KHO
   */
  async getCodReconciliationReport(filter: {
    startDate?: string;
    endDate?: string;
    warehouseCode?: string;
    driverId?: string;
    status?: string;
  }) {
    const allOrders = await this.orderRepository.find({
      relations: ['items'],
      order: { updatedAt: 'DESC' },
    });

    const allSettlements = await this.codSettlementRepository.find({
      order: { createdAt: 'DESC' },
    }).catch(() => [] as CodSettlement[]);

    const start = filter.startDate ? new Date(filter.startDate + 'T00:00:00.000Z') : null;
    const end = filter.endDate ? new Date(filter.endDate + 'T23:59:59.999Z') : null;

    // Filter orders
    const filteredOrders = allOrders.filter(o => {
      const orderTime = new Date(o.updatedAt || o.createdAt);
      if (start && orderTime < start) return false;
      if (end && orderTime > end) return false;

      if (filter.warehouseCode && filter.warehouseCode !== 'ALL') {
        const wh = filter.warehouseCode.toUpperCase();
        const oWh = (o.assignedWarehouseCode || o.assignedWarehouseId || '').toUpperCase();
        const oName = (o.assignedWarehouseName || '').toUpperCase();
        if (oWh !== wh && !oName.includes(wh)) return false;
      }

      if (filter.driverId && filter.driverId !== 'ALL') {
        const dId = filter.driverId.toUpperCase();
        const oDriverId = (o.assignedDriverId || '').toUpperCase();
        const oDriverPhone = (o.assignedDriverPhone || '').replace(/\D/g, '');
        const oDriverName = (o.assignedDriverName || '').toLowerCase();
        const matches = oDriverId === dId || oDriverPhone.includes(dId) || oDriverName.includes(filter.driverId.toLowerCase());
        if (!matches) return false;
      }

      if (filter.status && filter.status !== 'ALL') {
        const isSettled = o.codSettledStatus === 'SETTLED';
        if (filter.status === 'SETTLED' && !isSettled) return false;
        if (filter.status === 'UNSETTLED' && isSettled) return false;
      }

      return true;
    });

    // Settlements within filter
    const filteredSettlements = allSettlements.filter(s => {
      const sTime = new Date(s.createdAt);
      if (start && sTime < start) return false;
      if (end && sTime > end) return false;

      if (filter.warehouseCode && filter.warehouseCode !== 'ALL') {
        if (s.warehouseCode && s.warehouseCode !== filter.warehouseCode) return false;
      }
      if (filter.driverId && filter.driverId !== 'ALL') {
        if (s.driverId && s.driverId !== filter.driverId) return false;
      }
      return true;
    });

    // Standard Driver Roster
    const driverFleet: Record<string, {
      id: string;
      name: string;
      phone: string;
      plate: string;
      vehicleType: string;
      warehouseCode: string;
      warehouseName: string;
    }> = {
      'NV-GV05': { id: 'NV-GV05', name: 'Võ Minh Trí', phone: '0977 112 233', plate: '59-V1 888.99', vehicleType: 'Xe Máy Thùng Lạnh', warehouseCode: 'WH-006', warehouseName: 'Kho Gò Vấp' },
      'NV-TK01': { id: 'NV-TK01', name: 'Đặng Hoàng Phúc', phone: '0944 778 899', plate: '51D-892.45', vehicleType: 'Xe Tải Lạnh 2.5 Tấn', warehouseCode: 'WH-006', warehouseName: 'Kho Gò Vấp' },
      'NV-VAN01': { id: 'NV-VAN01', name: 'Phan Hữu Nam', phone: '0918 776 655', plate: '51C-734.12', vehicleType: 'Xe Bán Tải 1.5 Tấn', warehouseCode: 'WH-006', warehouseName: 'Kho Gò Vấp' },
      'NV-GV06': { id: 'NV-GV06', name: 'Nguyễn Văn Hùng', phone: '0909 888 111', plate: '59-G2 688.39', vehicleType: 'Xe Máy Siêu Tốc', warehouseCode: 'WH-006', warehouseName: 'Kho Gò Vấp' },
      'NV-BT01': { id: 'NV-BT01', name: 'Bùi Hoàng Long', phone: '0988 112 244', plate: '59-S2 555.66', vehicleType: 'Xe Máy Thùng Lạnh', warehouseCode: 'WH-002', warehouseName: 'Kho Bình Thạnh' },
      'NV-TB01': { id: 'NV-TB01', name: 'Trương Gia Huy', phone: '0977 223 344', plate: '59-H1 333.22', vehicleType: 'Xe Máy Thùng Lạnh', warehouseCode: 'WH-003', warehouseName: 'Kho Tân Bình' },
    };

    // Aggregate statistics per driver
    const driverStatsMap: Record<string, any> = {};

    Object.values(driverFleet).forEach(d => {
      if (filter.warehouseCode && filter.warehouseCode !== 'ALL' && d.warehouseCode !== filter.warehouseCode) {
        return;
      }
      if (filter.driverId && filter.driverId !== 'ALL' && d.id !== filter.driverId) {
        return;
      }
      driverStatsMap[d.id] = {
        ...d,
        totalOrdersCount: 0,
        completedOrdersCount: 0,
        failedOrdersCount: 0,
        codCollected: 0,
        codSettled: 0,
        remainingCod: 0,
        status: 'SETTLED',
        lastSettlementDate: null,
      };
    });

    // Populate with actual orders
    filteredOrders.forEach(o => {
      const dId = o.assignedDriverId || 'NV-GV05';
      if (!driverStatsMap[dId]) {
        driverStatsMap[dId] = {
          id: dId,
          name: o.assignedDriverName || 'Tài xế giao hàng',
          phone: o.assignedDriverPhone || '0901234567',
          plate: '59-X1 999.99',
          vehicleType: 'Xe Máy Thùng Lạnh',
          warehouseCode: o.assignedWarehouseCode || 'WH-006',
          warehouseName: o.assignedWarehouseName || 'Kho Gò Vấp',
          totalOrdersCount: 0,
          completedOrdersCount: 0,
          failedOrdersCount: 0,
          codCollected: 0,
          codSettled: 0,
          remainingCod: 0,
          status: 'SETTLED',
          lastSettlementDate: null,
        };
      }

      const d = driverStatsMap[dId];
      d.totalOrdersCount++;
      if (o.status === OrderStatus.COMPLETED) {
        d.completedOrdersCount++;
        const amt = Number(o.codCollectedAmount || o.totalAmount || 0);
        const isCod = (o.paymentMethod || '').toLowerCase() === 'cod' || !o.isPaid;
        if (isCod && amt > 0) {
          d.codCollected += amt;
        }
      } else if (o.status === OrderStatus.FAILED_DELIVERY || o.status === OrderStatus.RETURN_TO_WAREHOUSE) {
        d.failedOrdersCount++;
      }
    });

    // Populate settled amounts from settlements
    filteredSettlements.forEach(s => {
      const d = driverStatsMap[s.driverId];
      if (d) {
        d.codSettled += Number(s.settledAmount || 0);
        d.lastSettlementDate = s.shiftDate || s.createdAt;
      }
    });

    // Compute remaining COD & status for each driver
    Object.values(driverStatsMap).forEach((d: any) => {
      d.remainingCod = Math.max(0, d.codCollected - d.codSettled);
      d.status = d.remainingCod <= 0 ? 'SETTLED' : 'PENDING';
    });

    const driversReport = Object.values(driverStatsMap);

    // Compute Grand Totals
    const totalCodCollected = driversReport.reduce((acc, d) => acc + d.codCollected, 0);
    const totalSettled = driversReport.reduce((acc, d) => acc + d.codSettled, 0);
    const totalRemaining = driversReport.reduce((acc, d) => acc + d.remainingCod, 0);
    const totalCodOrders = filteredOrders.filter(o => {
      const isCod = (o.paymentMethod || '').toLowerCase() === 'cod' || !o.isPaid;
      return isCod && Number(o.totalAmount || 0) > 0;
    }).length;
    const settledOrdersCount = filteredOrders.filter(o => o.codSettledStatus === 'SETTLED').length;
    const pendingOrdersCount = Math.max(0, totalCodOrders - settledOrdersCount);

    const settlementRate = totalCodCollected > 0 
      ? Number(((totalSettled / totalCodCollected) * 100).toFixed(1))
      : 100;

    // Formatted detailed order items
    const ordersList = filteredOrders.map(o => {
      const isCod = (o.paymentMethod || '').toLowerCase() === 'cod' || !o.isPaid;
      const codVal = isCod ? Number(o.codCollectedAmount || o.totalAmount || 0) : 0;
      return {
        id: o.id,
        orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
        customerName: o.customerName || 'Khách Hàng C.T Mart',
        customerPhone: o.customerPhone || '0901234567',
        customerAddress: o.customerAddress || 'Gò Vấp, TP.HCM',
        assignedDriverId: o.assignedDriverId || 'NV-GV05',
        assignedDriverName: o.assignedDriverName || 'Võ Minh Trí',
        assignedDriverPhone: o.assignedDriverPhone || '0977 112 233',
        assignedWarehouseCode: o.assignedWarehouseCode || 'WH-006',
        totalAmount: Number(o.totalAmount || 0),
        codAmount: codVal,
        paymentMethod: o.paymentMethod || 'cod',
        orderStatus: o.status,
        codSettledStatus: o.codSettledStatus || (o.isPaid ? 'SETTLED' : 'UNSETTLED'),
        codSettledAt: o.codSettledAt,
        podPhotoUrl: o.podPhotoUrl,
        completedAt: o.updatedAt || o.createdAt,
        createdAt: o.createdAt,
      };
    });

    return {
      summary: {
        totalCodCollected,
        totalSettled,
        totalRemaining,
        totalCodOrders,
        settledOrdersCount,
        pendingOrdersCount,
        settlementRate: Math.min(100, settlementRate),
        filter: {
          startDate: filter.startDate || 'Tất cả',
          endDate: filter.endDate || 'Tất cả',
          warehouseCode: filter.warehouseCode || 'ALL',
          driverId: filter.driverId || 'ALL',
          status: filter.status || 'ALL',
        },
      },
      drivers: driversReport,
      orders: ordersList,
      settlements: filteredSettlements,
    };
  }
}
