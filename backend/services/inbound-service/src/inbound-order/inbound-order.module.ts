import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundOrderController } from './inbound-order.controller';
import { InboundOrderService } from './inbound-order.service';
import { InboundOrder } from './inbound-order.entity';
import { InboundOrderItem } from './inbound-order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InboundOrder, InboundOrderItem])],
  controllers: [InboundOrderController],
  providers: [InboundOrderService],
})
export class InboundOrderModule {}
