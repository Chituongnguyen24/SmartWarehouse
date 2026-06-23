import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ExcelExportService } from './excel-export.service';

@Module({
  providers: [ReportService, ExcelExportService],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule {}
