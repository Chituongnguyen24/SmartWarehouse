import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  // ─── Xuất báo cáo tồn kho dạng Excel ───
  async generateInventoryExcel(report: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FreshKeep SFWMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo cáo tồn kho', {
      headerFooter: {
        firstHeader: 'FreshKeep - Báo cáo nhập xuất tồn kho',
      },
    });

    // Title
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO NHẬP XUẤT TỒN KHO';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF16A34A' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = `Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Headers
    const headerRow = sheet.addRow([
      'STT', 'Mã SKU', 'Sản phẩm', 'Nhóm hàng', 'Khu bảo quản',
      'Đơn vị', 'Số lô', 'Tồn kho', 'Tổng nhập', 'Tổng xuất',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    report.data?.forEach((item: any, index: number) => {
      const row = sheet.addRow([
        index + 1,
        item.sku,
        item.productName,
        item.category,
        item.storageType,
        item.unit,
        item.totalLots,
        item.currentStock,
        item.totalImported,
        item.totalExported,
      ]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-fit columns
    sheet.columns.forEach((col) => {
      col.width = 18;
    });
    sheet.getColumn(1).width = 6;
    sheet.getColumn(3).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Xuất báo cáo hàng sắp hết hạn ───
  async generateExpiryExcel(report: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FreshKeep SFWMS';

    const sheet = workbook.addWorksheet('Hàng sắp hết hạn');

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'BÁO CÁO HÀNG SẮP HẾT HẠN SỬ DỤNG';
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFDC2626' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:I2');
    sheet.getCell('A2').value = `Ngưỡng: ${report.thresholdDays} ngày | Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    const headerRow = sheet.addRow([
      'STT', 'Mã lô', 'Sản phẩm', 'SKU', 'Khu',
      'Vị trí', 'Tồn', 'HSD', 'Còn (ngày)',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    report.data?.forEach((item: any, index: number) => {
      const row = sheet.addRow([
        index + 1,
        item.lotCode,
        item.productName,
        item.sku,
        item.zone,
        item.location,
        item.remainingQty,
        new Date(item.expiryDate).toLocaleDateString('vi-VN'),
        item.daysUntilExpiry,
      ]);

      // Highlight critical rows
      if (item.daysUntilExpiry <= 2) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    sheet.columns.forEach((col) => { col.width = 16; });
    sheet.getColumn(1).width = 6;
    sheet.getColumn(3).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
