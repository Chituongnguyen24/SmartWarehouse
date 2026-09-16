import { Controller, Get, Query, Res, Header, Req } from '@nestjs/common';
import { ReportService } from './report.service';
import { ExcelExportService } from './excel-export.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response, Request } from 'express';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(
    private reportService: ReportService,
    private excelService: ExcelExportService,
  ) {}

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }

  @Get('inventory-summary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp nhập xuất tồn kho' })
  getInventorySummary(@Req() req: Request) {
    return this.reportService.getInventorySummaryReport(this.extractToken(req));
  }

  @Get('expiry-alert')
  @ApiOperation({ summary: 'Báo cáo hàng sắp hết hạn' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  getExpiryAlert(@Query('days') days?: string, @Req() req?: Request) {
    return this.reportService.getExpiryReport(days ? parseInt(days) : 7, req ? this.extractToken(req) : undefined);
  }

  @Get('warehouse-performance')
  @ApiOperation({ summary: 'Báo cáo hiệu suất kho' })
  getPerformance(@Req() req: Request) {
    return this.reportService.getWarehousePerformanceReport(this.extractToken(req));
  }

  @Get('export/inventory-excel')
  @ApiOperation({ summary: 'Xuất báo cáo tồn kho dạng Excel' })
  async exportInventoryExcel(@Res() res: Response, @Req() req: Request) {
    const report = await this.reportService.getInventorySummaryReport(this.extractToken(req));
    const buffer = await this.excelService.generateInventoryExcel(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventory_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  }

  @Get('export/expiry-excel')
  @ApiOperation({ summary: 'Xuất báo cáo hàng sắp hết hạn dạng Excel' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  async exportExpiryExcel(@Query('days') days: string, @Res() res: Response, @Req() req: Request) {
    const report = await this.reportService.getExpiryReport(days ? parseInt(days) : 7, this.extractToken(req));
    const buffer = await this.excelService.generateExpiryExcel(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expiry_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  }
}
