import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InboundOrder } from './inbound-order.entity';
import { InboundOrderItem } from './inbound-order-item.entity';
export declare class InboundOrderService implements OnModuleInit, OnModuleDestroy {
    private orderRepository;
    private itemRepository;
    private rmqConnection;
    private rmqChannel;
    constructor(orderRepository: Repository<InboundOrder>, itemRepository: Repository<InboundOrderItem>);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private getAuthToken;
    private generateOrderCode;
    create(dto: {
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
    }): Promise<InboundOrder>;
    findAll(status?: string): Promise<InboundOrder[]>;
    findOne(id: string): Promise<InboundOrder>;
    startReceiving(id: string): Promise<InboundOrder>;
    updateReceivedQuantity(itemId: string, receivedQuantity: number): Promise<InboundOrderItem>;
    startQualityCheck(id: string): Promise<InboundOrder>;
    startStoring(id: string, qualityPassed: boolean): Promise<InboundOrder>;
    assignStorage(itemId: string, dto: {
        zone: string;
        slotId: string;
        lotCode: string;
    }): Promise<InboundOrderItem>;
    complete(id: string): Promise<InboundOrder>;
    getStats(): Promise<any>;
}
