import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboundOrder } from '../outbound-order/outbound-order.entity';
import { OutboxService } from '../outbox/outbox.service';

export interface SagaExecutionResult {
  orderId: string;
  success: boolean;
  stage: string;
  errorMessage?: string;
  status: string;
}

@Injectable()
export class OutboundSagaOrchestrator {
  private readonly logger = new Logger(OutboundSagaOrchestrator.name);

  constructor(
    @InjectRepository(OutboundOrder)
    private orderRepository: Repository<OutboundOrder>,
    private outboxService: OutboxService,
  ) {}

  /**
   * Execute the Distributed Outbound Order Saga
   * Flow: PENDING -> RESERVE INVENTORY -> ASSIGN TRANSPORT ROUTE -> APPROVED
   * Failure: Trigger Compensating Transactions (Rollback)
   */
  async executeOrderSaga(orderId: string): Promise<SagaExecutionResult> {
    this.logger.log(`[SAGA ORCHESTRATOR] 🎬 Starting Saga for Outbound Order: ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      return {
        orderId,
        success: false,
        stage: 'INIT',
        errorMessage: `Order ${orderId} not found`,
        status: 'FAILED',
      };
    }

    // Stage 1: Validate Order
    if (!order.items || order.items.length === 0) {
      order.status = 'REJECTED';
      order.notes = `${order.notes || ''} [SAGA] Đơn hàng không có sản phẩm.`;
      await this.orderRepository.save(order);
      await this.outboxService.recordEvent('OUTBOUND_ORDER', order.id, 'outbound_saga_failed', {
        orderId: order.id,
        reason: 'NO_ITEMS',
      });
      return {
        orderId,
        success: false,
        stage: 'VALIDATION',
        errorMessage: 'Đơn hàng không có sản phẩm',
        status: order.status,
      };
    }

    // Stage 2: Inventory Reservation via Inventory Service
    const reservationItems = order.items.map((i) => ({
      sku: i.sku,
      quantity: i.requestedQuantity || 1,
    }));

    let isInventoryReserved = false;
    try {
      this.logger.log(`[SAGA STEP 1] 📦 Reserving stock in Inventory Service for order ${order.orderCode}...`);
      const invResponse = await fetch('http://localhost:3011/inventory/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reservationItems,
          warehouseId: order.warehouseCode || order.warehouseId,
        }),
      });

      if (!invResponse.ok) {
        const errorData = await invResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Inventory reserve failed with status ${invResponse.status}`);
      }

      isInventoryReserved = true;
      this.logger.log(`[SAGA STEP 1] ✅ Inventory reserved successfully for order ${order.orderCode}`);
    } catch (invErr) {
      // COMPENSATING TRANSACTION: Mark Order as FAILED due to insufficient stock
      this.logger.warn(`[SAGA COMPENSATE] ❌ Inventory reservation failed: ${invErr.message}. Executing rollback...`);
      order.status = 'CANCELLED';
      order.notes = `${order.notes || ''} [SAGA THẤT BẠI - HẾT TỒN KHO]: ${invErr.message}`;
      await this.orderRepository.save(order);

      await this.outboxService.recordEvent('OUTBOUND_ORDER', order.id, 'outbound_saga_failed', {
        orderId: order.id,
        orderCode: order.orderCode,
        stage: 'INVENTORY_RESERVATION',
        reason: invErr.message,
      });

      return {
        orderId,
        success: false,
        stage: 'INVENTORY_RESERVATION',
        errorMessage: invErr.message,
        status: order.status,
      };
    }

    // Stage 3: Transport & Route Optimization Pre-assignment
    try {
      this.logger.log(`[SAGA STEP 2] 🚚 Pre-assigning Transport & Route Optimization...`);
      // Call transport-service or trigger route allocation
      await this.outboxService.recordEvent('OUTBOUND_ORDER', order.id, 'transport_dispatch_requested', {
        orderId: order.id,
        orderCode: order.orderCode,
        destination: order.destination,
        warehouseCode: order.warehouseCode,
        totalQuantity: order.totalQuantity,
      });
      this.logger.log(`[SAGA STEP 2] ✅ Transport dispatch registered for order ${order.orderCode}`);
    } catch (transErr) {
      this.logger.warn(`[SAGA STEP 2] Transport registration warning: ${transErr.message}`);
    }

    // Stage 4: Saga Success - Commit Order State to APPROVED
    order.status = 'APPROVED';
    await this.orderRepository.save(order);

    // Record Saga Completion in Outbox (Guaranteed Delivery)
    await this.outboxService.recordEvent('OUTBOUND_ORDER', order.id, 'outbound_saga_completed', {
      orderId: order.id,
      orderCode: order.orderCode,
      status: 'APPROVED',
      totalItems: order.totalItems,
      totalQuantity: order.totalQuantity,
      warehouseCode: order.warehouseCode,
    });

    this.logger.log(`[SAGA ORCHESTRATOR] 🎉 SAGA COMPLETED: Order ${order.orderCode} is APPROVED and ready for picking!`);

    return {
      orderId,
      success: true,
      stage: 'COMPLETED',
      status: order.status,
    };
  }
}
