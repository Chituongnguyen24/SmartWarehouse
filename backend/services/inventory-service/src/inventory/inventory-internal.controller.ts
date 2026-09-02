import { Controller, Post, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('inventory-internal')
@Controller('internal/inventory')
export class InventoryInternalController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('reserve')
  @ApiOperation({ summary: 'Reserve inventory for an order (Internal API)' })
  async reserve(@Body() body: { items: { sku: string; quantity: number }[], warehouseId?: string }) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Items array is required');
    }
    await this.inventoryService.reserveInventory(body.items, body.warehouseId);
    return { message: 'Inventory reserved successfully' };
  }

  @Get('warehouse-stock')
  @ApiOperation({ summary: 'Get available stock grouped by warehouse (Internal API)' })
  getWarehouseStock(@Query('skus') skus: string) {
    if (!skus) {
      throw new BadRequestException('skus parameter is required (comma-separated)');
    }
    const skuList = skus.split(',').map(s => s.trim());
    return this.inventoryService.getWarehouseStock(skuList);
  }
}
