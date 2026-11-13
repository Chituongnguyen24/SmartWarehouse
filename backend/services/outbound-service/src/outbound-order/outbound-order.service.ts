import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
import * as amqp from 'amqp-connection-manager';
import Redis from 'ioredis';
import { OutboxService } from '../outbox/outbox.service';
import { OutboundSagaOrchestrator } from '../saga/outbound-saga.orchestrator';

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
    lotId?: string;
    lotCode?: string;
    slotId?: string;
    expiryDate?: string;
  }>;
  notes?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  customerPhone?: string;
}

@Injectable()
export class OutboundOrderService implements OnModuleInit, OnModuleDestroy {
  private rmqConnection: any;
  private rmqChannel: any;
  private redisClient: Redis;

  constructor(
    @InjectRepository(OutboundOrder)
    private orderRepository: Repository<OutboundOrder>,
    @InjectRepository(OutboundOrderItem)
    private itemRepository: Repository<OutboundOrderItem>,
    private outboxService: OutboxService,
    private sagaOrchestrator: OutboundSagaOrchestrator,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('error', (err) => {
      console.warn(`[OutboundOrderService] Redis warning: ${err.message}`);
    });
  }

  onModuleInit() {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.rmqConnection = amqp.connect([rabbitUrl]);
    this.rmqChannel = this.rmqConnection.createChannel({
      json: true,
      setup: (channel) => {
        return channel.assertExchange('outbound.events', 'topic', { durable: true });
      },
    });

    // Auto-sync existing pending orders with correct lot locations from inventory-service
    setTimeout(() => {
      this.syncLotLocationsForAllPendingOrders().catch(e => console.warn('[OUTBOUND] Auto-sync lot locations error:', e.message));
    }, 2000);
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
      const destLower = (dto.destination || '').toLowerCase();
      const districtLookup: Record<string, { lat: number; lng: number }> = {
        'gò vấp': { lat: 10.8252, lng: 106.6631 },
        'go vap': { lat: 10.8252, lng: 106.6631 },
        'quận 12': { lat: 10.8671, lng: 106.6713 },
        'quan 12': { lat: 10.8671, lng: 106.6713 },
        'thủ đức': { lat: 10.8494, lng: 106.7725 },
        'thu duc': { lat: 10.8494, lng: 106.7725 },
        'bình chánh': { lat: 10.6868, lng: 106.5932 },
        'binh chanh': { lat: 10.6868, lng: 106.5932 },
        'quận 7': { lat: 10.7324, lng: 106.7214 },
        'quan 7': { lat: 10.7324, lng: 106.7214 },
        'bình thạnh': { lat: 10.8016, lng: 106.7135 },
        'binh thanh': { lat: 10.8016, lng: 106.7135 },
        'quận 1': { lat: 10.7769, lng: 106.7009 },
        'quan 1': { lat: 10.7769, lng: 106.7009 },
        'quận 5': { lat: 10.7574, lng: 106.6635 },
        'quan 5': { lat: 10.7574, lng: 106.6635 },
        'tân bình': { lat: 10.7938, lng: 106.6509 },
        'tan binh': { lat: 10.7938, lng: 106.6509 },
        'bình tân': { lat: 10.7492, lng: 106.6025 },
        'binh tan': { lat: 10.7492, lng: 106.6025 },
        'hóc môn': { lat: 10.8833, lng: 106.5931 },
        'hoc mon': { lat: 10.8833, lng: 106.5931 },
        'nhà bè': { lat: 10.6953, lng: 106.7231 },
        'nha be': { lat: 10.6953, lng: 106.7231 },
        'phú nhuận': { lat: 10.7992, lng: 106.6803 },
        'phu nhuan': { lat: 10.7992, lng: 106.6803 },
        'quận 8': { lat: 10.7239, lng: 106.6342 },
        'quan 8': { lat: 10.7239, lng: 106.6342 },
        'củ chi': { lat: 10.9625, lng: 106.4981 },
        'cu chi': { lat: 10.9625, lng: 106.4981 },
        'quận 10': { lat: 10.7719, lng: 106.6669 },
        'quan 10': { lat: 10.7719, lng: 106.6669 },
      };

      for (const [k, c] of Object.entries(districtLookup)) {
        if (destLower.includes(k)) {
          lat = c.lat;
          lng = c.lng;
          break;
        }
      }

      if (!lat || !lng) {
        lat = 10.8252;
        lng = 106.6631; // Default to Go Vap center
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
        console.error('[OUTBOUND AUTO-ROUTING] Error calculating nearest warehouse, fallback to WH-001:', err.message);
        finalWarehouseCode = 'WH-001';
        finalWarehouseId = '11111111-1111-1111-1111-111111111111';
      }
    }

    const rawDest = (dto.destination || '').toLowerCase();
    const rawNote = (dto.notes || '').toLowerCase();
    const isDisposal = rawDest.includes('tiêu hủy') || rawDest.includes('đa phước') || rawNote.includes('tiêu hủy') || rawNote.includes('hết hạn');

