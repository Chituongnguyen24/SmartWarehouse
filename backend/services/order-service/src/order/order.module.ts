import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { NotificationController } from './notification.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CodSettlement } from './entities/cod-settlement.entity';
import { OrderGateway } from './order.gateway';
import { SmartRoutingService } from '../dispatch/smart-routing.service';
import { VrpBatchingService } from '../dispatch/vrp-batching.service';
import { ColdChainMonitorService } from '../dispatch/cold-chain-monitor.service';
import { ThirdPartyDispatcherService } from '../dispatch/third-party-dispatcher.service';

import { S3StorageService } from '../storage/s3-storage.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, CodSettlement]), ChatModule],
  controllers: [OrderController, NotificationController],
  providers: [
    OrderService,
    OrderGateway,
    SmartRoutingService,
    VrpBatchingService,
    ColdChainMonitorService,
    ThirdPartyDispatcherService,
    S3StorageService,
  ],
  exports: [
    OrderService,
    SmartRoutingService,
    VrpBatchingService,
    ColdChainMonitorService,
    ThirdPartyDispatcherService,
    S3StorageService,
  ],
})
export class OrderModule {}
