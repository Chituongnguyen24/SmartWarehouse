import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ReportService — Tổng hợp dữ liệu từ các microservice khác
 * Gọi API của core-service, inbound-service, outbound-service để lấy data
 */
@Injectable()
export class ReportService {
  private coreServiceUrl: string;

  constructor(private config: ConfigService) {
    this.coreServiceUrl = config.get<string>('CORE_SERVICE_URL', 'http://localhost:3001');
  }

  // ─── Helper: Fetch data from core service ───
  private async fetchFromCore(path: string, token?: string): Promise<any> {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.coreServiceUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.json();
  }

  // ─── Báo cáo nhập xuất tồn ───
  async getInventorySummaryReport(token?: string): Promise<any> {
    const [products, lots, movements] = await Promise.all([
      this.fetchFromCore('/products', token),
      this.fetchFromCore('/inventory/lots', token),
      this.fetchFromCore('/inventory/movements', token),
    ]);

    const summary = products.map((product: any) => {
      const productLots = lots.filter((l: any) => l.productId === product.id);
      const totalStock = productLots.reduce((sum: number, l: any) => sum + l.remainingQty, 0);
      const productMovements = movements.filter((m: any) =>
        productLots.some((l: any) => l.id === m.lotId),
      );
      const totalIn = productMovements
        .filter((m: any) => m.movementType === 'IN')
        .reduce((sum: number, m: any) => sum + m.quantity, 0);
      const totalOut = productMovements
        .filter((m: any) => m.movementType === 'OUT')
        .reduce((sum: number, m: any) => sum + m.quantity, 0);

      return {
        sku: product.sku,
        productName: product.name,
        category: product.category,
        storageType: product.storageType,
        unit: product.unit,
        totalLots: productLots.length,
        currentStock: totalStock,
        totalImported: totalIn,
        totalExported: totalOut,
        activeLots: productLots.filter((l: any) => l.remainingQty > 0).length,
      };
    });

    return {
      reportType: 'INVENTORY_SUMMARY',
      generatedAt: new Date().toISOString(),
      totalProducts: products.length,
      totalLots: lots.length,
      data: summary,
    };
  }

  // ─── Báo cáo hàng sắp hết hạn ───
  async getExpiryReport(days: number = 7, token?: string): Promise<any> {
    const expiryAlerts = await this.fetchFromCore(`/inventory/expiry-alert?days=${days}`, token);

    return {
      reportType: 'EXPIRY_ALERT',
      generatedAt: new Date().toISOString(),
      thresholdDays: days,
      totalAlerts: expiryAlerts.length,
      data: expiryAlerts.map((lot: any) => ({
        lotCode: lot.lotCode,
        productName: lot.productName,
        sku: lot.sku,
        zone: lot.zone,
        location: lot.location,
        remainingQty: lot.remainingQty,
        expiryDate: lot.expiryDate,
        daysUntilExpiry: Math.ceil(
          (new Date(lot.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24),
        ),
        riskScore: lot.riskScore,
        status: lot.status,
      })),
    };
  }

  // ─── Báo cáo hiệu suất kho ───
  async getWarehousePerformanceReport(token?: string): Promise<any> {
    const [lots, movements] = await Promise.all([
      this.fetchFromCore('/inventory/lots', token),
      this.fetchFromCore('/inventory/movements', token),
    ]);

    const totalLots = lots.length;
    const activeLots = lots.filter((l: any) => l.remainingQty > 0).length;
    const expiredLots = lots.filter((l: any) => new Date(l.expiryDate) < new Date()).length;
    const atRiskLots = lots.filter((l: any) => l.status === 'AT_RISK').length;

    const totalIn = movements
      .filter((m: any) => m.movementType === 'IN')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);
    const totalOut = movements
      .filter((m: any) => m.movementType === 'OUT')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const spoilageRate = totalLots > 0 ? ((expiredLots + atRiskLots) / totalLots) * 100 : 0;

    return {
      reportType: 'WAREHOUSE_PERFORMANCE',
      generatedAt: new Date().toISOString(),
      metrics: {
        totalLots,
        activeLots,
        expiredLots,
        atRiskLots,
        totalImported: totalIn,
        totalExported: totalOut,
        turnoverRate: totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '0%',
        spoilageRate: spoilageRate.toFixed(1) + '%',
        wasteReduction: (100 - spoilageRate).toFixed(1) + '%',
      },
      zoneBreakdown: {
        COLD: {
          lots: lots.filter((l: any) => l.zone === 'COLD').length,
          stock: lots.filter((l: any) => l.zone === 'COLD').reduce((s: number, l: any) => s + l.remainingQty, 0),
        },
        FROZEN: {
          lots: lots.filter((l: any) => l.zone === 'FROZEN').length,
          stock: lots.filter((l: any) => l.zone === 'FROZEN').reduce((s: number, l: any) => s + l.remainingQty, 0),
        },
        DRY: {
          lots: lots.filter((l: any) => l.zone === 'DRY').length,
          stock: lots.filter((l: any) => l.zone === 'DRY').reduce((s: number, l: any) => s + l.remainingQty, 0),
        },
      },
    };
  }
}
