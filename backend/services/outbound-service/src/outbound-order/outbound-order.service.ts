import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';

@Injectable()
export class OutboundOrderService {
  constructor(
    @InjectRepository(OutboundOrder)
    private orderRepository: Repository<OutboundOrder>,
    @InjectRepository(OutboundOrderItem)
    private itemRepository: Repository<OutboundOrderItem>,
  ) {}

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

    // TODO: Publish outbound.confirmed event to RabbitMQ
    // TODO: Call inventory service to deduct stock
    console.log(`[OUTBOUND] Order ${order.orderCode} CONFIRMED. Publishing event...`);

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
