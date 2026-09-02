import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboundOrder } from './inbound-order.entity';
import { InboundOrderItem } from './inbound-order-item.entity';

@Injectable()
export class InboundOrderService {
  constructor(
    @InjectRepository(InboundOrder)
    private orderRepo: Repository<InboundOrder>,
    @InjectRepository(InboundOrderItem)
    private itemRepo: Repository<InboundOrderItem>
  ) {}

  async findAll(warehouseCode?: string): Promise<InboundOrder[]> {
    const whereCondition = warehouseCode ? { warehouseCode } : {};
    return this.orderRepo.find({ where: whereCondition, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<InboundOrder> {
    return this.orderRepo.findOne({ where: { id } });
  }

  async create(createDto: any): Promise<InboundOrder> {
    const order = this.orderRepo.create({
      orderCode: createDto.orderCode || `INB-${Date.now()}`,
      supplierId: createDto.supplierId,
      supplierName: createDto.supplierName,
      invoiceNumber: createDto.invoiceNumber,
      delivererName: createDto.delivererName,
      expectedDate: createDto.expectedDate || new Date(),
      warehouseCode: createDto.warehouseCode,
      totalItems: createDto.items?.length || 0,
      totalQuantity: createDto.items?.reduce((sum: number, i: any) => sum + (i.expectedQuantity || 0), 0) || 0,
      totalAmount: createDto.items?.reduce((sum: number, i: any) => sum + ((i.expectedQuantity || 0) * (i.unitPrice || 0)), 0) || 0,
    });

    const savedOrder = await this.orderRepo.save(order);

    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map((item: any) => this.itemRepo.create({
        inboundOrder: savedOrder,
        sku: item.sku,
        productName: item.productName,
        expectedQuantity: item.expectedQuantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        expiryDate: item.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }));
      await this.itemRepo.save(items);
    }

    return this.findOne(savedOrder.id);
  }

  async updateStatus(id: string, status: string, qualityCheckPassed?: boolean): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (!order) throw new NotFoundException('Inbound order not found');

    order.status = status;
    if (qualityCheckPassed !== undefined) {
      order.qualityCheckPassed = qualityCheckPassed;
    }
    
    if (status === 'COMPLETED') {
      order.receivedDate = new Date();
    }

    return this.orderRepo.save(order);
  }

  async updateItem(itemId: string, data: Partial<InboundOrderItem>): Promise<InboundOrderItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId }, relations: ['inboundOrder'] });
    if (!item) throw new NotFoundException('Item not found');

    if (data.receivedQuantity !== undefined) item.receivedQuantity = data.receivedQuantity;
    if (data.assignedZone !== undefined) item.assignedZone = data.assignedZone;
    if (data.assignedSlotId !== undefined) item.assignedSlotId = data.assignedSlotId;
    if (data.lotCode !== undefined) item.lotCode = data.lotCode;
    if (data.status !== undefined) item.status = data.status;

    return this.itemRepo.save(item);
  }
}
