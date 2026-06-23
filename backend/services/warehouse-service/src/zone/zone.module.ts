import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from './zone.entity';
import { ZoneService } from './zone.service';
import { ZoneController } from './zone.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Zone])],
  providers: [ZoneService],
  controllers: [ZoneController],
  exports: [ZoneService],
})
export class ZoneModule {}
