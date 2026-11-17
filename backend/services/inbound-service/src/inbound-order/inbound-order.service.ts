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
    if (createDto.orderCode) {
      const existing = await this.orderRepo.findOne({
        where: { orderCode: createDto.orderCode },
        relations: ['items'],
      });
      if (existing) {
        if (createDto.packingNote) existing.packingNote = createDto.packingNote;
        if (createDto.packageCondition) existing.packageCondition = createDto.packageCondition;
        if (createDto.destinationStation) existing.destinationStation = createDto.destinationStation;
        if (createDto.status) existing.status = createDto.status;
        await this.orderRepo.save(existing);
        return this.findOne(existing.id);
      }
    }

    const order = this.orderRepo.create({
      orderCode: createDto.orderCode || `INB-${Date.now()}`,
      supplierId: createDto.supplierId || 'CUSTOMER_RETURN',
      supplierName: createDto.supplierName || 'Khách hàng trả lại',
      invoiceNumber: createDto.invoiceNumber,
      delivererName: createDto.delivererName,
      expectedDate: createDto.expectedDate || new Date(),
      warehouseCode: createDto.warehouseCode || 'WH-006',
      status: createDto.status || 'PENDING',
      destinationStation: createDto.destinationStation || 'STORAGE_SHELF',
      packingNote: createDto.packingNote || null,
      packageCondition: createDto.packageCondition || null,
      totalItems: createDto.items?.length || 0,
      totalQuantity: createDto.items?.reduce((sum: number, i: any) => sum + (Number(i.expectedQuantity) || Number(i.quantity) || 0), 0) || 0,
      totalAmount: createDto.items?.reduce((sum: number, i: any) => sum + ((Number(i.expectedQuantity) || Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0) || 0,
    });

    const savedOrder = await this.orderRepo.save(order);

    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map((item: any) => this.itemRepo.create({
        inboundOrder: savedOrder,
        sku: item.sku,
        productName: item.productName || item.sku,
        expectedQuantity: Number(item.expectedQuantity) || Number(item.quantity) || 1,
        receivedQuantity: Number(item.receivedQuantity) || 0,
        unit: item.unit || 'Cái',
        unitPrice: Number(item.unitPrice) || 0,
        status: item.status || 'PENDING',
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }));
      await this.itemRepo.save(items);
    }

    // Broadcast realtime event so Web Dashboard & Staff App update immediately
    fetch(`http://localhost:3004/orders/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'inbound_order_created',
        payload: {
          id: savedOrder.id,
          orderCode: savedOrder.orderCode,
          warehouseCode: savedOrder.warehouseCode,
          status: savedOrder.status,
          supplierName: savedOrder.supplierName,
        },
      }),
    }).catch(() => {});

    return this.findOne(savedOrder.id);
  }

  async updateStatus(
    id: string,
    status: string,
    optionsOrQcPassed?: boolean | any,
    packageCondition?: string,
    destinationStation?: string,
    packingNote?: string,
  ): Promise<InboundOrder> {
    const order = await this.findOne(id);
    if (!order) throw new NotFoundException('Inbound order not found');

    const opts = typeof optionsOrQcPassed === 'object' && optionsOrQcPassed !== null
      ? optionsOrQcPassed
      : {
          qualityCheckPassed: optionsOrQcPassed,
          packageCondition,
          destinationStation,
          packingNote,
        };

    order.status = status;
    if (opts.qualityCheckPassed !== undefined) {
      order.qualityCheckPassed = opts.qualityCheckPassed;
    }
    if (opts.packageCondition !== undefined) {
      order.packageCondition = opts.packageCondition;
    }
    if (opts.destinationStation !== undefined) {
      order.destinationStation = opts.destinationStation;
    }
    if (opts.packingNote !== undefined) {
      order.packingNote = opts.packingNote;
    }
    if (opts.rejectionReason !== undefined) {
      order.rejectionReason = opts.rejectionReason;
    }
    if (opts.rejectionLiability !== undefined) {
      order.rejectionLiability = opts.rejectionLiability;
    }
    if (opts.rejectionAction !== undefined) {
      order.rejectionAction = opts.rejectionAction;
    }
    if (opts.measuredTemperature !== undefined) {
      order.measuredTemperature = Number(opts.measuredTemperature) || null;
    }
    if (opts.evidencePhotoUrl !== undefined) {
      order.evidencePhotoUrl = opts.evidencePhotoUrl;
    }

    // XỬ LÝ KHI TỪ CHỐI NHẬP KHO DO LỖI QC
    if (status === 'REJECTED') {
      order.qualityCheckPassed = false;
      const isCustomerReturn = order.orderCode?.startsWith('RET-');
      const action = order.rejectionAction || (isCustomerReturn ? 'DISPOSAL' : 'RETURN_TO_SUPPLIER_AT_DOCK');
      order.rejectionAction = action;

      if (action === 'RETURN_TO_SUPPLIER_AT_DOCK') {
        // Kịch bản 1: Không hạ tải, xe NCC chở về ngay tại Cửa Dock
        order.destinationStation = 'DOCK_RETURN';
        if (order.items && order.items.length > 0) {
          for (const it of order.items) {
            it.assignedZone = 'DOCK_RETURN';
            it.assignedSlotId = 'DOCK_RETURN';
            it.status = 'REJECTED';
            await this.itemRepo.save(it);
          }
        }
        console.log(`[InboundService] Order ${order.orderCode} rejected at dock: Supplier truck returned immediately.`);
      } else if (action === 'QUARANTINE_FOR_RTV') {
        // Kịch bản 2: Hạ tải vào Kệ Cách Ly Q1, tạo Lệnh Xuất Trả Nhà Cung Cấp (Return to Vendor - RTV)
        order.destinationStation = 'QUARANTINE_SHELF';
        if (order.items && order.items.length > 0) {
          for (const it of order.items) {
            it.assignedZone = 'Z-QUARANTINE';
            it.assignedSlotId = 'QUARANTINE_SHELF';
            it.status = 'QUARANTINE';
            await this.itemRepo.save(it);
          }
        }

        try {
          const rtvRes = await fetch('http://localhost:3007/outbound-orders/rtv-from-rejected-inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inboundOrderId: order.id,
              orderCode: order.orderCode,
              invoiceNumber: order.invoiceNumber,
              supplierName: order.supplierName,
              warehouseCode: order.warehouseCode || 'WH-006',
              rejectionReason: order.rejectionReason,
              rejectionLiability: order.rejectionLiability || 'SUPPLIER',
              measuredTemperature: order.measuredTemperature,
              packingNote: order.packingNote,
              items: (order.items || []).map(it => ({
                sku: it.sku,
                productName: it.productName,
                requestedQuantity: it.expectedQuantity || 1,
              })),
            }),
          });
          if (rtvRes.ok) {
            const rtvData = await rtvRes.json();
            order.disposalOrderCode = rtvData.orderCode;
          }
        } catch (e) {
          console.warn('[InboundService] Failed to trigger RTV outbound order:', e);
        }
      } else {
        // Kịch bản 3: Hàng hoàn từ khách hỏng QC -> Tiêu hủy Đa Phước (DISP-...)
        order.destinationStation = 'QUARANTINE_SHELF';
        if (order.items && order.items.length > 0) {
          for (const it of order.items) {
            it.assignedZone = 'Z-DISPOSAL';
            it.assignedSlotId = 'QUARANTINE_SHELF';
            it.status = 'REJECTED';
            await this.itemRepo.save(it);
          }
        }

        try {
          const disposalRes = await fetch('http://localhost:3007/outbound-orders/disposal-from-rejected-inbound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inboundOrderId: order.id,
              orderCode: order.orderCode,
              invoiceNumber: order.invoiceNumber,
              supplierName: order.supplierName,
              warehouseCode: order.warehouseCode || 'WH-006',
              rejectionReason: order.rejectionReason,
              rejectionLiability: order.rejectionLiability,
              measuredTemperature: order.measuredTemperature,
              packingNote: order.packingNote,
              items: (order.items || []).map(it => ({
                sku: it.sku,
                productName: it.productName,
                requestedQuantity: it.expectedQuantity || 1,
              })),
            }),
          });
          if (disposalRes.ok) {
            const dispData = await disposalRes.json();
            order.disposalOrderCode = dispData.orderCode;
          }
        } catch (e) {
          console.warn('[InboundService] Failed to trigger disposal outbound order:', e);
        }
      }

      // Broadcast sự cố từ chối QC đến Control Tower và Staff App
      fetch(`http://localhost:3004/orders/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'inbound_order_rejected',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: 'REJECTED',
            rejectionReason: order.rejectionReason,
            rejectionLiability: order.rejectionLiability,
            rejectionAction: order.rejectionAction,
            disposalOrderCode: order.disposalOrderCode,
            warehouseCode: order.warehouseCode,
          },
        }),
      }).catch(() => {});
    }

    const isTransfer = order.orderCode && (order.orderCode.startsWith('TRF-IMP-') || order.orderCode.includes('TRF'));
    if (isTransfer) {
      order.destinationStation = 'PACKING_STATION';
      if (order.items && order.items.length > 0) {
        for (const it of order.items) {
          it.assignedSlotId = 'PACKING_STATION';
          it.assignedZone = 'Z-PACKING';
          it.status = status === 'COMPLETED' || status === 'STORED' ? 'TRANSFERRED_TO_PACKING' : it.status;
          await this.itemRepo.save(it);
        }
      }
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

          // Chỉ khi TẤT CẢ các chân điều chuyển đã nhập về kho:
          if (pendingSisterTransfers.length === 0) {
            // 1. Sync order-service: Chuyển sang PACKING (Đang đóng gói tại trạm phân phối)
            await fetch(`http://localhost:3004/orders/sync-status/${cleanId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'PACKING',
                forcePicking: true,
                packageCondition: order.packageCondition,
                packingNote: order.packingNote,
              }),
            }).catch(() => {});

            // 2. Sync outbound-service: Chuyển đơn ECOMM sang PACKING
            await fetch(`http://localhost:3007/outbound-orders/ECOMM-${cleanId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'PACKING',
                packageCondition: order.packageCondition,
                packingNote: order.packingNote,
              }),
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
                  packageCondition: order.packageCondition,
                  packingNote: order.packingNote,
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
