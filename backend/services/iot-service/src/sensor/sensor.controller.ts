import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../auth';

@ApiTags('sensor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF)
@Controller('sensor')
export class SensorController {
  constructor(private sensorService: SensorService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get history of temperature and humidity readings' })
  @ApiQuery({ name: 'zoneId', required: false, type: String, example: 'COLD' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  getHistory(
    @Query('zoneId') zoneId?: string,
    @Query('limit') limit?: string,
  ) {
    const parseLimit = limit ? parseInt(limit) : 50;
    return this.sensorService.getHistory(zoneId, parseLimit);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Get current active temperature/humidity zone violations' })
  getActiveViolations() {
    return this.sensorService.getActiveViolations();
  }
}
