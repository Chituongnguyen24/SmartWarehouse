import { Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
import * as amqp from 'amqp-connection-manager';

export interface CreateOutboundOrderDto {
  orderCode?: string;
  requestedBy: string;
  requesterName?: string;
  destination?: string;
  warehouseId?: string;
  warehouseCode?: string;
  latitude?: number;
  longitude?: number;
  items: Array<{
    sku: string;
    productName: string;
    requestedQuantity: number;
  }>;
  notes?: string;
}

@Injectable()
export class OutboundOrderService implements OnModuleInit, OnModuleDestroy {
  private rmqConnection: any;
  private rmqChannel: any;

  constructor(
    @InjectRepository(OutboundOrder)
    private orderRepository: Repository<OutboundOrder>,
    @InjectRepository(OutboundOrderItem)
    private itemRepository: Repository<OutboundOrderItem>,
  ) {}

  onModuleInit() {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.rmqConnection = amqp.connect([rabbitUrl]);
    this.rmqChannel = this.rmqConnection.createChannel({
      json: true,
      setup: (channel) => {
        return channel.assertExchange('outbound.events', 'topic', { durable: true });
      },
    });
  }

  onModuleDestroy() {
    if (this.rmqConnection) {
      this.rmqConnection.close();
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const response = await fetch('http://localhost:3012/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@sfwms.vn',
          password: 'password123',
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Authentication failed with user-service:', err.message);
      throw err;
    }
  }

  private async generateOrderCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.orderRepository.count();
    return `OB-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  // Bước 1: Bộ phận bán hàng yêu cầu xuất sản phẩm
  async create(dto: CreateOutboundOrderDto): Promise<OutboundOrder> {
    const orderCode = dto.orderCode || await this.generateOrderCode();

    // Check if an outbound order with this orderCode already exists (Idempotency)
    const existing = await this.orderRepository.findOne({ where: { orderCode } });
    if (existing) {
      return existing;
    }

    // 1. Phân tích địa chỉ khách hàng để lấy tọa độ mock (geocoding) nếu chưa truyền
    let lat = dto.latitude;
    let lng = dto.longitude;
    
    if (!lat || !lng) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dto.destination || 'Ho Chi Minh')}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SmartWarehouse/1.0 (Thesis Project)' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        }
      } catch (e) {
        console.error('[OUTBOUND] Nominatim Geocoding API failed', e.message);
      }
      if (!lat || !lng) {
        lat = 10.7574; lng = 106.6635; // Default if failed
      }
    }

    // 2. Tự động tính toán kho hàng gần nhất và ĐỦ hàng
    let finalWarehouseId = dto.warehouseId;
    let finalWarehouseCode = dto.warehouseCode;

    if (!finalWarehouseCode) {
      try {
        const calcResult = await this.calculateNearestWarehouse({
          latitude: lat,
          longitude: lng,
          items: dto.items.map(i => ({ sku: i.sku, requestedQuantity: i.requestedQuantity })),
        });
        
        const recommended = calcResult.warehouses.find((w: any) => w.isRecommended);
        if (recommended) {
          finalWarehouseId = recommended.warehouse.id;
          finalWarehouseCode = recommended.warehouse.code;
          console.log(`[OUTBOUND AUTO-ROUTING] Order ${orderCode} routed to ${finalWarehouseCode} (${recommended.distanceKm} km away, fulfillment: ${recommended.fulfillmentRate}%)`);
        }
      } catch (err) {
        console.error('[OUTBOUND AUTO-ROUTING] Error calculating nearest warehouse, fallback to Q12:', err.message);
        finalWarehouseCode = 'Q12';
        finalWarehouseId = '11111111-1111-1111-1111-111111111111';
      }
    }

    const order = this.orderRepository.create({
      orderCode,
      status: 'PENDING',
      requestedBy: dto.requestedBy,
      requesterName: dto.requesterName,
      destination: dto.destination,
      warehouseId: finalWarehouseId,
      warehouseCode: finalWarehouseCode,
      latitude: lat,
      longitude: lng,
      totalItems: dto.items.length,
      totalQuantity: dto.items.reduce((sum, i) => sum + i.requestedQuantity, 0),
      notes: dto.notes,
    });

    const savedOrder = await this.orderRepository.save(order);

    for (const item of dto.items) {
      await this.itemRepository.save(this.itemRepository.create({
        outboundOrderId: savedOrder.id,
        sku: item.sku,
        productName: item.productName,
        requestedQuantity: item.requestedQuantity,
        status: 'PENDING',
      }));
    }

    // Auto deduct inventory stock in inventory-service for this warehouse
    await this.deductInventoryStock(savedOrder.warehouseCode, dto.items.map(i => ({ sku: i.sku, quantity: i.requestedQuantity })));

    return this.findOne(savedOrder.id);
  }

  async splitCreate(dto: CreateOutboundOrderDto): Promise<OutboundOrder[]> {
    const lat = dto.latitude || 10.8231;
    const lng = dto.longitude || 106.6297;
    
    // Evaluate all warehouses
    const calcResult = await this.calculateNearestWarehouse({
      latitude: lat,
      longitude: lng,
      items: dto.items.map(i => ({ sku: i.sku, requestedQuantity: i.requestedQuantity })),
    });

    const createdOrders: OutboundOrder[] = [];
    
    // Remaining items to be fulfilled
    let remainingItems = dto.items.map(i => ({ ...i }));
    
    // Iterate through ranked warehouses
    for (const cand of calcResult.warehouses) {
      if (remainingItems.length === 0) break;
      
      const fulfillableItems = [];
      const newRemainingItems = [];
      
      for (const reqItem of remainingItems) {
        const candItemInfo = cand.items.find((ci: any) => ci.sku === reqItem.sku);
        const availableQty = candItemInfo ? candItemInfo.availableQty : 0;
        
        if (availableQty > 0) {
          const qtyToTake = Math.min(availableQty, reqItem.requestedQuantity);
          fulfillableItems.push({ ...reqItem, requestedQuantity: qtyToTake });
          
          if (reqItem.requestedQuantity > qtyToTake) {
            newRemainingItems.push({ ...reqItem, requestedQuantity: reqItem.requestedQuantity - qtyToTake });
          }
        } else {
          newRemainingItems.push(reqItem);
        }
      }
      
      // If this warehouse can fulfill anything, create an order for it
      if (fulfillableItems.length > 0) {
        const orderCode = `${dto.orderCode || 'OUT'}-${cand.warehouse.code}`;
        const order = this.orderRepository.create({
          orderCode,
          status: 'PENDING',
          requestedBy: dto.requestedBy,
          requesterName: dto.requesterName,
          destination: dto.destination,
          warehouseId: cand.warehouse.id,
          warehouseCode: cand.warehouse.code,
          latitude: lat,
          longitude: lng,
          totalItems: fulfillableItems.length,
          totalQuantity: fulfillableItems.reduce((sum, i) => sum + i.requestedQuantity, 0),
          notes: dto.notes,
        });

        const savedOrder = await this.orderRepository.save(order);

        for (const item of fulfillableItems) {
          await this.itemRepository.save(this.itemRepository.create({
            outboundOrderId: savedOrder.id,
            sku: item.sku,
            productName: item.productName,
            requestedQuantity: item.requestedQuantity,
            status: 'PENDING',
          }));
        }
        
        // Auto deduct/reserve inventory stock from inventory-service for this warehouse
        this.deductInventoryStock(savedOrder.warehouseCode || cand.warehouse.code, fulfillableItems.map(i => ({ sku: i.sku, quantity: i.requestedQuantity })));

        createdOrders.push(await this.findOne(savedOrder.id));
      }
      
      remainingItems = newRemainingItems;
    }
    
    // If there are still remaining items that NO warehouse can fulfill
    if (remainingItems.length > 0) {
        console.warn(`[OUTBOUND AUTO-ROUTING] Could not fulfill some items for order ${dto.orderCode}. Assigning to default WH-001.`);
        const order = this.orderRepository.create({
          orderCode: `${dto.orderCode || 'OUT'}-BACKORDER`,
          status: 'PENDING',
          requestedBy: dto.requestedBy,
          requesterName: dto.requesterName,
          destination: dto.destination,
          warehouseId: '11111111-1111-1111-1111-111111111111',
          warehouseCode: 'WH-001',
          latitude: lat,
          longitude: lng,
          totalItems: remainingItems.length,
          totalQuantity: remainingItems.reduce((sum, i) => sum + i.requestedQuantity, 0),
          notes: 'BACKORDER - KHÔNG ĐỦ TỒN KHO TRÊN TOÀN HỆ THỐNG',
        });
        const savedOrder = await this.orderRepository.save(order);
        for (const item of remainingItems) {
          await this.itemRepository.save(this.itemRepository.create({
            outboundOrderId: savedOrder.id,
            sku: item.sku,
            productName: item.productName,
            requestedQuantity: item.requestedQuantity,
            status: 'PENDING',
          }));
        }
        createdOrders.push(await this.findOne(savedOrder.id));
    }
    
    return createdOrders;
  }

  // Thuật toán tính toán và đề xuất kho hàng gần nhất đáp ứng đủ tồn kho
  async calculateNearestWarehouse(dto: {
    latitude: number;
    longitude: number;
    items: Array<{ sku: string; requestedQuantity: number }>;
  }): Promise<any> {
    // 1. Lấy danh sách các kho hàng từ warehouse-service
    let warehouses = [];
    try {
      const res = await fetch('http://localhost:3005/warehouses');
      if (res.ok) {
        warehouses = await res.json();
      } else {
        throw new Error(`Failed to fetch warehouses: ${res.statusText}`);
      }
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Error fetching warehouses:', err.message);
      // Fallback mặc định các kho nếu warehouse-service không phản hồi
      warehouses = [
        { id: '11111111-1111-1111-1111-111111111111', code: 'Q12', name: 'Kho Hàng Quận 12 (HCM North)', latitude: 10.8671, longitude: 106.6713, address: '12 Tô Ký, Quận 12' },
        { id: '22222222-2222-2222-2222-222222222222', code: 'TD', name: 'Kho Hàng Thủ Đức (HCM East)', latitude: 10.8494, longitude: 106.7725, address: '1 Võ Văn Ngân, Thủ Đức' },
        { id: '33333333-3333-3333-3333-333333333333', code: 'BC', name: 'Kho Hàng Bình Chánh (HCM West)', latitude: 10.6868, longitude: 106.5932, address: 'Tỉnh lộ 10, Bình Chánh' },
        { id: '44444444-4444-4444-4444-444444444444', code: 'Q7', name: 'Kho Hàng Quận 7 (HCM South)', latitude: 10.7324, longitude: 106.7214, address: '1025 Nguyễn Văn Linh, Quận 7' },
        { id: '55555555-5555-5555-5555-555555555555', code: 'BThanh', name: 'Kho Hàng Bình Thạnh (HCM Center-East)', latitude: 10.8016, longitude: 106.7135, address: '150 Điện Biên Phủ, Bình Thạnh' },
        { id: '66666666-6666-6666-6666-666666666666', code: 'GV', name: 'Kho Hàng Gò Vấp (HCM Northwest)', latitude: 10.8252, longitude: 106.6631, address: '350 Quang Trung, Gò Vấp' },
        { id: '77777777-7777-7777-7777-777777777777', code: 'Q1', name: 'Kho Hàng Quận 1 (HCM Center)', latitude: 10.7769, longitude: 106.7009, address: '85 Lê Lợi, Quận 1' },
        { id: '88888888-8888-8888-8888-888888888888', code: 'Q5', name: 'Kho Hàng Quận 5 (HCM South-West)', latitude: 10.7574, longitude: 106.6635, address: '105 An Dương Vương, Quận 5' },
        { id: '99999999-9999-9999-9999-999999999999', code: 'TB', name: 'Kho Hàng Tân Bình (HCM West-Center)', latitude: 10.7938, longitude: 106.6509, address: '20 Trường Chinh, Tân Bình' },
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', code: 'BTan', name: 'Kho Hàng Bình Tân (HCM Deep-West)', latitude: 10.7492, longitude: 106.6025, address: '88 Kinh Dương Vương, Bình Tân' },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', code: 'HM', name: 'Kho Hàng Hóc Môn (HCM Far-North)', latitude: 10.8833, longitude: 106.5931, address: '14 Nguyễn Ảnh Thủ, Hóc Môn' },
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', code: 'NB', name: 'Kho Hàng Nhà Bè (HCM Far-South)', latitude: 10.6953, longitude: 106.7231, address: '500 Huỳnh Tấn Phát, Nhà Bè' },
        { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', code: 'PN', name: 'Kho Hàng Phú Nhuận (HCM Mid-Center)', latitude: 10.7992, longitude: 106.6803, address: '18 Phan Xích Long, Phú Nhuận' },
        { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', code: 'Q8', name: 'Kho Hàng Quận 8 (HCM South-West-Line)', latitude: 10.7239, longitude: 106.6342, address: '1020 Phạm Thế Hiển, Quận 8' },
        { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', code: 'CC', name: 'Kho Hàng Củ Chi (HCM Northwest-Zone)', latitude: 10.9625, longitude: 106.4981, address: '450 Quốc lộ 22, Củ Chi' },
        { id: '00000000-0000-0000-0000-000000000000', code: 'Q10', name: 'Kho Hàng Quận 10 (HCM Center-West)', latitude: 10.7719, longitude: 106.6669, address: '123 Đường 3 Tháng 2, Quận 10' },
      ];
    }

    // 2. Lấy thông tin tồn kho của từng SKU từ inventory-service
    let warehouseStock = {};
    try {
      const skus = dto.items.map(item => item.sku).join(',');
      const token = await this.getAuthToken();
      const res = await fetch(`http://localhost:3011/inventory/warehouse-stock?skus=${skus}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        warehouseStock = await res.json();
      }
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Error fetching warehouse stock:', err.message);
    }

    // API OSRM tính khoảng cách thực tế (km)
    const getRoutingDistance = async (lat1: number, lon1: number, lat2: number, lon2: number) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            return data.routes[0].distance / 1000;
          }
        }
      } catch (e) {
        console.error('[OUTBOUND] OSRM Routing API failed, falling back to Haversine', e.message);
      }
      
      const R = 6371; 
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
          Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Đánh giá từng kho hàng
    const candidates = await Promise.all(warehouses.map(async (wh) => {
      const distance = await getRoutingDistance(dto.latitude, dto.longitude, wh.latitude, wh.longitude);
      
      let fulfilledItems = 0;
      const itemDetails = dto.items.map(item => {
        const stockInWh = (warehouseStock[wh.code] && warehouseStock[wh.code][item.sku]) || 0;
        const fulfilled = Math.min(stockInWh, item.requestedQuantity);
        if (fulfilled >= item.requestedQuantity) {
          fulfilledItems++;
        }
        return {
          sku: item.sku,
          requestedQty: item.requestedQuantity,
          availableQty: stockInWh,
          fulfillmentPercent: item.requestedQuantity > 0 ? Math.round((fulfilled / item.requestedQuantity) * 100) : 100,
        };
      });

      const fulfillmentRate = dto.items.length > 0 ? Math.round((fulfilledItems / dto.items.length) * 100) : 100;

      return {
        warehouse: {
          id: wh.id,
          code: wh.code,
          name: wh.name,
          address: wh.address,
          latitude: wh.latitude,
          longitude: wh.longitude,
        },
        distanceKm: Math.round(distance * 100) / 100,
        fulfillmentRate,
        items: itemDetails,
      };
    }));

    // Sắp xếp các kho hàng ứng viên:
    // 1. Tỷ lệ đáp ứng tồn kho giảm dần (ưu tiên kho đủ hàng trước)
    // 2. Khoảng cách địa lý tăng dần (ưu tiên kho gần hơn)
    candidates.sort((a, b) => {
      if (b.fulfillmentRate !== a.fulfillmentRate) {
        return b.fulfillmentRate - a.fulfillmentRate;
      }
      return a.distanceKm - b.distanceKm;
    });

    // Kho đầu tiên trong danh sách là kho được đề xuất
    const rankedCandidates = candidates.map((cand, index) => ({
      ...cand,
      isRecommended: index === 0,
    }));

    return {
      destination: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      warehouses: rankedCandidates,
    };
  }

  async findAll(status?: string, warehouseCode?: string): Promise<OutboundOrder[]> {
    const where: any = {};
    if (status) where.status = status;
    if (warehouseCode) where.warehouseCode = warehouseCode;
    
    return this.orderRepository.find({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OutboundOrder> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`OutboundOrder ${id} not found`);
    return order;
  }

  // Bước 2-3: Nhân viên kho kiểm tra và hệ thống gợi ý FEFO
  // Gọi Core Service / ML Service để lấy FEFO suggestions
  async applyFefoSuggestions(orderId: string, suggestions: Array<{
    itemId: string;
    lotId: string;
    lotCode: string;
    slotId?: string;
    expiryDate: string;
    riskScore: number;
    priorityScore: number;
    quantity: number;
  }>): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);

    for (const suggestion of suggestions) {
      const item = await this.itemRepository.findOneBy({ id: suggestion.itemId });
      if (!item) continue;

      item.lotId = suggestion.lotId;
      item.lotCode = suggestion.lotCode;
      item.slotId = suggestion.slotId;
      item.expiryDate = new Date(suggestion.expiryDate);
      item.riskScore = suggestion.riskScore;
      item.priorityScore = suggestion.priorityScore;
      item.pickedQuantity = suggestion.quantity;
      item.status = 'SUGGESTED';

      await this.itemRepository.save(item);
    }

    order.status = 'PICKING';
    return this.orderRepository.save(order);
  }

  // Quản lý kho tiếp nhận & duyệt đơn hàng giao việc cho nhân viên kho lấy hàng
  async approve(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    order.status = 'PICKING';

    for (const item of order.items) {
      if (item.status === 'PENDING' || !item.status) {
        item.status = 'SUGGESTED';
        await this.itemRepository.save(item);
      }
    }

    const saved = await this.orderRepository.save(order);
    await this.syncStatusToOrderService(order, 'PROCESSING');
    return saved;
  }

  // Bước 4: Nhân viên xác nhận đã lấy hàng -> Chuyển sang Đóng Gói (PACKED)
  async confirmPicking(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (order.status === 'PACKED' || order.status === 'CONFIRMED') {
      return order;
    }

    // Mark all items as picked
    for (const item of order.items) {
      item.status = 'PICKED';
      if (!item.pickedQuantity || item.pickedQuantity === 0) {
        item.pickedQuantity = item.requestedQuantity || 1;
      }
      await this.itemRepository.save(item);
    }

    order.status = 'PACKED';
    const savedOrder = await this.orderRepository.save(order);

    // Call Webhook to sync status with order-service (CustomerOrder) & broadcast WebSocket
    await this.syncStatusToOrderService(savedOrder, 'PACKED');

    return savedOrder;
  }

  // Bước 5: Xác nhận xuất kho
  async confirm(orderId: string, confirmedBy: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (order.status !== 'PACKED') {
      throw new BadRequestException(`Order ${order.orderCode} is not in PACKED status`);
    }

    order.status = 'CONFIRMED';
    order.confirmedBy = confirmedBy;
    order.confirmedAt = new Date();

    const confirmed = await this.orderRepository.save(order);

    console.log(`[OUTBOUND] Order ${order.orderCode} CONFIRMED. Deducting inventory stock...`);

    // Call Inventory Service to deduct stock
    try {
      const token = await this.getAuthToken();
      const unassignedItems: { sku: string; quantity: number }[] = [];
      for (const item of order.items) {
        if (item.lotId && item.pickedQuantity > 0) {
          const deductPayload = {
            lotId: item.lotId,
            quantity: item.pickedQuantity,
            reason: `EXPORT_OUTBOUND_ORDER_${order.orderCode}`,
          };

          const res = await fetch('http://localhost:3011/inventory/lots/export', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(deductPayload),
          });

          if (!res.ok) {
            console.error(`[OUTBOUND SERVICE] Failed to deduct stock for lot ${item.lotCode} (${item.lotId}): ${res.statusText}`);
          } else {
            console.log(`[OUTBOUND SERVICE] Successfully deducted ${item.pickedQuantity} from lot ${item.lotCode}`);
          }
        } else if (item.requestedQuantity > 0) {
          unassignedItems.push({ sku: item.sku, quantity: item.requestedQuantity });
        }
      }

      if (unassignedItems.length > 0) {
        await this.deductInventoryStock(order.warehouseCode || 'WH-006', unassignedItems);
      }
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Error calling inventory stock deduction:', err.message);
    }

    // Publish outbound.confirmed event to RabbitMQ
    try {
      const eventPayload = {
        orderId: confirmed.id,
        orderCode: confirmed.orderCode,
        confirmedBy: confirmed.confirmedBy,
        confirmedAt: confirmed.confirmedAt.toISOString(),
        destination: confirmed.destination,
        items: confirmed.items.map(i => ({
          sku: i.sku,
          lotId: i.lotId,
          lotCode: i.lotCode,
          quantity: i.pickedQuantity,
          slotId: i.slotId,
        })),
      };
      await this.rmqChannel.publish('outbound.events', 'outbound.confirmed', eventPayload);
      console.log(`[OUTBOUND] Event outbound.confirmed published to RabbitMQ`);
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Failed to publish RabbitMQ event:', err.message);
    }

    // Call Webhook to sync status with order-service (CustomerOrder) -> READY_FOR_DELIVERY (Chờ nhận chuyến)
    await this.syncStatusToOrderService(order, 'READY_FOR_DELIVERY');

    return confirmed;
  }

  private async syncStatusToOrderService(order: any, orderStatus: string) {
    if (!order) return;
    const orderCode = typeof order === 'string' ? order : order.orderCode;
    const destination = typeof order === 'object' ? order.destination : undefined;
    const requesterName = typeof order === 'object' ? order.requesterName : undefined;

    try {
      let targetId = orderCode || '';
      if (typeof order === 'object' && order.notes && order.notes.includes('[ORDER_ID:')) {
        const match = order.notes.match(/\[ORDER_ID:([^\]]+)\]/);
        if (match) targetId = match[1];
      }
      const baseOrderId = targetId.split('-WH')[0].split('-BACKORDER')[0];
      await fetch(`http://localhost:3004/orders/sync-status/${baseOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: orderStatus,
          destination,
          customerName: requesterName
        }),
      });
      console.log(`[OUTBOUND] Synced status ${orderStatus} to order-service for ${baseOrderId} (dest: ${destination})`);
    } catch (e) {
      console.error('[OUTBOUND] Failed to sync status with order-service', e.message);
    }
  }

  private async deductInventoryStock(warehouseCode: string, items: { sku: string; quantity: number }[]) {
    try {
      const res = await fetch('http://localhost:3011/internal/inventory/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ sku: i.sku, quantity: i.quantity })),
          warehouseId: warehouseCode,
        }),
      });
      if (res.ok) {
        console.log(`[OUTBOUND SERVICE] Successfully deducted inventory stock for warehouse ${warehouseCode}:`, items);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn(`[OUTBOUND SERVICE] Warning deducting stock from inventory-service:`, err);
      }
    } catch (e) {
      console.error('[OUTBOUND SERVICE] Error calling inventory-service reserve:', e.message);
    }
  }

  async ship(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    order.status = 'SHIPPED';
    const saved = await this.orderRepository.save(order);
    await this.syncStatusToOrderService(order, 'DELIVERING');
    return saved;
  }

  async updateStatus(orderId: string, status: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    order.status = status;
    const saved = await this.orderRepository.save(order);
    
    // Map outbound status to customer order status
    const mapped = 
      status === 'DELIVERED' ? 'COMPLETED' :
      status === 'SHIPPED' ? 'DELIVERING' :
      status === 'CONFIRMED' || status === 'PACKED' ? 'PACKING' :
      status === 'PICKING' ? 'PICKING' :
      status === 'CANCELLED' ? 'CANCELLED' : status;

    await this.syncStatusToOrderService(order, mapped);
    return saved;
  }

  async cancel(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (order.status === 'CONFIRMED') {
      throw new BadRequestException(`Cannot cancel a confirmed order`);
    }
    order.status = 'CANCELLED';
    const saved = await this.orderRepository.save(order);
    await this.syncStatusToOrderService(order, 'CANCELLED');
    return saved;
  }

  async getStats(): Promise<any> {
    const total = await this.orderRepository.count();
    const pending = await this.orderRepository.countBy({ status: 'PENDING' });
    const picking = await this.orderRepository.countBy({ status: 'PICKING' });
    const packed = await this.orderRepository.countBy({ status: 'PACKED' });
    const confirmed = await this.orderRepository.countBy({ status: 'CONFIRMED' });
    const cancelled = await this.orderRepository.countBy({ status: 'CANCELLED' });

    return { total, pending, picking, packed, confirmed, cancelled };
  }
}
