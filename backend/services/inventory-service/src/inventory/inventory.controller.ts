import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

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
