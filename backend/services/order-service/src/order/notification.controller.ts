import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrderGateway } from './order.gateway';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly orderGateway: OrderGateway) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast an event via WebSocket Gateway' })
  broadcast(@Body() body: any) {
    const eventName = body.event || body.type || 'outbound_order_created';
    const payload = body.payload || body.data || body;
    this.orderGateway.broadcastEvent(eventName, payload);
    return { success: true, event: eventName, payload };
  }
}
