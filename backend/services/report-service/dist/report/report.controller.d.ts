import { ReportService } from './report.service';
import { ExcelExportService } from './excel-export.service';
import { Response } from 'express';
export declare class ReportController {
    private reportService;
    private excelService;
    constructor(reportService: ReportService, excelService: ExcelExportService);
    getInventorySummary(): Promise<any>;
    getExpiryAlert(days?: string): Promise<any>;
    getPerformance(): Promise<any>;
    exportInventoryExcel(res: Response): Promise<void>;
    exportExpiryExcel(days: string, res: Response): Promise<void>;
}
