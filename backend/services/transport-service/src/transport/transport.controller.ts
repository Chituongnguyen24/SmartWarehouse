import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transport')
export class TransportController {
  constructor(private transportService: TransportService) {}

  @Get('zone-suggest')
  @ApiOperation({ summary: 'Suggest warehouse placement zone and shelf location' })
  @ApiQuery({ name: 'sku', type: String, example: 'MILK-DALAT-1L' })
  suggestZone(@Query('sku') sku: string) {
    if (!sku) {
      throw new BadRequestException('sku is required');
    }
    return this.transportService.suggestZonePlacement(sku);
  }

  @Get('inbound-schedule')
  @ApiOperation({ summary: 'Get optimized dock schedule resolving time overlaps' })
  getInboundSchedule() {
    return this.transportService.getInboundSchedule();
  }

  @Post('outbound-group')
  @Roles(UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Group lots by supermarket floor section' })
  groupLots(@Body() body: any[]) {
    return this.transportService.groupOutboundLots(body);
  }

  @Post('vrp-solve')
  @Roles(UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Solve Vehicle Routing Problem (VRP) for customer multi-stop deliveries' })
  solveVrp(@Body() body: { stops: any[]; capacity?: number; drivers?: any[] }) {
    if (!body.stops || !Array.isArray(body.stops)) {
      throw new BadRequestException('stops array is required');
    }
    return this.transportService.solveVrp(body.stops, body.capacity || 200, body.drivers);
  }

  @Post('optimize-batch')
  @ApiOperation({ summary: 'Gom đơn xuất kho thành các chuyến xe (Routes)' })
  optimizeBatch(@Body() body: { orders: any[] }) {
    if (!body.orders || !Array.isArray(body.orders)) {
      throw new BadRequestException('orders array is required');
    }
    return this.transportService.optimizeBatch(body.orders);
  }

  @Post('3pl-quote')
  @ApiOperation({ summary: 'Lấy báo giá từ các đối tác 3PL (GHN, Ahamove)' })
  get3plQuote(@Body() body: { routeInfo: any }) {
    return this.transportService.get3plQuote(body.routeInfo);
  }
}
