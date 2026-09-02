import { Controller, Get, Post, Put, Body, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { ColdChainTelemetry } from '../dispatch/cold-chain-monitor.service';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(@Query('warehouseCode') warehouseCode?: string) {
    return this.orderService.findAll(warehouseCode);
  }

  @Post('auto-dispatch')
  @ApiOperation({ summary: '⚡ Tự động gom cụm đơn hàng & điều phối tối ưu theo thuật toán VRP' })
  autoDispatch(@Body('warehouseCode') warehouseCode?: string) {
    return this.orderService.autoDispatchVrp(warehouseCode || 'WH-006');
  }

  @Get('vrp-routes')
  @ApiOperation({ summary: 'Lấy các chuyến gom đơn và lộ trình chuỗi điểm dừng tối ưu VRP' })
  getVrpRoutes(@Query('warehouseCode') warehouseCode?: string) {
    return this.orderService.getBatchVrpRoutes(warehouseCode || 'WH-006');
  }

  @Post('telemetry')
  @ApiOperation({ summary: 'Tiếp nhận gói tin IoT GPS và nhiệt độ thùng xe máy từ App Tài xế' })
  receiveTelemetry(@Body() data: ColdChainTelemetry) {
    return this.orderService.processTelemetry(data);
  }

  @Get('drivers-live')
  @ApiOperation({ summary: 'Lấy vị trí GPS và nhiệt độ IoT thời gian thực của toàn bộ tài xế' })
  getLiveDrivers() {
    return this.orderService.getLiveDrivers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateStatus(id, status);
  }

  @Put('sync-status/:id')
  @ApiOperation({ summary: 'Đồng bộ trạng thái đơn hàng thời gian thực từ Driver App / Web' })
  syncStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const status = body?.status as OrderStatus;
    return this.orderService.updateStatus(id, status, body);
  }

  @Put(':id/assign-driver')
  @ApiOperation({ summary: 'Phân công / điều phối tài xế giao hàng cho đơn' })
  assignDriver(
    @Param('id') id: string,
    @Body() dto: { driverId?: string; driverName?: string; driverPhone?: string; driverPlate?: string; status?: OrderStatus },
  ) {
    return this.orderService.assignDriver(id, dto);
  }

  @Put('assign-driver/:id')
  @ApiOperation({ summary: 'Phân công / điều phối tài xế giao hàng cho đơn (prefix format)' })
  assignDriverPrefix(
    @Param('id') id: string,
    @Body() dto: { driverId?: string; driverName?: string; driverPhone?: string; driverPlate?: string; status?: OrderStatus },
  ) {
    return this.orderService.assignDriver(id, dto);
  }

  @Post(':id/report-failure')
  @ApiOperation({ summary: 'REVERSE LOGISTICS: Báo cáo giao hàng thất bại & xử lý hoàn kho' })
  reportFailure(
    @Param('id') id: string,
    @Body() dto: { reason: string; photoUrl?: string; returnToWarehouse?: boolean },
  ) {
    return this.orderService.reportFailure(id, dto);
  }

  @Post('upload-pod-image')
  @ApiOperation({ summary: 'Upload ảnh chụp POD hoặc ảnh Hàng Hoàn lên Amazon S3' })
  uploadPodImage(
    @Body() body: { imageBase64: string; orderId: string; type?: 'POD' | 'RETURN' },
  ) {
    return this.orderService.uploadPodImage(body.imageBase64, body.orderId, body.type);
  }
}
