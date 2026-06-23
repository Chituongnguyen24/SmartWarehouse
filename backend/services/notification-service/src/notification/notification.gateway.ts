import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private redisSub: Redis;

  constructor() {
    this.redisSub = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
    
    // Subscribe to all event channels
    const channels = ['sensor_anomaly', 'spoilage_risk_high', 'low_stock', 'stock_depleted', 'lot_imported'];
    this.redisSub.subscribe(...channels);

    this.redisSub.on('message', (channel, message) => {
      console.log(`[WS GATEWAY] Broadcasting event from channel "${channel}": ${message}`);
      try {
        const parsed = JSON.parse(message);
        // Emit to all connected clients
        this.server.emit(channel, parsed);
        this.server.emit('all_alerts', { channel, data: parsed, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error('[WS GATEWAY] Failed to broadcast event:', err);
      }
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connection_status', { connected: true, clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
