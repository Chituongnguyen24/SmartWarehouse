import { Controller, Get, Post, Put, Patch, Body, Param, NotFoundException, Query } from '@nestjs/common';
import { InboundOrderService } from './inbound-order.service';
import { MLDemandForecastingService } from './ml-demand-forecasting.service';

@Controller('inbound-orders')
export class InboundOrderController {
  constructor(
    private readonly inboundOrderService: InboundOrderService,
    private readonly mlDemandForecastingService: MLDemandForecastingService,
  ) {}

  // ── AI & ML DEMAND FORECASTING ENDPOINTS ──
  @Get('ai-forecast')
  async getAIForecast(
    @Query('recalculate') recalculate?: string,
    @Query('warehouseCode') warehouseCode?: string,
  ) {
    try {
      const force = recalculate === 'true';
      return await this.mlDemandForecastingService.getForecast(warehouseCode, force);
    } catch (err) {
      console.error('[InboundOrderController] Error in getAIForecast:', err);
      throw err;
    }
  }

  @Get('ai-forecast/sku/:sku')
  async getSkuForecast(
    @Param('sku') sku: string,
    @Query('warehouseCode') warehouseCode?: string,
  ) {
    const result = await this.mlDemandForecastingService.getSkuForecast(sku, warehouseCode);
    if (!result) throw new NotFoundException(`Forecast data not found for SKU: ${sku}`);
    return result;
  }

  @Post('ai-forecast/recalculate')
  async recalculateForecast(@Query('warehouseCode') warehouseCode?: string) {
    return this.mlDemandForecastingService.computeFullForecast(warehouseCode);
  }

  // ── STANDARD INBOUND ORDER ENDPOINTS ──
  @Get()
  async findAll(@Query('warehouseCode') warehouseCode: string) {
    return this.inboundOrderService.findAll(warehouseCode);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.inboundOrderService.findOne(id);
    if (!order) throw new NotFoundException('Inbound order not found');
    return order;
  }

  @Post()
  async create(@Body() createDto: any) {
    return this.inboundOrderService.create(createDto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string, qualityCheckPassed?: boolean }) {
    return this.inboundOrderService.updateStatus(id, body.status, body.qualityCheckPassed);
  }

  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() body: { receivedQuantity?: number, assignedZone?: string, assignedSlotId?: string, lotCode?: string, status?: string }
  ) {
    return this.inboundOrderService.updateItem(itemId, body);
  }
}
