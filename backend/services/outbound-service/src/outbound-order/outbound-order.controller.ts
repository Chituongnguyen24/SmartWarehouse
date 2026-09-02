import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
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

  @Post('split-create')
  @ApiOperation({ summary: 'Tạo yêu cầu xuất kho với logic chia tách (Split Order) tự động' })
  splitCreate(@Body() body: any) {
    return this.service.splitCreate(body);
  }

  @Post('calculate-nearest')
  @ApiOperation({ summary: 'Tính toán và chọn kho hàng gần nhất dựa trên tọa độ và tồn kho' })
  calculateNearest(@Body() body: { latitude: number; longitude: number; items: any[] }) {
    return this.service.calculateNearestWarehouse(body);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn xuất kho' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'warehouseCode', required: false })
  findAll(@Query('status') status?: string, @Query('warehouseCode') warehouseCode?: string) {
    return this.service.findAll(status, warehouseCode);
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

  @Put(':id/approve')
  @ApiOperation({ summary: 'Quản lý duyệt tiếp nhận đơn hàng và giao việc lấy hàng cho kho' })
  approve(@Param('id') id: string) {
    return this.service.approve(id);
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

  @Put(':id/ship')
  @ApiOperation({ summary: 'Đẩy đơn cho Shipper (SHIPPED)' })
  ship(@Param('id') id: string) {
    return this.service.ship(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn xuất kho' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }

  @Put(':id/deliver')
  @ApiOperation({ summary: 'Xác nhận giao hàng thành công (DELIVERED)' })
  deliver(@Param('id') id: string) {
    return this.service.updateStatus(id, 'DELIVERED');
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn xuất kho' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
