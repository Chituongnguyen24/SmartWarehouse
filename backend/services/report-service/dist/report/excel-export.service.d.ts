export declare class ExcelExportService {
    generateInventoryExcel(report: any): Promise<Buffer>;
    generateExpiryExcel(report: any): Promise<Buffer>;
}
