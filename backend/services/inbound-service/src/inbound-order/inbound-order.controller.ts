import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { InboundOrderService } from './inbound-order.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('inbound-orders')
@Controller('inbound-orders')
export class InboundOrderController {
  constructor(private service: InboundOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đơn nhập kho mới' })
  create(@Body() body: any) {
    return this.service.create({ ...body, createdBy: body.createdBy || 'system' });
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn nhập kho' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê đơn nhập kho' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn nhập kho' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/receive')
  @ApiOperation({ summary: 'Bước 2: Bắt đầu tiếp nhận hàng' })
  startReceiving(@Param('id') id: string) {
    return this.service.startReceiving(id);
  }

  @Put('items/:itemId/quantity')
  @ApiOperation({ summary: 'Cập nhật số lượng thực nhận' })
  updateQuantity(@Param('itemId') itemId: string, @Body() body: { receivedQuantity: number }) {
    return this.service.updateReceivedQuantity(itemId, body.receivedQuantity);
  }

  @Put(':id/quality-check')
  @ApiOperation({ summary: 'Bước 3: Chuyển sang kiểm tra chất lượng' })
  startQualityCheck(@Param('id') id: string) {
    return this.service.startQualityCheck(id);
  }

  @Put(':id/store')
  @ApiOperation({ summary: 'Bước 4: Hoàn tất QC, bắt đầu lưu kho' })
  startStoring(@Param('id') id: string, @Body() body: { qualityPassed: boolean }) {
    return this.service.startStoring(id, body.qualityPassed);
  }

  @Put('items/:itemId/assign')
  @ApiOperation({ summary: 'Bước 5: Gán zone/slot/lotCode cho item' })
  assignStorage(@Param('itemId') itemId: string, @Body() body: any) {
    return this.service.assignStorage(itemId, body);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Bước 6: Hoàn tất đơn nhập kho' })
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }
}
