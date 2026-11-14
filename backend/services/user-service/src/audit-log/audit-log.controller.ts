import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { AuditSeverity } from './audit-log.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get summary statistics of audit logs for KPI cards' })
  getStats() {
    return this.auditLogService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get details of a single audit log by ID' })
  findById(@Param('id') id: string) {
    return this.auditLogService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get all audit logs with multi-parameter filters (Admin & Manager)' })
  @ApiQuery({ name: 'severity', required: false, enum: AuditSeverity })
  @ApiQuery({ name: 'serviceName', required: false, type: String })
  @ApiQuery({ name: 'clientApp', required: false, type: String })
  @ApiQuery({ name: 'actorRole', required: false, type: String })
  @ApiQuery({ name: 'actionCode', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('severity') severity?: AuditSeverity,
    @Query('serviceName') serviceName?: string,
    @Query('clientApp') clientApp?: string,
    @Query('actorRole') actorRole?: string,
    @Query('actionCode') actionCode?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogService.findAll({
      severity,
      serviceName,
      clientApp,
      actorRole,
      actionCode,
      search,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new audit log entry (internal / cross-service use)' })
  create(@Body() body: any) {
    return this.auditLogService.create(body);
  }
}
