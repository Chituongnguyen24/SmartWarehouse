import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shelf } from './shelf.entity';
import { ShelfService } from './shelf.service';
import { ShelfController } from './shelf.controller';
import { ZoneModule } from '../zone/zone.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shelf]), ZoneModule],
  providers: [ShelfService],
  controllers: [ShelfController],
  exports: [ShelfService],
})
export class ShelfModule {}
