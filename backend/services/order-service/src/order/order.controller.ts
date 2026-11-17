import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Patch,
  Query,
  Res,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { OrderGateway } from './order.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { ColdChainTelemetry } from '../dispatch/cold-chain-monitor.service';

function verifyJwtPayload(authHeader?: string): any {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  const secret = process.env.JWT_SECRET || 'ee20b6d5a12b988c1be1ee0d5b7931dd513080f001986f20eeab2df633a8ca5f';

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (signatureB64 !== expectedSig) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
  ) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Phát sóng sự kiện WebSocket qua Gateway (realtime)' })
  broadcast(@Body() body: any) {
    const eventName = body.event || body.type || 'outbound_order_created';
    const payload = body.payload || body.data || body;
    this.orderGateway.broadcastEvent(eventName, payload);
    return { success: true, event: eventName, payload };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng an toàn cho khách hàng (Anti-IDOR / Bảo mật dữ liệu cá nhân)' })
  getMyOrders(
    @Headers('authorization') authHeader?: string,
    @Query('customerId') customerId?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    const user = verifyJwtPayload(authHeader);
    if (!user) {
      throw new UnauthorizedException('Yêu cầu xác thực tài khoản để truy cập lịch sử đơn hàng cá nhân.');
    }

    const staffRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'DISPATCHER', 'SUPER_ADMIN'];
    // Nếu là nhân sự quản lý / điều phối / thủ kho, cho phép tra cứu theo query
    if (user.role && staffRoles.includes(user.role)) {
      return this.orderService.findCustomerOrders(customerId, customerPhone);
    }

    // Nếu là CUSTOMER, CHỈ cho phép lấy đơn thuộc về chính tài khoản đang đăng nhập
    const effectiveCustomerId = user.sub || user.id;
    const effectivePhone = user.phone;
    return this.orderService.findCustomerOrders(effectiveCustomerId, effectivePhone);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(
    @Headers('authorization') authHeader?: string,
    @Query('warehouseCode') warehouseCode?: string,
    @Query('customerId') customerId?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    if (customerId || customerPhone) {
      const user = verifyJwtPayload(authHeader);
      const staffRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'DISPATCHER', 'SUPER_ADMIN'];
      if (user && !staffRoles.includes(user.role)) {
        // Tài khoản khách hàng thông thường không được xem đơn của người khác
        const effectiveCustomerId = user.sub || user.id;
        const effectivePhone = user.phone;
        return this.orderService.findCustomerOrders(effectiveCustomerId, effectivePhone);
      }
      return this.orderService.findCustomerOrders(customerId, customerPhone);
    }
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

  @Get('driver-cod/summary')
  @ApiOperation({ summary: 'Thống kê đối soát tiền COD theo session ca làm việc của tài xế' })
  getDriverCodSummary(
    @Query('driverId') driverId: string,
    @Query('date') date?: string,
  ) {
    return this.orderService.getDriverCodSummary(driverId, date);
  }

  @Get('cod-reconciliation')
  @ApiOperation({ summary: 'Báo cáo thống kê đối soát COD toàn diện cho nhân viên/kế toán' })
  getCodReconciliationReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('warehouseCode') warehouseCode?: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: string,
  ) {
    return this.orderService.getCodReconciliationReport({
      startDate,
      endDate,
      warehouseCode,
      driverId,
      status,
    });
  }

  @Post('driver-cod/settle')
  @ApiOperation({ summary: 'Bàn giao và nộp tiền COD ca làm việc của tài xế vào database' })
  settleDriverCod(
    @Body() dto: {
      driverId: string;
      driverName?: string;
      warehouseCode?: string;
      shiftDate?: string;
      amount: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    return this.orderService.settleDriverCod(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const order = await this.orderService.findOne(id);
    if (!order) return null;

    const user = verifyJwtPayload(authHeader);
    const staffRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'DISPATCHER', 'SUPER_ADMIN'];
    if (user && !staffRoles.includes(user.role)) {
      const isOwner =
        (user.sub && order.customerId === user.sub) ||
        (user.phone && order.customerPhone === user.phone);
      if (!isOwner) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu đơn hàng này.');
      }
    }
    return order;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateStatus(id, status);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng đàng hoàng & đồng bộ tồn kho giữa khách hàng và bộ phận kho' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string; cancelledBy?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    const user = verifyJwtPayload(authHeader);
    const staffRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'DISPATCHER', 'SUPER_ADMIN'];
    if (user && !staffRoles.includes(user.role)) {
      const order = await this.orderService.findOne(id);
      if (order) {
        const isOwner =
          (user.sub && order.customerId === user.sub) ||
          (user.phone && order.customerPhone === user.phone);
        if (!isOwner) {
          throw new ForbiddenException('Bạn không có quyền hủy đơn hàng của người khác.');
        }
      }
    }
    return this.orderService.cancelOrder(id, body);
  }

  @Put('sync-status/:id')
  @ApiOperation({ summary: 'Đồng bộ trạng thái đơn hàng thời gian thực từ Driver App / Web' })
  syncStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const status = body?.status as OrderStatus;
    if (status === OrderStatus.CANCELLED) {
      return this.orderService.cancelOrder(id, body);
    }
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

  @Get('pod-photo/:folder/:filename')
  @ApiOperation({ summary: 'Xem hoặc tải ảnh chụp bàn giao POD theo thư mục' })
  getPodPhotoByFolder(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.orderService.streamPodPhoto(`${folder}/${filename}`, res);
  }

  @Get('pod-photo/:filename')
  @ApiOperation({ summary: 'Xem hoặc tải ảnh chụp bàn giao POD' })
  getPodPhoto(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.orderService.streamPodPhoto(filename, res);
  }
}
