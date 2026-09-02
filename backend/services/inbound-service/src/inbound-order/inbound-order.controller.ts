import { Controller, Get, Post, Put, Patch, Body, Param, NotFoundException, Query } from '@nestjs/common';
import { InboundOrderService } from './inbound-order.service';

@Controller('inbound-orders')
export class InboundOrderController {
  constructor(private readonly inboundOrderService: InboundOrderService) {}

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
