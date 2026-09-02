import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shelf } from './shelf.entity';
import { ShelfService } from './shelf.service';
import { ZoneModule } from '../zone/zone.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shelf]),
    ZoneModule
  ],
  providers: [ShelfService],
  exports: [ShelfService]
})
export class ShelfModule {}