    const initialDriverId = dto.assignedDriverId || (isDisposal ? 'NV-TK01' : undefined);
    const initialDriverName = dto.assignedDriverName || (isDisposal ? 'Đặng Hoàng Phúc (Tài xế Xe Tải)' : undefined);
    const initialDriverPhone = dto.assignedDriverPhone || (isDisposal ? '0944 778 899' : undefined);
    const initialDriverPlate = dto.assignedDriverPlate || (isDisposal ? '51D-892.45' : undefined);

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
      assignedDriverId: initialDriverId,
      assignedDriverName: initialDriverName,
      assignedDriverPhone: initialDriverPhone,
      assignedDriverPlate: initialDriverPlate,
      customerPhone: dto.customerPhone || (isDisposal ? '1900 6868' : '0944778899'),
    });

    const savedOrder = await this.orderRepository.save(order);

    for (const item of dto.items) {
      let lotInfo: any = null;
      if (!item.lotCode && !item.lotId) {
        lotInfo = await this.findMatchingLotForSku(item.sku, savedOrder.warehouseCode);
      }
      await this.itemRepository.save(this.itemRepository.create({
        outboundOrderId: savedOrder.id,
        sku: item.sku,
        productName: item.productName,
        requestedQuantity: item.requestedQuantity,
        status: 'PENDING',
        lotId: item.lotId || lotInfo?.lotId || null,
        lotCode: item.lotCode || lotInfo?.lotCode || null,
        slotId: item.slotId || lotInfo?.slotId || null,
        expiryDate: item.expiryDate || lotInfo?.expiryDate || null,
        riskScore: lotInfo?.riskScore !== undefined ? lotInfo.riskScore : null,
        priorityScore: lotInfo?.priorityScore !== undefined ? lotInfo.priorityScore : null,
      }));
    }

    // Auto deduct inventory stock in inventory-service for this warehouse
    const createdOrder = await this.findOne(savedOrder.id);
    
    // Save to Transactional Outbox for 100% Guaranteed Delivery
    await this.outboxService.recordEvent('OUTBOUND_ORDER', savedOrder.id, 'outbound_order_created', {
      orderId: savedOrder.id,
      orderCode: savedOrder.orderCode,
      destination: savedOrder.destination,
      warehouseCode: savedOrder.warehouseCode,
      totalItems: savedOrder.totalItems,
      totalQuantity: savedOrder.totalQuantity,
      status: 'PENDING',
      order: createdOrder,
    });

    this.broadcastOrderEvent('outbound_order_created', {
      orderId: savedOrder.id,
      orderCode: savedOrder.orderCode,
      destination: savedOrder.destination,
      warehouseCode: savedOrder.warehouseCode,
      totalItems: savedOrder.totalItems,
      totalQuantity: savedOrder.totalQuantity,
      status: 'PENDING',
      order: createdOrder,
    });

    return createdOrder;
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
          const lotInfo = await this.findMatchingLotForSku(item.sku, savedOrder.warehouseCode);
          await this.itemRepository.save(this.itemRepository.create({
            outboundOrderId: savedOrder.id,
            sku: item.sku,
            productName: item.productName,
            requestedQuantity: item.requestedQuantity,
            status: 'PENDING',
            lotId: lotInfo?.lotId || null,
            lotCode: lotInfo?.lotCode || null,
            slotId: lotInfo?.slotId || null,
            expiryDate: lotInfo?.expiryDate || null,
            riskScore: lotInfo?.riskScore !== undefined ? lotInfo.riskScore : null,
            priorityScore: lotInfo?.priorityScore !== undefined ? lotInfo.priorityScore : null,
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
          const lotInfo = await this.findMatchingLotForSku(item.sku, savedOrder.warehouseCode);
          await this.itemRepository.save(this.itemRepository.create({
            outboundOrderId: savedOrder.id,
            sku: item.sku,
            productName: item.productName,
            requestedQuantity: item.requestedQuantity,
            status: 'PENDING',
            lotId: lotInfo?.lotId || null,
            lotCode: lotInfo?.lotCode || null,
            slotId: lotInfo?.slotId || null,
            expiryDate: lotInfo?.expiryDate || null,
            riskScore: lotInfo?.riskScore !== undefined ? lotInfo.riskScore : null,
            priorityScore: lotInfo?.priorityScore !== undefined ? lotInfo.priorityScore : null,
          }));
        }
        createdOrders.push(await this.findOne(savedOrder.id));
    }
    
    for (const co of createdOrders) {
      if (co) {
        this.broadcastOrderEvent('outbound_order_created', {
          orderId: co.id,
          orderCode: co.orderCode,
          destination: co.destination,
          warehouseCode: co.warehouseCode,
          totalItems: co.totalItems,
          totalQuantity: co.totalQuantity,
          status: 'PENDING',
          order: co,
        });
      }
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
        { id: '11111111-1111-1111-1111-111111111111', code: 'WH-001', name: 'Kho Hàng Quận 12 (HCM North)', latitude: 10.8671, longitude: 106.6713, address: '12 Tô Ký, Quận 12' },
        { id: '22222222-2222-2222-2222-222222222222', code: 'WH-002', name: 'Kho Hàng Thủ Đức (HCM East)', latitude: 10.8494, longitude: 106.7725, address: '1 Võ Văn Ngân, Thủ Đức' },
        { id: '33333333-3333-3333-3333-333333333333', code: 'WH-003', name: 'Kho Hàng Bình Chánh (HCM West)', latitude: 10.6868, longitude: 106.5932, address: 'Tỉnh lộ 10, Bình Chánh' },
        { id: '44444444-4444-4444-4444-444444444444', code: 'WH-004', name: 'Kho Hàng Quận 7 (HCM South)', latitude: 10.7324, longitude: 106.7214, address: '1025 Nguyễn Văn Linh, Quận 7' },
        { id: '55555555-5555-5555-5555-555555555555', code: 'WH-005', name: 'Kho Hàng Bình Thạnh (HCM Center-East)', latitude: 10.8016, longitude: 106.7135, address: '150 Điện Biên Phủ, Bình Thạnh' },
        { id: '66666666-6666-6666-6666-666666666666', code: 'WH-006', name: 'Kho Hàng Gò Vấp (HCM Northwest)', latitude: 10.8252, longitude: 106.6631, address: '350 Quang Trung, Gò Vấp' },
        { id: '77777777-7777-7777-7777-777777777777', code: 'WH-007', name: 'Kho Hàng Quận 1 (HCM Center)', latitude: 10.7769, longitude: 106.7009, address: '85 Lê Lợi, Quận 1' },
        { id: '88888888-8888-8888-8888-888888888888', code: 'WH-008', name: 'Kho Hàng Quận 5 (HCM South-West)', latitude: 10.7574, longitude: 106.6635, address: '105 An Dương Vương, Quận 5' },
        { id: '99999999-9999-9999-9999-999999999999', code: 'WH-009', name: 'Kho Hàng Tân Bình (HCM West-Center)', latitude: 10.7938, longitude: 106.6509, address: '20 Trường Chinh, Tân Bình' },
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', code: 'WH-010', name: 'Kho Hàng Bình Tân (HCM Deep-West)', latitude: 10.7492, longitude: 106.6025, address: '88 Kinh Dương Vương, Bình Tân' },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', code: 'WH-011', name: 'Kho Hàng Hóc Môn (HCM Far-North)', latitude: 10.8833, longitude: 106.5931, address: '14 Nguyễn Ảnh Thủ, Hóc Môn' },
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', code: 'WH-012', name: 'Kho Hàng Nhà Bè (HCM Far-South)', latitude: 10.6953, longitude: 106.7231, address: '500 Huỳnh Tấn Phát, Nhà Bè' },
        { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', code: 'WH-013', name: 'Kho Hàng Phú Nhuận (HCM Mid-Center)', latitude: 10.7992, longitude: 106.6803, address: '18 Phan Xích Long, Phú Nhuận' },
        { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', code: 'WH-014', name: 'Kho Hàng Quận 8 (HCM South-West-Line)', latitude: 10.7239, longitude: 106.6342, address: '1020 Phạm Thế Hiển, Quận 8' },
        { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', code: 'WH-015', name: 'Kho Hàng Củ Chi (HCM Northwest-Zone)', latitude: 10.9625, longitude: 106.4981, address: '450 Quốc lộ 22, Củ Chi' },
        { id: '00000000-0000-0000-0000-000000000000', code: 'WH-016', name: 'Kho Hàng Quận 10 (HCM Center-West)', latitude: 10.7719, longitude: 106.6669, address: '123 Đường 3 Tháng 2, Quận 10' },
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

    // Tính khoảng cách địa lý nhanh chóng & tức thì 0ms (Haversine với hệ số đường phố HCM 1.25x)
    const getRoutingDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
      return R * c * 1.25;
    };

    // Đánh giá từng kho hàng (chạy đồng bộ cực nhanh 0.05ms, loại bỏ hoàn toàn độ trễ mạng ngoại vi)
    const candidates = warehouses.map((wh) => {
      const distance = getRoutingDistance(dto.latitude, dto.longitude, wh.latitude, wh.longitude);
      
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
    });

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
    if (status && status !== 'ALL') where.status = status;
    if (warehouseCode && warehouseCode !== 'ALL') {
      if (warehouseCode === 'WH-006' || warehouseCode === 'GV') {
        where.warehouseCode = In(['WH-006', 'GV']);
      } else {
        where.warehouseCode = warehouseCode;
      }
    }
    
    return this.orderRepository.find({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OutboundOrder> {
    const rawId = (id || '').trim();
    const cleanId = rawId.replace(/^ECOMM-/, '').replace(/^OB-/, '').replace(/^OUT-/, '').trim();
    const obId = `OB-${cleanId}`;

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const whereConditions: any[] = [];
    if (isUuid(rawId)) whereConditions.push({ id: rawId });
    if (cleanId && isUuid(cleanId)) whereConditions.push({ id: cleanId });
    if (rawId) whereConditions.push({ orderCode: rawId });
    if (cleanId) {
      whereConditions.push({ orderCode: cleanId });
      whereConditions.push({ orderCode: obId });
      whereConditions.push({ orderCode: `ECOMM-${cleanId}` });
    }

    let order = await this.orderRepository.findOne({
      where: whereConditions,
      relations: ['items'],
    }).catch(() => null);

    if (!order && cleanId.length >= 3) {
      const allOrders = await this.orderRepository.find({ relations: ['items'] }).catch(() => []);
      const lowerRaw = rawId.toLowerCase();
      const lowerClean = cleanId.toLowerCase();
      order = allOrders.find(o => {
        const oId = (o.id || '').toLowerCase();
        const oCode = (o.orderCode || '').toLowerCase();
        const oNotes = (o.notes || '').toLowerCase();
        return (
          oId === lowerRaw ||
          oId === lowerClean ||
          oCode === lowerRaw ||
          oCode === lowerClean ||
          oCode.endsWith(lowerClean) ||
          lowerClean.endsWith(oCode) ||
          (oNotes && (oNotes.includes(lowerClean) || oNotes.includes(lowerRaw)))
        );
      });
    }

    if (!order) throw new NotFoundException(`OutboundOrder ${id} not found`);
    return order;
  }

  async assignDriver(id: string, body: { 
    driverId?: string; 
    assignedDriverId?: string; 
    driverName?: string; 
    assignedDriverName?: string; 
    driverPhone?: string; 
    assignedDriverPhone?: string; 
    driverPlate?: string; 
    assignedDriverPlate?: string; 
    status?: string 
  }): Promise<OutboundOrder> {
    const order = await this.findOne(id);
    const dId = body.assignedDriverId || body.driverId;
    const dName = body.assignedDriverName || body.driverName;
    const dPhone = body.assignedDriverPhone || body.driverPhone;
    const dPlate = body.assignedDriverPlate || body.driverPlate;

    if (dId !== undefined) order.assignedDriverId = dId;
    if (dName !== undefined) order.assignedDriverName = dName;
    if (dPhone !== undefined) order.assignedDriverPhone = dPhone;
    if (dPlate !== undefined) order.assignedDriverPlate = dPlate;
    if (body.status !== undefined) order.status = body.status;

    const saved = await this.orderRepository.save(order);

    // Broadcast live event to Redis/RabbitMQ/Notification
    this.broadcastOrderEvent('order_status_updated', saved);

    // Broadcast live event to Order Gateway Socket on port 3004
    fetch(`http://localhost:3004/orders/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order_status_updated',
        payload: {
          id: saved.id,
          orderCode: saved.orderCode,
          status: saved.status,
          assignedDriverId: saved.assignedDriverId,
          assignedDriverName: saved.assignedDriverName,
          assignedDriverPhone: saved.assignedDriverPhone,
          assignedDriverPlate: saved.assignedDriverPlate,
        },
      }),
    }).catch(() => {});

    return saved;
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
    this.broadcastOrderEvent('order_status_updated', { orderId: order.id, status: 'PICKING', order: saved });
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
    this.broadcastOrderEvent('order_status_updated', { orderId: savedOrder.id, status: 'PACKED', order: savedOrder });

    return savedOrder;
  }

  // Bước 5: Xác nhận xuất kho
  async confirm(orderId: string, confirmedBy: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Auto mark items as confirmed / picked if needed
    for (const item of order.items) {
      if (!item.pickedQuantity || item.pickedQuantity === 0) {
        item.pickedQuantity = item.requestedQuantity || 1;
      }
      item.status = 'CONFIRMED';
      await this.itemRepository.save(item);
    }

    order.status = 'CONFIRMED';
    order.confirmedBy = confirmedBy || 'Quản lý kho';
    order.confirmedAt = new Date();

    const confirmed = await this.orderRepository.save(order);

    console.log(`[OUTBOUND] Order ${order.orderCode} CONFIRMED. Deducting and clearing inventory lots from database...`);

    // Call Inventory Service to deduct and delete lots from DB
    await this.processOrderInventoryDeduction(confirmed);

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
    this.broadcastOrderEvent('outbound_confirmed', { orderId: confirmed.id, status: 'CONFIRMED', order: confirmed });
    this.broadcastOrderEvent('order_status_updated', { orderId: confirmed.id, status: 'CONFIRMED', order: confirmed });

    return confirmed;
  }

  private async processOrderInventoryDeduction(order: OutboundOrder) {
    try {
      const token = await this.getAuthToken();
      const unassignedItems: { sku: string; quantity: number }[] = [];

      for (const item of order.items) {
        const qtyToExport = (item.pickedQuantity > 0 ? item.pickedQuantity : item.requestedQuantity) || 1;
        const targetLot = item.lotCode || item.lotId;

        if (targetLot) {
          const deductPayload = {
            lotId: item.lotId,
            lotCode: item.lotCode,
            quantity: qtyToExport,
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
            const err = await res.json().catch(() => ({}));
            console.error(`[OUTBOUND SERVICE] Failed to deduct stock for lot ${item.lotCode || item.lotId}:`, err);
            unassignedItems.push({ sku: item.sku, quantity: qtyToExport });
          } else {
            console.log(`[OUTBOUND SERVICE] ✅ Successfully exported & deducted ${qtyToExport} from lot ${item.lotCode || item.lotId}`);
          }
        } else if (qtyToExport > 0) {
          unassignedItems.push({ sku: item.sku, quantity: qtyToExport });
        }
      }

      // Also check notes for any disposal/FEFO lot code specified directly (e.g. Lô: LOT-...)
      if (order.notes && order.notes.includes('Lô:')) {
        const match = order.notes.match(/Lô:\s*([A-Za-z0-9-_]+)/);
        if (match && match[1]) {
          const noteLotCode = match[1].trim();
          await fetch('http://localhost:3011/inventory/lots/export', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lotCode: noteLotCode,
              quantity: 999999, // Force clear entire lot
              reason: `DISPOSAL_EXPORT_${order.orderCode}`,
            }),
          }).catch(() => {});
        }
      }

      if (unassignedItems.length > 0) {
        await this.deductInventoryStock(order.warehouseCode || 'WH-006', unassignedItems);
      }
    } catch (err) {
      console.error('[OUTBOUND SERVICE] Error calling inventory stock deduction:', err.message);
    }
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
    const prevStatus = order.status;
    order.status = 'SHIPPED';
    if (!order.confirmedAt) {
      order.confirmedAt = new Date();
      order.confirmedBy = order.confirmedBy || 'Shipper';
    }
    const saved = await this.orderRepository.save(order);
    if (prevStatus !== 'CONFIRMED' && prevStatus !== 'SHIPPED' && prevStatus !== 'DELIVERED') {
      await this.processOrderInventoryDeduction(saved);
    }
    await this.syncStatusToOrderService(order, 'DELIVERING');
    this.broadcastOrderEvent('order_status_updated', { orderId: order.id, status: 'SHIPPED', order: saved });
    return saved;
  }

  async updateStatus(orderId: string, status: string, extraBody?: any): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    const prevStatus = order.status;
    if (status) order.status = status;
    if ((status === 'CONFIRMED' || status === 'DELIVERED') && !order.confirmedAt) {
      order.confirmedAt = new Date();
      order.confirmedBy = order.confirmedBy || 'Quản lý kho';
    }

    if (extraBody) {
      if (extraBody.podPhotoUrl || extraBody.pod_photo_url) {
        order.podPhotoUrl = extraBody.podPhotoUrl || extraBody.pod_photo_url;
      }
      if (extraBody.failureReason || extraBody.failure_reason) {
        order.failureReason = extraBody.failureReason || extraBody.failure_reason;
      }
      if (extraBody.failurePhotoUrl || extraBody.failure_photo_url) {
        order.failurePhotoUrl = extraBody.failurePhotoUrl || extraBody.failure_photo_url;
      }
      const dId = extraBody.assignedDriverId || extraBody.driverId;
      if (dId) order.assignedDriverId = dId;
      const dName = extraBody.assignedDriverName || extraBody.driverName;
      if (dName) order.assignedDriverName = dName;
      const dPhone = extraBody.assignedDriverPhone || extraBody.driverPhone;
      if (dPhone) order.assignedDriverPhone = dPhone;
      const dPlate = extraBody.assignedDriverPlate || extraBody.driverPlate;
      if (dPlate) order.assignedDriverPlate = dPlate;
    }

    const saved = await this.orderRepository.save(order);
    
    // If transitioning to CONFIRMED or DELIVERED, ensure inventory lots are deducted
    if ((status === 'CONFIRMED' || status === 'DELIVERED') && prevStatus !== 'CONFIRMED' && prevStatus !== 'DELIVERED') {
      await this.processOrderInventoryDeduction(saved);
    }

    // Map outbound status to customer order status
    const mapped = 
      status === 'DELIVERED' ? 'COMPLETED' :
      status === 'SHIPPED' ? 'DELIVERING' :
      status === 'CONFIRMED' || status === 'READY_FOR_DELIVERY' ? 'READY_FOR_DELIVERY' :
      status === 'PACKED' ? 'PACKED' :
      status === 'PICKING' ? 'PICKING' :
      status === 'CANCELLED' ? 'CANCELLED' : status;

    await this.syncStatusToOrderService(order, mapped);
    this.broadcastOrderEvent('order_status_updated', { orderId: order.id, status, order: saved });

    // Live broadcast to Order Gateway Socket on port 3004 so Web Dashboard updates instantly
    fetch(`http://localhost:3004/orders/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order_status_updated',
        payload: {
          id: saved.id,
          orderCode: saved.orderCode,
          status: mapped,
          assignedDriverId: saved.assignedDriverId,
          assignedDriverName: saved.assignedDriverName,
          assignedDriverPhone: saved.assignedDriverPhone,
          assignedDriverPlate: saved.assignedDriverPlate,
          podPhotoUrl: saved.podPhotoUrl,
        },
      }),
    }).catch(() => {});

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
    this.broadcastOrderEvent('order_status_updated', { orderId: order.id, status: 'CANCELLED', order: saved });
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

  async updateOrder(id: string, updateDto: any): Promise<OutboundOrder> {
    const order = await this.findOne(id);
    if (!order) throw new NotFoundException(`OutboundOrder ${id} not found`);

    if (updateDto.requesterName !== undefined) order.requesterName = updateDto.requesterName;
    if (updateDto.destination !== undefined) order.destination = updateDto.destination;
    if (updateDto.notes !== undefined) order.notes = updateDto.notes;
    if (updateDto.warehouseCode !== undefined) order.warehouseCode = updateDto.warehouseCode;
    if (updateDto.status !== undefined) order.status = updateDto.status;

    if (updateDto.items && Array.isArray(updateDto.items)) {
      const orderItems = await this.itemRepository.find({ where: { outboundOrderId: order.id } });
      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      for (const itemUpdate of updateDto.items) {
        let item: OutboundOrderItem | null = null;

        // 1. Match by valid UUID id
        if (itemUpdate.id && isUuid(String(itemUpdate.id).trim())) {
          const cleanId = String(itemUpdate.id).trim();
          item = orderItems.find(i => i.id === cleanId) || await this.itemRepository.findOne({ where: { id: cleanId } });
        }

        // 2. Fallback match by SKU within this order
        if (!item && itemUpdate.sku) {
          item = orderItems.find(i => i.sku === itemUpdate.sku) || null;
        }

        // 3. Fallback match by lotCode within this order
        if (!item && itemUpdate.lotCode) {
          item = orderItems.find(i => i.lotCode === itemUpdate.lotCode) || null;
        }

        // 4. Fallback match by id substring (e.g. pk-<uuid>-1)
        if (!item && itemUpdate.id) {
          const rawIdStr = String(itemUpdate.id);
          item = orderItems.find(i => rawIdStr.includes(i.id)) || null;
        }

        if (item) {
          if (itemUpdate.requestedQuantity !== undefined) item.requestedQuantity = Number(itemUpdate.requestedQuantity);
          if (itemUpdate.pickedQuantity !== undefined) item.pickedQuantity = Number(itemUpdate.pickedQuantity);
          if (itemUpdate.lotCode !== undefined) item.lotCode = itemUpdate.lotCode;
          if (itemUpdate.slotId !== undefined) item.slotId = itemUpdate.slotId;
          if (itemUpdate.status !== undefined) item.status = itemUpdate.status;
          await this.itemRepository.save(item);
        }
      }

      const refreshedItems = await this.itemRepository.find({ where: { outboundOrderId: order.id } });
      order.totalItems = refreshedItems.length;
      order.totalQuantity = refreshedItems.reduce((s, i) => s + (Number(i.requestedQuantity) || 0), 0);
    }

    await this.orderRepository.save(order);
    const updated = await this.findOne(order.id);
    this.broadcastOrderEvent('outbound_order_updated', updated || order);
    return updated || order;
  }

  // =========================================================================
  // CONCURRENCY MUTEX LOCK (DISTRIBUTED REDIS LOCK)
  // Prevents Web Manager and Mobile Staff from operating on the same order
  // =========================================================================
  private orderLocks = new Map<string, {
    userId: string;
    userName: string;
    role: string;
    lockedAt: string;
    expiresAt: number;
  }>();

  async lockOrder(orderId: string, user: { userId: string; userName: string; role?: string }): Promise<any> {
    const lockKey = `sfwms:lock:order:${orderId}`;
    const now = Date.now();
    const ttlSeconds = 300; // 5 minutes TTL

    const lockData = {
      userId: user.userId || 'usr-staff',
      userName: user.userName || 'Nhân viên kho',
      role: user.role || 'STAFF',
      lockedAt: new Date().toISOString(),
      expiresAt: now + ttlSeconds * 1000,
    };

    // 1. Try Redis Distributed Lock
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const rawExisting = await this.redisClient.get(lockKey);
        if (rawExisting) {
          const existing = JSON.parse(rawExisting);
          if (existing.userId !== user.userId && existing.expiresAt > now) {
            throw new ConflictException({
              statusCode: 409,
              error: 'ORDER_LOCKED',
              message: `Đơn hàng đang được thao tác bởi ${existing.userName} (${existing.role || 'Nhân viên'}). Vui lòng chờ hoàn tất!`,
              lockedBy: existing,
            });
          }
        }
        await this.redisClient.set(lockKey, JSON.stringify(lockData), 'EX', ttlSeconds);
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        console.warn('[OUTBOUND] Redis lock fallback to in-memory:', err.message);
      }
    } else {
      // In-memory fallback
      const existing = this.orderLocks.get(orderId);
      if (existing && existing.expiresAt > now && existing.userId !== user.userId) {
        throw new ConflictException({
          statusCode: 409,
          error: 'ORDER_LOCKED',
          message: `Đơn hàng đang được thao tác bởi ${existing.userName} (${existing.role || 'Nhân viên'}). Vui lòng chờ hoàn tất!`,
          lockedBy: existing,
        });
      }
    }

    this.orderLocks.set(orderId, lockData);

    // Broadcast to Notification/WebSocket Gateway & Redis PubSub
    this.broadcastOrderEvent('order_locked', { orderId, lock: lockData });

    return { success: true, orderId, lock: lockData };
  }

  async unlockOrder(orderId: string, userId?: string): Promise<any> {
    const lockKey = `sfwms:lock:order:${orderId}`;

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const rawExisting = await this.redisClient.get(lockKey);
        if (rawExisting) {
          const existing = JSON.parse(rawExisting);
          if (!userId || existing.userId === userId) {
            await this.redisClient.del(lockKey);
          }
        } else {
          await this.redisClient.del(lockKey);
        }
      } catch (e) {
        console.warn('[OUTBOUND] Redis unlock warning:', e.message);
      }
    }

    const existing = this.orderLocks.get(orderId);
    if (existing) {
      if (!userId || existing.userId === userId || existing.expiresAt <= Date.now()) {
        this.orderLocks.delete(orderId);
      }
    }

    this.broadcastOrderEvent('order_unlocked', { orderId, unlockedBy: userId });
    return { success: true, orderId };
  }

  async getActiveLocks(): Promise<Record<string, any>> {
    const now = Date.now();
    const active: Record<string, any> = {};

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const keys = await this.redisClient.keys('sfwms:lock:order:*');
        if (keys && keys.length > 0) {
          const values = await this.redisClient.mget(...keys);
          keys.forEach((k, idx) => {
            const orderId = k.replace('sfwms:lock:order:', '');
            const raw = values[idx];
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (parsed.expiresAt > now) {
                  active[orderId] = parsed;
                }
              } catch (e) {}
            }
          });
          return active;
        }
      } catch (e) {
        console.warn('[OUTBOUND] Redis getActiveLocks warning:', e.message);
      }
    }

    for (const [orderId, lock] of this.orderLocks.entries()) {
      if (lock.expiresAt > now) {
        active[orderId] = lock;
      } else {
        this.orderLocks.delete(orderId);
      }
    }
    return active;
  }

  private async findMatchingLotForSku(sku: string, warehouseCode?: string): Promise<any | null> {
    try {
      const cleanSku = (sku || '').replace(/^LOT-/, '').trim();

      // 1. Try smart FEFO endpoint first
      if (cleanSku) {
        const fefoUrl = `http://localhost:3011/inventory/fefo?sku=${encodeURIComponent(cleanSku)}&quantity=1${warehouseCode ? `&warehouseId=${encodeURIComponent(warehouseCode)}` : ''}`;
        const fefoRes = await fetch(fefoUrl);
        if (fefoRes.ok) {
          const fefoData = await fefoRes.json();
          if (fefoData?.suggestions && fefoData.suggestions.length > 0) {
            const top = fefoData.suggestions[0];
            return {
              lotId: top.lotId,
              lotCode: top.lotCode,
              slotId: top.location,
              expiryDate: top.expiryDate ? new Date(top.expiryDate) : undefined,
              riskScore: top.riskScore || 0,
              priorityScore: top.priorityScore || 0,
            };
          }
        }
      }

      // 2. Query lots by search pattern from inventory-service
      const lotsUrl = `http://localhost:3011/inventory/lots?limit=5000${warehouseCode ? `&warehouseCode=${encodeURIComponent(warehouseCode)}` : ''}`;
      const lotsRes = await fetch(lotsUrl);
      if (lotsRes.ok) {
        const lots = await lotsRes.json();
        if (Array.isArray(lots) && lots.length > 0) {
          let matched = lots.find((l: any) => 
            (cleanSku && l.lotCode && l.lotCode.includes(cleanSku)) ||
            l.sku === sku ||
            l.productId === sku
          );
          if (!matched) {
            matched = lots[0];
          }
          if (matched) {
            return {
              lotId: matched.id,
              lotCode: matched.lotCode,
              slotId: matched.location,
              expiryDate: matched.expiryDate ? new Date(matched.expiryDate) : undefined,
              riskScore: matched.riskScore || 0,
              priorityScore: matched.priorityScore || 0,
            };
          }
        }
      }
    } catch (e) {
      console.warn(`[OUTBOUND] Error fetching matching lot for SKU ${sku}:`, e.message);
    }
    return null;
  }

  async syncLotLocationsForAllPendingOrders(): Promise<{ updatedOrders: number; updatedItems: number }> {
    try {
      const orders = await this.orderRepository.find({
        relations: ['items'],
      });

      let updatedOrdersCount = 0;
      let updatedItemsCount = 0;

      // Fetch all lots from inventory-service
      let allLots: any[] = [];
      try {
        const res = await fetch('http://localhost:3011/inventory/lots?limit=10000');
        if (res.ok) {
          allLots = await res.json();
        }
      } catch (e) {
        console.error('[OUTBOUND SYNC] Failed to fetch inventory lots:', e.message);
      }

      if (allLots.length === 0) {
        console.warn('[OUTBOUND SYNC] No inventory lots found to sync.');
        return { updatedOrders: 0, updatedItems: 0 };
      }

      for (const order of orders) {
        let orderModified = false;
        if (!order.items || order.items.length === 0) continue;

        for (const item of order.items) {
          const cleanSku = (item.sku || '').replace(/^LOT-/, '').trim();
          
          // Match lot:
          // 1. Direct SKU match in lotCode / sku / productId in the same warehouse
          let matchedLot = allLots.find(l => 
            (l.warehouseCode === order.warehouseCode || l.warehouseId === order.warehouseId) &&
            ((cleanSku && l.lotCode && l.lotCode.includes(cleanSku)) || l.sku === item.sku || l.productId === item.sku)
          );

          // 2. Global SKU match across all warehouses
          if (!matchedLot) {
            matchedLot = allLots.find(l => 
              (cleanSku && l.lotCode && l.lotCode.includes(cleanSku)) || l.sku === item.sku || l.productId === item.sku
            );
          }

          // 3. Fallback to any lot in that warehouse or global lot
          if (!matchedLot && order.warehouseCode) {
            matchedLot = allLots.find(l => l.warehouseCode === order.warehouseCode);
          }
          if (!matchedLot) {
            matchedLot = allLots[0];
          }

          if (matchedLot) {
            item.lotId = matchedLot.id;
            item.lotCode = matchedLot.lotCode;
            if (!order.orderCode?.includes('XK-KHO-MAT-IOT')) {
              item.slotId = matchedLot.location;
            }
            item.expiryDate = matchedLot.expiryDate ? new Date(matchedLot.expiryDate) : (item.expiryDate || new Date(Date.now() + 30 * 86400000));
            item.riskScore = matchedLot.riskScore !== undefined ? matchedLot.riskScore : (item.riskScore || 0);
            await this.itemRepository.save(item);
            orderModified = true;
            updatedItemsCount++;
          }
        }

        if (orderModified) {
          updatedOrdersCount++;
        }
      }

      console.log(`[OUTBOUND SYNC] Successfully synced ${updatedItemsCount} items across ${updatedOrdersCount} orders.`);
      return { updatedOrders: updatedOrdersCount, updatedItems: updatedItemsCount };
    } catch (err) {
      console.error('[OUTBOUND SYNC] Error syncing lot locations:', err.message);
      return { updatedOrders: 0, updatedItems: 0 };
    }
  }

  async executeSaga(orderId: string) {
    return this.sagaOrchestrator.executeOrderSaga(orderId);
  }

  async getOutboxStats() {
    return this.outboxService.getOutboxStats();
  }

  private async broadcastOrderEvent(event: string, payload: any) {
    try {
      // 1. Publish event via Redis Pub/Sub for real-time instant broadcast
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.publish(event, JSON.stringify(payload));
      }
      // 2. Publish event via RabbitMQ
      if (this.rmqChannel) {
        await this.rmqChannel.publish('outbound.events', event, payload);
      }
      // 3. Call Notification Gateway and Order Gateway on port 3004
      const body = JSON.stringify({ event, payload });
      fetch('http://localhost:3004/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
      fetch('http://localhost:3004/orders/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    } catch (e) {
      // Silent pass
    }
  }

  private iotMqttClient: any = null;

  private async publishToMqtt(topic: string, payload: any) {
    try {
      if (!this.iotMqttClient) {
        const mqtt = require('mqtt');
        this.iotMqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');
      }
      this.iotMqttClient.publish(topic, JSON.stringify(payload));
      console.log(`[OutboundService IoT] Published to ${topic}:`, JSON.stringify(payload));
    } catch (e) {
      console.warn('[OutboundService IoT] MQTT Publish failed:', e.message);
    }
  }

  // IoT Pick-to-Light: Locate Shelf (Blink & Beep)
  async triggerIotLocateShelf(dto: { warehouseCode?: string; shelfCode: string; slotCode?: string; productName?: string; qty?: number; step?: number }) {
    const warehouseCode = dto.warehouseCode || 'WH-006';
    const payload = {
      action: 'LOCATE',
      warehouseCode,
      shelfCode: dto.shelfCode,
      slotCode: dto.slotCode,
      productName: dto.productName || 'Sản phẩm xuất kho',
      qty: dto.qty || 1,
      step: dto.step || 1,
      timestamp: Date.now(),
    };

    // Publish to both WH-006 and GV topics for total compatibility
    await this.publishToMqtt(`citymart/warehouse/WH-006/picking/command`, payload);
    await this.publishToMqtt(`citymart/warehouse/GV/picking/command`, payload);

    return { success: true, message: `Đã phát lệnh nháy đèn tìm kệ ${dto.shelfCode}`, payload };
  }

  // IoT Pick-to-Light: Smartkey Horn Chirp (Bóp còi tìm kệ như Smartkey ô tô / xe máy)
  async triggerIotChirpShelf(dto: { warehouseCode?: string; shelfCode: string }) {
    const warehouseCode = dto.warehouseCode || 'WH-006';
    const payload = {
      action: 'SMARTKEY_CHIRP',
      warehouseCode,
      shelfCode: dto.shelfCode,
      timestamp: Date.now(),
    };

    await this.publishToMqtt(`citymart/warehouse/WH-006/picking/command`, payload);
    await this.publishToMqtt(`citymart/warehouse/GV/picking/command`, payload);

    return { success: true, message: `🔑 Đã bóp còi Smartkey tìm kệ ${dto.shelfCode}`, payload };
  }

  // IoT Pick-to-Light: Complete Shelf (Auto turn off LED and mark picked)
  async triggerIotCompleteShelf(dto: { warehouseCode?: string; shelfCode: string }) {
    const warehouseCode = dto.warehouseCode || 'WH-006';
    const payload = {
      action: 'SCAN_COMPLETED',
      warehouseCode,
      shelfCode: dto.shelfCode,
      timestamp: Date.now(),
    };

    // Publish to both WH-006 and GV topics
    await this.publishToMqtt(`citymart/warehouse/WH-006/picking/command`, payload);
    await this.publishToMqtt(`citymart/warehouse/GV/picking/command`, payload);

    // Auto sync picked status for matching shelf in pending picking orders
    try {
      const pendingOrders = await this.orderRepository.find({
        where: { warehouseCode, status: 'PENDING' },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });

      for (const order of pendingOrders) {
        let orderChanged = false;
        for (const item of order.items) {
          if (item.status !== 'PICKED') {
            const itemShelf = (item.slotId || '').toLowerCase();
            const targetShelf = (dto.shelfCode || '').toLowerCase();
            const isMatch = (targetShelf.includes('a1') && itemShelf.includes('a1')) ||
                            (targetShelf.includes('a2') && itemShelf.includes('a2')) ||
                            (targetShelf.includes('a3') && itemShelf.includes('a3')) ||
                            (targetShelf.includes('1') && itemShelf.includes('a1')) ||
                            (targetShelf.includes('2') && itemShelf.includes('a2')) ||
                            (targetShelf.includes('3') && itemShelf.includes('a3'));
            if (isMatch) {
              item.status = 'PICKED';
              item.pickedQuantity = item.requestedQuantity || 1;
              await this.itemRepository.save(item);
              orderChanged = true;
            }
          }
        }
        if (orderChanged) {
          this.broadcastOrderEvent('outbound_order_updated', { orderId: order.id, orderCode: order.orderCode });
        }
      }
    } catch (e) {
      console.warn('[IoT Complete Shelf] Auto-pick error:', e);
    }

    return { success: true, message: `Đã quét xong. Tắt đèn kệ ${dto.shelfCode}`, payload };
  }
}


