import { Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
import * as amqp from 'amqp-connection-manager';

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
  async create(dto: {
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
  }): Promise<OutboundOrder> {
    const orderCode = await this.generateOrderCode();

    const order = this.orderRepository.create({
      orderCode,
      status: 'PENDING',
      requestedBy: dto.requestedBy,
      requesterName: dto.requesterName,
      destination: dto.destination,
      warehouseId: dto.warehouseId,
      warehouseCode: dto.warehouseCode,
      latitude: dto.latitude,
      longitude: dto.longitude,
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

    return this.findOne(savedOrder.id);
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

    // Công thức Haversine tính khoảng cách giữa 2 tọa độ (km)
    const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Bán kính Trái Đất (km)
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
    const candidates = warehouses.map(wh => {
      const distance = getHaversineDistance(dto.latitude, dto.longitude, wh.latitude, wh.longitude);
      
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

  async findAll(status?: string): Promise<OutboundOrder[]> {
    const where = status ? { status } : {};
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

  // Bước 4: Nhân viên xác nhận đã lấy hàng
  async confirmPicking(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (order.status !== 'PICKING') {
      throw new BadRequestException(`Order ${order.orderCode} is not in PICKING status`);
    }

    // Mark all suggested items as picked
    for (const item of order.items) {
      if (item.status === 'SUGGESTED') {
        item.status = 'PICKED';
        await this.itemRepository.save(item);
      }
    }

    order.status = 'PACKED';
    return this.orderRepository.save(order);
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
      for (const item of order.items) {
        if (!item.lotId || item.pickedQuantity <= 0) continue;

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

    return confirmed;
  }

  async cancel(orderId: string): Promise<OutboundOrder> {
    const order = await this.findOne(orderId);
    if (order.status === 'CONFIRMED') {
      throw new BadRequestException(`Cannot cancel a confirmed order`);
    }
    order.status = 'CANCELLED';
    return this.orderRepository.save(order);
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
