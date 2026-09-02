import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements / audit trail for accounting & loss prevention' })
  getMovements(@Query('limit') limit?: number) {
    return this.inventoryService.findMovements(limit ? Number(limit) : 100);
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  getSuppliers() {
    return this.inventoryService.findAllSuppliers();
  }

  @Post('suppliers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new supplier' })
  createSupplier(@Body() body: any) {
    return this.inventoryService.createSupplier(body);
  }

  @Get('lots')
  @ApiOperation({ summary: 'Get active warehouse lots with filtering and pagination' })
  getLots(
    @Query('warehouseCode') warehouseCode?: string,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.findAllLots({
      warehouseCode,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post('lots/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Import a new food lot' })
  importLot(@Body() body: any, @Request() req: any) {
    return this.inventoryService.importLot({
      ...body,
      createdBy: req?.user?.id || 'system-staff',
    });
  }

  @Post('lots/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export/consume stock from a lot' })
  exportStock(@Body() body: any, @Request() req: any) {
    return this.inventoryService.exportStock({
      ...body,
      performedBy: req?.user?.id || 'system-staff',
    });
  }

  @Get('fefo')
  @ApiOperation({ summary: 'Get smart FEFO extraction suggestions for a product' })
  @ApiQuery({ name: 'sku', type: String, example: 'MILK-DALAT-1L' })
  @ApiQuery({ name: 'quantity', type: Number, example: 50 })
  @ApiQuery({ name: 'warehouseId', type: String, required: false, example: 'Q12' })
  getFefoSuggestions(
    @Query('sku') sku: string,
    @Query('quantity') quantity: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    if (!sku || !quantity) {
      throw new BadRequestException('sku and quantity parameters are required');
    }
    return this.inventoryService.getSmartFefoSuggestions(sku, parseInt(quantity), warehouseId);
  }

  @Get('warehouse-stock')
  @ApiOperation({ summary: 'Get available stock of products grouped by warehouse' })
  @ApiQuery({ name: 'skus', type: String, example: 'MILK-DALAT-1L,NOODLE-HAOHAO' })
  getWarehouseStock(@Query('skus') skus: string) {
    if (!skus) {
      throw new BadRequestException('skus parameter is required (comma-separated)');
    }
    const skuList = skus.split(',').map(s => s.trim());
    return this.inventoryService.getWarehouseStock(skuList);
  }

  @Get('expiry-alert')
  @ApiOperation({ summary: 'Get expiry alert report' })
  @ApiQuery({ name: 'days', type: Number, required: false, example: 7 })
  getExpiryAlert(@Query('days') days: string) {
    const filterDays = days ? parseInt(days) : 7;
    return this.inventoryService.getExpiryAlertReport(filterDays);
  }

  @Put('lots/:id/risk')
  @Roles(UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a lot\'s risk score and status (called by AI service)' })
  updateLotRisk(
    @Param('id') id: string,
    @Body() body: { riskScore: number; status: string },
  ) {
    return this.inventoryService.updateLotRisk(id, body.riskScore, body.status as any);
  }

  @Post('lots/:id/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Adjust stock quantity of a lot after cycle count' })
  adjustLotQuantity(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.inventoryService.adjustLotQuantity({
      lotId: id,
      actualQuantity: body.actualQuantity,
      reason: body.reason,
      performedBy: req?.user?.id || 'system-mgr',
    });
  }
}
