import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryOutboxEvent } from './outbox.entity';
import { InventoryOutboxService } from './outbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryOutboxEvent])],
  providers: [InventoryOutboxService],
  exports: [InventoryOutboxService, TypeOrmModule],
})
export class InventoryOutboxModule {}
