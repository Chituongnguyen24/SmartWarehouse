import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from './entities/lot.entity';
import { Supplier } from './entities/supplier.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lot, Supplier, StockMovement]),
  ],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
