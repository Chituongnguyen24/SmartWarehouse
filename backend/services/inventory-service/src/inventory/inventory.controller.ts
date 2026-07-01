import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../../../../shared/constants/enums';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  getSuppliers() {
    return this.inventoryService.findAllSuppliers();
  }

  @Post('suppliers')
  @Roles(UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new supplier' })
  createSupplier(@Body() body: any) {
    return this.inventoryService.createSupplier(body);
  }

  @Get('lots')
  @ApiOperation({ summary: 'Get all active warehouse lots' })
  getLots() {
    return this.inventoryService.findAllLots();
  }

  @Post('lots/import')
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Import a new food lot' })
  importLot(@Body() body: any, @Request() req: any) {
    return this.inventoryService.importLot({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Post('lots/export')
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export/consume stock from a lot' })
  exportStock(@Body() body: any, @Request() req: any) {
    return this.inventoryService.exportStock({
      ...body,
      performedBy: req.user.id,
    });
  }

  @Get('fefo')
  @ApiOperation({ summary: 'Get smart FEFO extraction suggestions for a product' })
  @ApiQuery({ name: 'sku', type: String, example: 'MILK-DALAT-1L' })
  @ApiQuery({ name: 'quantity', type: Number, example: 50 })
  getFefoSuggestions(
    @Query('sku') sku: string,
    @Query('quantity') quantity: string,
  ) {
    if (!sku || !quantity) {
      throw new BadRequestException('sku and quantity parameters are required');
    }
    return this.inventoryService.getSmartFefoSuggestions(sku, parseInt(quantity));
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get audit logs of all stock movements' })
  getMovements() {
    return this.inventoryService.getMovementsReport();
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
}
