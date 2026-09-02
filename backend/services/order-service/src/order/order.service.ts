import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
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

    // 2. Inventory Reserve (FEFO)
    const orderItems: OrderItem[] = [];
    let calculatedTotal = 0;

    for (const itemDto of items) {
      calculatedTotal += Number(itemDto.price) * itemDto.quantity;

      try {
        await fetch(this.inventoryApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: itemDto.productId,
            quantity: itemDto.quantity,
            warehouseId: assignedWarehouseId || 'WH-006',
          }),
        }).catch(() => null);
      } catch (err) {
        this.logger.warn(`Could not connect to inventory-service: ${err.message}`);
      }

      const orderItem = new OrderItem();
      orderItem.productId = itemDto.productId;
      orderItem.sku = itemDto.sku;
      orderItem.productName = itemDto.productName;
      orderItem.quantity = itemDto.quantity;
      orderItem.price = itemDto.price;
      orderItems.push(orderItem);
    }

    // 3. Create Entity and persist to PostgreSQL
    const order = this.orderRepository.create({
      ...orderData,
      totalAmount: calculatedTotal > 0 ? calculatedTotal : ((orderData as any).totalAmount || 0),
      status: OrderStatus.PENDING,
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
    const order = await this.orderRepository.findOne({ where: { id }, relations: ['items'] });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    const raw = await this.orderRepository.query('SELECT * FROM orders WHERE id = $1', [id]).catch(() => []);
    if (raw && raw[0]) {
      Object.assign(order, raw[0]);
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, body?: any): Promise<Order> {
    const orders = await this.orderRepository.find({ order: { createdAt: 'DESC' } });
    const clean = (id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

    let order = orders.find(
      o => o.id.toLowerCase() === clean || (clean && clean.length >= 4 && o.id.toLowerCase().startsWith(clean)),
    );

    if (!order && body?.destination) {
      const dest = body.destination.toLowerCase().trim();
      order = orders.find(
        o => o.customerAddress && (o.customerAddress.toLowerCase().includes(dest) || dest.includes(o.customerAddress.toLowerCase())),
      );
    }

    if (!order) {
      order = orders.find(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) || orders[0];
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
        this.orderGateway.emitNewOrder(saved);
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
      o =>
        o.status !== OrderStatus.COMPLETED &&
        o.status !== OrderStatus.FAILED_DELIVERY &&
        o.status !== OrderStatus.RETURN_TO_WAREHOUSE &&
        o.status !== OrderStatus.CANCELLED,
    );

    if (readyOrders.length === 0) {
      return {
        message: 'Không có đơn hàng nào đang chờ điều phối giao hàng tại kho này.',
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
}
