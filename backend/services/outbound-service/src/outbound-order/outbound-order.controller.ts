import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { OutboundOrderService } from './outbound-order.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('outbound-orders')
@Controller('outbound-orders')
export class OutboundOrderController {
  constructor(private service: OutboundOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Bước 1: Tạo yêu cầu xuất kho' })
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Post('calculate-nearest')
  @ApiOperation({ summary: 'Tính toán và chọn kho hàng gần nhất dựa trên tọa độ và tồn kho' })
  calculateNearest(@Body() body: { latitude: number; longitude: number; items: any[] }) {
    return this.service.calculateNearestWarehouse(body);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn xuất kho' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê đơn xuất kho' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn xuất kho' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/fefo-suggestions')
  @ApiOperation({ summary: 'Bước 2-3: Áp dụng gợi ý FEFO cho đơn xuất' })
  applyFefo(@Param('id') id: string, @Body() body: { suggestions: any[] }) {
    return this.service.applyFefoSuggestions(id, body.suggestions);
  }

  @Put(':id/confirm-picking')
  @ApiOperation({ summary: 'Bước 4: Xác nhận đã lấy hàng' })
  confirmPicking(@Param('id') id: string) {
    return this.service.confirmPicking(id);
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: 'Bước 5: Xác nhận xuất kho' })
  confirm(@Param('id') id: string, @Body() body: { confirmedBy: string }) {
    return this.service.confirm(id, body.confirmedBy);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn xuất kho' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
