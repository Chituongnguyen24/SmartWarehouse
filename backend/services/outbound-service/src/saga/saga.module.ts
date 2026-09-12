import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundOrder } from '../outbound-order/outbound-order.entity';
import { OutboundSagaOrchestrator } from './outbound-saga.orchestrator';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboundOrder]),
    OutboxModule,
  ],
  providers: [OutboundSagaOrchestrator],
  exports: [OutboundSagaOrchestrator],
})
export class SagaModule {}
