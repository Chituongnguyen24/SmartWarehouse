import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('OrderGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitNewOrder(orderData: any) {
    if (this.server) {
      this.server.emit('new_order', orderData);
      this.server.emit('outbound_order_created', orderData);
      this.server.emit('all_alerts', { channel: 'outbound_order_created', data: orderData, timestamp: new Date().toISOString() });
      this.logger.log(`Emitted new_order & outbound_order_created event for Order ID: ${orderData.id}`);
    }
  }

  emitOrderStatusUpdated(orderData: any) {
    if (this.server) {
      this.server.emit('order_status_updated', orderData);
      this.server.emit('outbound_order_updated', orderData);
      this.server.emit('all_alerts', { channel: 'order_status_updated', data: orderData, timestamp: new Date().toISOString() });
      this.logger.log(`Emitted order_status_updated for Order ID: ${orderData.id}, Status: ${orderData.status}`);
    }
  }

  broadcastEvent(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
      this.server.emit('all_alerts', { channel: event, data: payload, timestamp: new Date().toISOString() });
      this.logger.log(`Broadcasted "${event}" event: ${JSON.stringify(payload)}`);
    }
  }
}
