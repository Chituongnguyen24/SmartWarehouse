import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
export declare class OutboundOrderService implements OnModuleInit, OnModuleDestroy {
    private orderRepository;
    private itemRepository;
    private rmqConnection;
    private rmqChannel;
    constructor(orderRepository: Repository<OutboundOrder>, itemRepository: Repository<OutboundOrderItem>);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private getAuthToken;
    private generateOrderCode;
    create(dto: {
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
    }): Promise<OutboundOrder>;
    calculateNearestWarehouse(dto: {
        latitude: number;
        longitude: number;
        items: Array<{
            sku: string;
            requestedQuantity: number;
        }>;
    }): Promise<any>;
    findAll(status?: string): Promise<OutboundOrder[]>;
    findOne(id: string): Promise<OutboundOrder>;
    applyFefoSuggestions(orderId: string, suggestions: Array<{
        itemId: string;
        lotId: string;
        lotCode: string;
        slotId?: string;
        expiryDate: string;
        riskScore: number;
        priorityScore: number;
        quantity: number;
    }>): Promise<OutboundOrder>;
    confirmPicking(orderId: string): Promise<OutboundOrder>;
    confirm(orderId: string, confirmedBy: string): Promise<OutboundOrder>;
    cancel(orderId: string): Promise<OutboundOrder>;
    getStats(): Promise<any>;
}
