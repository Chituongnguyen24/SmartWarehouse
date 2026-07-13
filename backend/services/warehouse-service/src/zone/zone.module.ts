import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from './zone.entity';
import { ZoneService } from './zone.service';
import { ZoneController } from './zone.controller';
import { Warehouse } from '../warehouse/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Zone, Warehouse])],
  providers: [ZoneService],
  controllers: [ZoneController],
  exports: [ZoneService],
})
export class ZoneModule {}
