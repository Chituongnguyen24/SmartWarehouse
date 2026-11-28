import { Controller, Get, Post, Put, Patch, Body, Param, Query, Headers } from '@nestjs/common';
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

  @Post('disposal-from-rejected-inbound')
  @ApiOperation({ summary: 'Tự động tạo lệnh xuất tiêu hủy từ phiếu nhập bị từ chối QC' })
  createDisposalFromRejectedInbound(@Body() body: any) {
    return this.service.createDisposalFromRejectedInbound(body);
  }

  @Post('rtv-from-rejected-inbound')
  @ApiOperation({ summary: 'Tự động tạo lệnh xuất trả Nhà Cung Cấp (RTV) từ phiếu nhập bị từ chối QC' })
  createRtvFromRejectedInbound(@Body() body: any) {
    return this.service.createRtvFromRejectedInbound(body);
  }

  @Post('calculate-nearest')
  @ApiOperation({ summary: 'Tính toán và chọn kho hàng gần nhất dựa trên tọa độ và tồn kho' })
  calculateNearest(@Body() body: { latitude: number; longitude: number; items: any[] }) {
    return this.service.calculateNearestWarehouse(body);
  }

  @Post('sync-lot-locations')
  @ApiOperation({ summary: 'Đồng bộ lại vị trí kệ và mã lô hàng thực tế cho toàn bộ đơn hàng' })
  syncLotLocations() {
    return this.service.syncLotLocationsForAllPendingOrders();
  }

  @Post('iot/locate-shelf')
  @ApiOperation({ summary: 'IoT: Phát lệnh tìm vị trí kệ hàng (Nháy đèn & Còi)' })
  locateShelf(
    @Body() body: { warehouseCode?: string; shelfCode: string; slotCode?: string; productName?: string; qty?: number; step?: number; totalSteps?: number; orderId?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    return this.service.triggerIotLocateShelf(body, authHeader);
  }

  @Post('iot/chirp-shelf')
  @ApiOperation({ summary: 'IoT: Bóp còi Smartkey tìm kệ (như Smartkey xe máy/ô tô)' })
  chirpShelf(
    @Body() body: { warehouseCode?: string; shelfCode: string },
    @Headers('authorization') authHeader?: string,
  ) {
    return this.service.triggerIotChirpShelf(body, authHeader);
  }

  @Post('iot/complete-shelf')
  @ApiOperation({ summary: 'IoT: Hoàn tất lấy hàng tại kệ -> Tự động tắt đèn kệ' })
  completeShelf(
    @Body() body: { warehouseCode?: string; shelfCode: string; orderId?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    return this.service.triggerIotCompleteShelf(body, authHeader);
  }

  @Post('iot/stop-shelf')
  @ApiOperation({ summary: 'IoT: Tắt đèn và còi kệ (Dừng định vị / hoàn tất kiểm kê)' })
  stopShelf(
    @Body() body: { warehouseCode?: string; shelfCode: string },
    @Headers('authorization') authHeader?: string,
  ) {
    return this.service.triggerIotStopShelf(body, authHeader);
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

  @Get('locks')
  @ApiOperation({ summary: 'Lấy danh sách các đơn hàng đang bị khóa thao tác' })
  getLocks() {
    return this.service.getActiveLocks();
  }

  @Get('outbox/stats')
  @ApiOperation({ summary: 'Lấy thống kê Transactional Outbox Events (Pending, Processed, Failed)' })
  getOutboxStats() {
    return this.service.getOutboxStats();
  }

  @Post(':id/saga')
  @ApiOperation({ summary: 'Kích hoạt Distributed Saga Orchestrator cho đơn xuất kho (Reserve -> Transport -> Approve/Compensate)' })
  executeSaga(@Param('id') id: string) {
    return this.service.executeSaga(id);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Khóa đơn hàng tránh thao tác đồng thời (Concurrency Mutex Lock)' })
  lockOrder(@Param('id') id: string, @Body() body: { userId: string; userName: string; role?: string }) {
    return this.service.lockOrder(id, body);
  }

  @Post(':id/unlock')
  @ApiOperation({ summary: 'Mở khóa đơn hàng' })
  unlockOrder(@Param('id') id: string, @Body() body?: { userId?: string }) {
    return this.service.unlockOrder(id, body?.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn xuất kho' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/approve')
  @Post(':id/approve')
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
  @Post(':id/confirm-picking')
  @ApiOperation({ summary: 'Bước 4: Xác nhận đã lấy hàng -> Chuyển sang Đóng Gói (PACKED)' })
  confirmPicking(@Param('id') id: string) {
    return this.service.confirmPicking(id);
  }

  @Put(':id/confirm')
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Bước 5: Xác nhận xuất kho & Trừ tồn DB' })
  confirm(@Param('id') id: string, @Body() body?: { confirmedBy?: string }) {
    return this.service.confirm(id, body?.confirmedBy || 'Nhân viên kho');
  }

  @Put(':id/assign-driver')
  @Post(':id/assign-driver')
  @ApiOperation({ summary: 'Phân công tài xế cho đơn xuất kho / tiêu hủy' })
  assignDriver(@Param('id') id: string, @Body() body: any) {
    return this.service.assignDriver(id, body);
  }

  @Put(':id/ship')
  @ApiOperation({ summary: 'Đẩy đơn cho Shipper (SHIPPED)' })
  ship(@Param('id') id: string) {
    return this.service.ship(id);
  }

  @Post(':id/create-return-inbound')
  @ApiOperation({ summary: 'Tạo phiếu nhập hàng hoàn trong inbound-service cho đơn xuất kho' })
  async createReturnInbound(@Param('id') id: string) {
    const order = await this.service.findOne(id);
    return this.service.createReturnInboundOrder(order);
  }

  @Patch(':id/status')
  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn xuất kho' })
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.service.updateStatus(id, body?.status, body);
  }

  @Put(':id/deliver')
  @ApiOperation({ summary: 'Xác nhận giao hàng thành công (DELIVERED)' })
  deliver(@Param('id') id: string, @Body() body?: any) {
    return this.service.updateStatus(id, 'DELIVERED', body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin phiếu xuất kho' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.updateOrder(id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin phiếu xuất kho' })
  updatePut(@Param('id') id: string, @Body() body: any) {
    return this.service.updateOrder(id, body);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn xuất kho & Hoàn kho (PUT)' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn xuất kho & Hoàn kho (POST)' })
  cancelPost(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
