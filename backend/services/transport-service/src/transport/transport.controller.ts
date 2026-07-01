import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../../../../shared/constants/enums';
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
  solveVrp(@Body() body: { stops: any[]; capacity?: number }) {
    if (!body.stops || !Array.isArray(body.stops)) {
      throw new BadRequestException('stops array is required');
    }
    return this.transportService.solveVrp(body.stops, body.capacity || 200);
  }
}
