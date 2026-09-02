import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundOrder } from './outbound-order.entity';
import { OutboundOrderItem } from './outbound-order-item.entity';
import { OutboundOrderController } from './outbound-order.controller';
import { OutboundOrderService } from './outbound-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundOrder, OutboundOrderItem])],
  controllers: [OutboundOrderController],
  providers: [OutboundOrderService],
})
export class OutboundOrderModule {}
