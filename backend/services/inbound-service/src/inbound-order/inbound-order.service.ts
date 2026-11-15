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
    
    if (status === 'COMPLETED' || status === 'STORED') {
      order.receivedDate = new Date();

      // Nếu đây là phiếu nhập điều chuyển liên kho TRF-IMP-: Tự động kích hoạt đơn hàng TMĐT sang khâu đóng gói khi đủ hàng
      if (order.orderCode && order.orderCode.startsWith('TRF-IMP-')) {
        const cleanId = order.orderCode.replace(/^TRF-IMP-/, '').split('-')[0];
        try {
          // Kiểm tra xem đơn hàng này còn phiếu nhập điều chuyển nào khác chưa hoàn tất không
          const allOrders = await this.orderRepo.find();
          const pendingSisterTransfers = allOrders.filter(o => 
            o.id !== order.id &&
            o.orderCode &&
            o.orderCode.startsWith(`TRF-IMP-${cleanId}`) &&
            o.status !== 'COMPLETED' &&
            o.status !== 'STORED'
          );

          // Chỉ khi TẤT CẢ các chân điều chuyển đã nhập về kho Gò Vấp:
          if (pendingSisterTransfers.length === 0) {
            // 1. Sync order-service: Chuyển sang PACKING (Đang đóng gói tại trạm phân phối)
            await fetch(`http://localhost:3004/orders/sync-status/${cleanId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PACKING', forcePicking: true }),
            }).catch(() => {});

            // 2. Sync outbound-service: Chuyển đơn ECOMM sang PACKING
            await fetch(`http://localhost:3007/outbound-orders/ECOMM-${cleanId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PACKING' }),
            }).catch(() => {});

            // 3. Live broadcast WebSocket đến Web Dashboard & Staff App
            await fetch(`http://localhost:3004/orders/broadcast`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'order_status_updated',
                payload: {
                  id: cleanId,
                  orderCode: `ECOMM-${cleanId}`,
                  status: 'PACKING',
                  warehouseCode: order.warehouseCode || 'WH-006',
                },
              }),
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('[InboundService] Failed to notify order/outbound of transfer receipt:', e);
        }
      }
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
    if (data.expiryDate !== undefined) item.expiryDate = data.expiryDate;
    if (data.status !== undefined) item.status = data.status;

    return this.itemRepo.save(item);
  }
}
