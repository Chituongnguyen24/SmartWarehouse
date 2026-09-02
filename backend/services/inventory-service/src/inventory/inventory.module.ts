import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from './entities/lot.entity';
import { Supplier } from './entities/supplier.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryInternalController } from './inventory-internal.controller';
import { ProductService } from '../product/product.service';
import { MLSpoilageService } from './ml-spoilage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lot, Supplier, StockMovement]),
  ],
  providers: [InventoryService, ProductService, MLSpoilageService],
  controllers: [InventoryController, InventoryInternalController],
  exports: [InventoryService, MLSpoilageService],
})
export class InventoryModule {}
