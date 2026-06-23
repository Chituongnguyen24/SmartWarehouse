import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboundOrder } from './inbound-order.entity';
import { InboundOrderItem } from './inbound-order-item.entity';

@Injectable()
export class InboundOrderService {
  constructor(
    @InjectRepository(InboundOrder)
    private orderRepository: Repository<InboundOrder>,
    @InjectRepository(InboundOrderItem)
    private itemRepository: Repository<InboundOrderItem>,
  ) {}

  // Generate order code: IB-YYYYMMDD-NNN
  private async generateOrderCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.orderRepository.count();
    return `IB-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  async create(dto: {
    supplierId: string;
    supplierName: string;
    expectedDate?: string;
    createdBy: string;
    items: Array<{
      sku: string;
      productName: string;
      expectedQuantity: number;
      expiryDate: string;
      productionDate?: string;
    }>;
    notes?: string;
  }): Promise<InboundOrder> {
    const orderCode = await this.generateOrderCode();

    const order = this.orderRepository.create({
      orderCode,
      supplierId: dto.supplierId,
      supplierName: dto.supplierName,
      status: 'PENDING',
      expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
      totalItems: dto.items.length,
      totalQuantity: dto.items.reduce((sum, i) => sum + i.expectedQuantity, 0),
      notes: dto.notes,
      createdBy: dto.createdBy,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    for (const item of dto.items) {
      const orderItem = this.itemRepository.create({
        inboundOrderId: savedOrder.id,
        sku: item.sku,
        productName: item.productName,
        expectedQuantity: item.expectedQuantity,
        expiryDate: new Date(item.expiryDate),
        productionDate: item.productionDate ? new Date(item.productionDate) : null,
        status: 'PENDING',
      });
      await this.itemRepository.save(orderItem);
    }

    return this.findOne(savedOrder.id);
  }

  async findAll(status?: string): Promise<InboundOrder[]> {
    const where = status ? { status } : {};
    return this.orderRepository.find({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<InboundOrder> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException(`InboundOrder ${id} not found`);
    return order;
  }

  // Bước 2: Bắt đầu tiếp nhận hàng
  async startReceiving(id: string): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Order ${order.orderCode} is not in PENDING status`);
    }
    order.status = 'RECEIVING';
    order.receivedDate = new Date();
    return this.orderRepository.save(order);
  }

  // Bước 2.5: Cập nhật số lượng thực nhận cho từng item
  async updateReceivedQuantity(itemId: string, receivedQuantity: number): Promise<InboundOrderItem> {
    const item = await this.itemRepository.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    item.receivedQuantity = receivedQuantity;
    return this.itemRepository.save(item);
  }

  // Bước 3: Chuyển sang kiểm tra chất lượng
  async startQualityCheck(id: string): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (order.status !== 'RECEIVING') {
      throw new BadRequestException(`Order ${order.orderCode} is not in RECEIVING status`);
    }
    order.status = 'QUALITY_CHECK';
    return this.orderRepository.save(order);
  }

  // Bước 4: Hoàn tất kiểm tra, bắt đầu lưu kho
  async startStoring(id: string, qualityPassed: boolean): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (order.status !== 'QUALITY_CHECK') {
      throw new BadRequestException(`Order ${order.orderCode} is not in QUALITY_CHECK status`);
    }

    order.qualityCheckPassed = qualityPassed;

    if (!qualityPassed) {
      order.status = 'REJECTED';
      // Mark all items as rejected
      for (const item of order.items) {
        item.status = 'REJECTED';
        await this.itemRepository.save(item);
      }
    } else {
      order.status = 'STORING';
      // Mark all items as checked
      for (const item of order.items) {
        item.status = 'CHECKED';
        await this.itemRepository.save(item);
      }
    }

    return this.orderRepository.save(order);
  }

  // Bước 5: Gán zone và slot cho từng item
  async assignStorage(itemId: string, dto: { zone: string; slotId: string; lotCode: string }): Promise<InboundOrderItem> {
    const item = await this.itemRepository.findOneBy({ id: itemId });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);

    item.assignedZone = dto.zone;
    item.assignedSlotId = dto.slotId;
    item.lotCode = dto.lotCode;
    item.status = 'STORED';

    return this.itemRepository.save(item);
  }

  // Bước 6: Hoàn tất đơn nhập kho
  async complete(id: string): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (order.status !== 'STORING') {
      throw new BadRequestException(`Order ${order.orderCode} is not in STORING status`);
    }

    // Verify all items are stored
    const unstored = order.items.filter((i) => i.status !== 'STORED' && i.status !== 'REJECTED');
    if (unstored.length > 0) {
      throw new BadRequestException(`${unstored.length} items are not yet stored`);
    }

    order.status = 'COMPLETED';
    const completed = await this.orderRepository.save(order);

    // TODO: Publish inbound.completed event to RabbitMQ
    console.log(`[INBOUND] Order ${order.orderCode} COMPLETED. Publishing event...`);

    return completed;
  }

  // Dashboard stats
  async getStats(): Promise<any> {
    const total = await this.orderRepository.count();
    const pending = await this.orderRepository.countBy({ status: 'PENDING' });
    const receiving = await this.orderRepository.countBy({ status: 'RECEIVING' });
    const qualityCheck = await this.orderRepository.countBy({ status: 'QUALITY_CHECK' });
    const storing = await this.orderRepository.countBy({ status: 'STORING' });
    const completed = await this.orderRepository.countBy({ status: 'COMPLETED' });
    const rejected = await this.orderRepository.countBy({ status: 'REJECTED' });

    return { total, pending, receiving, qualityCheck, storing, completed, rejected };
  }
}
