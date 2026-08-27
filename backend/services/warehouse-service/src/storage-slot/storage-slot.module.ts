import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageSlot } from './storage-slot.entity';
import { StorageSlotService } from './storage-slot.service';
import { StorageSlotController } from './storage-slot.controller';
import { ShelfModule } from '../shelf/shelf.module';
import { ZoneModule } from '../zone/zone.module';

@Module({
  imports: [TypeOrmModule.forFeature([StorageSlot]), ShelfModule, ZoneModule],
  providers: [StorageSlotService],
  controllers: [StorageSlotController],
  exports: [StorageSlotService],
})
export class StorageSlotModule {}
