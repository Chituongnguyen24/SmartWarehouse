import { Controller, Post, Body, Param } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Controller()
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  @Post('notifications/broadcast')
  broadcastEvent(@Body() body: { event?: string; type?: string; payload?: any; data?: any }) {
    const eventName = body.event || body.type || 'outbound_order_created';
    const payloadData = body.payload || body.data || body;

    console.log(`[HTTP BROADCAST] Emitting "${eventName}" via WebSocket Gateway:`, payloadData);

    if (this.gateway.server) {
      this.gateway.server.emit(eventName, payloadData);
      this.gateway.server.emit('all_alerts', {
        channel: eventName,
        data: payloadData,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, event: eventName, timestamp: new Date().toISOString() };
  }

  @Post('orders/sync-status/:id')
  syncOrderStatus(@Param('id') orderId: string, @Body() body: any) {
    const eventName = 'order_status_updated';
    const payload = { orderId, ...body, timestamp: new Date().toISOString() };

    console.log(`[HTTP SYNC-STATUS] Emitting "${eventName}" for order ${orderId}:`, payload);

    if (this.gateway.server) {
      this.gateway.server.emit(eventName, payload);
      this.gateway.server.emit('outbound_order_updated', payload);
    }

    return { success: true, orderId, payload };
  }
}
