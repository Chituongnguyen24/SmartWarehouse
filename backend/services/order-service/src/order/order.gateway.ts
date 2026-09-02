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
      this.logger.log(`Emitted new_order event for Order ID: ${orderData.id}`);
    }
  }

  emitOrderStatusUpdated(orderData: any) {
    if (this.server) {
      this.server.emit('order_status_updated', orderData);
      this.logger.log(`Emitted order_status_updated for Order ID: ${orderData.id}, Status: ${orderData.status}`);
    }
  }
}
