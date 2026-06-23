import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
import { OutboundOrderService } from './outbound-order.service';
import { OutboundOrderController } from './outbound-order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundOrder, OutboundOrderItem])],
  providers: [OutboundOrderService],
  controllers: [OutboundOrderController],
  exports: [OutboundOrderService],
})
export class OutboundOrderModule {}
