import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundOrder } from './inbound-order.entity';
import { InboundOrderItem } from './inbound-order-item.entity';
import { InboundOrderService } from './inbound-order.service';
import { InboundOrderController } from './inbound-order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InboundOrder, InboundOrderItem])],
  providers: [InboundOrderService],
  controllers: [InboundOrderController],
  exports: [InboundOrderService],
})
export class InboundOrderModule {}
