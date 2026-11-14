import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditSeverity } from './audit-log.entity';

@Injectable()
export class AuditLogService implements OnModuleInit {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async onModuleInit() {
    const count = await this.auditLogRepository.count();
    if (count <= 10) {
      // Seed rich enterprise operational audit logs
      const now = new Date();
      const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);
      const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
      const daysAgo = (d: number) => new Date(now.getTime() - d * 86400 * 1000);

      const richLogs: Partial<AuditLog>[] = [
        {
          timestamp: minutesAgo(5),
          actorName: 'Nguyễn Chi Tường (Admin)',
          actorRole: 'ADMIN',
          clientApp: 'WEB_DASHBOARD',
          serviceName: 'user-service',
          action: 'Đăng nhập hệ thống quản trị thành công',
          actionCode: 'AUTH_LOGIN_SUCCESS',
          target: 'users',
          targetId: 'admin@sfwms.vn',
          ipAddress: '192.168.1.100',
          severity: AuditSeverity.INFO,
          details: 'Xác thực tài khoản Quản trị viên cấp cao qua phiên JWT an toàn.',
          payloadAfter: { role: 'ADMIN', loginMethod: 'PASSWORD_HASH' },
        },
        {
          timestamp: minutesAgo(18),
          actorName: 'Trần Văn Mạnh (Thủ kho)',
          actorRole: 'WAREHOUSE_STAFF',
          clientApp: 'STAFF_APP',
          serviceName: 'inventory-service',
          action: 'Phát hiện chênh lệch kiểm kê lô cá hồi Na Uy',
          actionCode: 'INVENTORY_AUDIT_DIFF',
          target: 'lots',
          targetId: 'LOT-SALMON-202611-01',
          ipAddress: '192.168.1.42',
          severity: AuditSeverity.WARN,
          details: 'Kiểm kê định kỳ phát hiện hụt 3 đơn vị so với sổ sách tồn kho hệ thống.',
          payloadBefore: { lotCode: 'LOT-SALMON-202611-01', remainingQty: 50 },
          payloadAfter: { actualQty: 47, difference: -3, reason: 'Rách bao bì chân không khi luân chuyển kệ mát' },
        },
        {
          timestamp: minutesAgo(35),
          actorName: 'Cảm Biến IoT Zone Cold-A',
          actorRole: 'SYSTEM',
          clientApp: 'IOT_GATEWAY',
          serviceName: 'iot-service',
          action: 'Cảnh báo nhiệt độ kho đông vượt ngưỡng an toàn',
          actionCode: 'IOT_TEMPERATURE_ALERT',
          target: 'iot_sensors',
          targetId: 'SENSOR-FREEZER-03',
          ipAddress: '10.0.1.25',
          severity: AuditSeverity.CRITICAL,
          details: 'Nhiệt độ đo được: -12.4°C, vượt ngưỡng an toàn tối đa cho phép (-18.0°C). Tự động kích hoạt quạt tăng áp.',
          payloadBefore: { targetTemp: -18.0, currentTemp: -12.4, thresholdMax: -15.0 },
          payloadAfter: { alertState: 'TRIGGERED', alertSentTo: ['manager@sfwms.vn', 'admin@sfwms.vn'] },
        },
        {
          timestamp: hoursAgo(1),
          actorName: 'Lê Hoàng Nam (Quản lý kho)',
          actorRole: 'WAREHOUSE_MANAGER',
          clientApp: 'WEB_DASHBOARD',
          serviceName: 'inbound-service',
          action: 'Phê duyệt phiếu nhập kho từ Dalat Organic Farms',
          actionCode: 'INBOUND_ORDER_APPROVED',
          target: 'inbound_orders',
          targetId: 'PNK-20261114-001',
          ipAddress: '192.168.1.15',
          severity: AuditSeverity.INFO,
          details: 'Phê duyệt tiếp nhận 320 kg rau củ quả hữu cơ, xe lạnh 4°C, hóa đơn số HD-1379.',
          payloadAfter: { orderCode: 'PNK-20261114-001', supplierCode: 'SUP-001', totalItems: 3, totalQuantity: 320, status: 'RECEIVING' },
        },
        {
          timestamp: hoursAgo(2),
          actorName: 'Nguyễn Văn Hùng (Tài xế)',
          actorRole: 'DRIVER',
          clientApp: 'DRIVER_APP',
          serviceName: 'transport-service',
          action: 'Hoàn tất giao hàng & Thu hộ COD đơn hàng B2B WinMart',
          actionCode: 'DELIVERY_POD_COMPLETED',
          target: 'outbound_orders',
          targetId: 'ORD-B2B-202611-089',
          ipAddress: '171.244.32.11',
          severity: AuditSeverity.INFO,
          details: 'Khách hàng WinMart Gò Vấp đã ký nhận và thanh toán tiền mặt 4.250.000đ. Đã đồng bộ ảnh POD biên bản.',
          payloadBefore: { deliveryStatus: 'IN_TRANSIT' },
          payloadAfter: { deliveryStatus: 'DELIVERED', codCollected: 4250000, receiverName: 'Phạm Thu Trang (Cửa hàng trưởng)' },
        },
        {
          timestamp: hoursAgo(3),
          actorName: 'AI Demand Forecast Daemon',
          actorRole: 'SYSTEM',
          clientApp: 'AI_DAEMON',
          serviceName: 'inbound-service',
          action: 'Dự báo nguy cơ thiếu hụt tồn kho Sữa tươi Dalat Milk',
          actionCode: 'AI_STOCKOUT_PREDICTION',
          target: 'products',
          targetId: 'SKU-DALATMILK-1L',
          ipAddress: '127.0.0.1',
          severity: AuditSeverity.WARN,
          details: 'Tốc độ tiêu thụ tăng 42% trong 3 ngày qua. Lượng tồn hiện tại chỉ đáp ứng đủ 1.8 ngày vận hành.',
          payloadAfter: { sku: 'SKU-DALATMILK-1L', currentStock: 85, reorderPoint: 200, recommendedOrderQty: 300 },
        },
        {
          timestamp: hoursAgo(5),
          actorName: 'Phạm Thị Mai (Nhân viên Sale)',
          actorRole: 'SALES_STAFF',
          clientApp: 'WEB_DASHBOARD',
          serviceName: 'outbound-service',
          action: 'Tạo đơn hàng xuất kho B2B cho Chuỗi Golden Gate',
          actionCode: 'ORDER_B2B_CREATED',
          target: 'outbound_orders',
          targetId: 'ORD-B2B-202611-092',
          ipAddress: '192.168.1.55',
          severity: AuditSeverity.INFO,
          details: 'Đơn hàng xuất 120 gói thịt bò Úc đông lạnh - Giá trị: 18.450.000đ, hạn mức công nợ Net 30.',
          payloadAfter: { customerCode: 'B2B-002', companyName: 'Golden Gate Group', subtotal: 18450000, discount: '15%' },
        },
        {
          timestamp: hoursAgo(8),
          actorName: 'Nguyễn Chi Tường (Admin)',
          actorRole: 'ADMIN',
          clientApp: 'WEB_DASHBOARD',
          serviceName: 'user-service',
          action: 'Tạm khóa tài khoản nhân viên nghi vấn rò rỉ mã OTP',
          actionCode: 'USER_ACCOUNT_LOCKED',
          target: 'users',
          targetId: 'staff.temp03@sfwms.vn',
          ipAddress: '192.168.1.100',
          severity: AuditSeverity.CRITICAL,
          details: 'Phát hiện đăng nhập bất thường từ dải IP lạ ngoài Việt Nam (45.134.22.8). Tự động khóa bảo vệ tài khoản.',
          payloadBefore: { email: 'staff.temp03@sfwms.vn', isLocked: false, status: 'ACTIVE' },
          payloadAfter: { isLocked: true, status: 'INACTIVE', lockReason: 'Security Alert: Suspicious Geolocation IP' },
        },
        {
          timestamp: daysAgo(1),
          actorName: 'Võ Quốc Huy (Thủ kho)',
          actorRole: 'WAREHOUSE_STAFF',
          clientApp: 'STAFF_APP',
          serviceName: 'inventory-service',
          action: 'Định vị và cất hàng lên kệ thông minh Putaway',
          actionCode: 'PUTAWAY_LOCATION_ASSIGNED',
          target: 'lots',
          targetId: 'LOT-VISSAN-202611-08',
          ipAddress: '192.168.1.48',
          severity: AuditSeverity.INFO,
          details: 'Cất 80 hộp thịt hộp Vissan lên vị trí kệ RACK-A-02-L3 theo gợi ý tối ưu nhiệt độ.',
          payloadAfter: { rackId: 'RACK-A-02-L3', warehouseCode: 'WH-006', zone: 'ZONE_COLD_CHILLED' },
        },
        {
          timestamp: daysAgo(1),
          actorName: 'Hệ Thống Pick-to-Light',
          actorRole: 'SYSTEM',
          clientApp: 'IOT_GATEWAY',
          serviceName: 'warehouse-service',
          action: 'Kích hoạt đèn LED PTL hỗ trợ lấy hàng đợt xuất Wave-12',
          actionCode: 'PTL_LIGHTS_TRIGGERED',
          target: 'warehouse_racks',
          targetId: 'WAVE-EXP-202611-12',
          ipAddress: '192.168.1.200',
          severity: AuditSeverity.INFO,
          details: 'Bật đồng thời 6 đèn LED hiển thị số lượng lấy tại dãy Kệ B cho nhân viên đóng gói.',
          payloadAfter: { activeModules: ['PTL-B1-02', 'PTL-B1-05', 'PTL-B2-01'], orderCount: 4 },
        },
        {
          timestamp: daysAgo(2),
          actorName: 'Nguyễn Chi Tường (Admin)',
          actorRole: 'ADMIN',
          clientApp: 'WEB_DASHBOARD',
          serviceName: 'user-service',
          action: 'Cập nhật chính sách hạn dùng cảnh báo FEFO toàn hệ thống',
          actionCode: 'SYSTEM_SETTINGS_UPDATED',
          target: 'system_settings',
          targetId: 'FEFO_POLICY_DAYS',
          ipAddress: '192.168.1.100',
          severity: AuditSeverity.WARN,
          details: 'Điều chỉnh thời gian cảnh báo hàng cận hạn từ 30 ngày lên 45 ngày đối với nhóm Thực phẩm tươi.',
          payloadBefore: { fefoAlertThresholdDays: 30 },
          payloadAfter: { fefoAlertThresholdDays: 45, applyToCategories: ['RAU_CU_QUA', 'THIT_CA_TUOI', 'SUA_BO_TRUNG'] },
        },
      ];

      for (const log of richLogs) {
        await this.auditLogRepository.save(this.auditLogRepository.create(log));
      }
      console.log(`[AUDIT LOG] Seeded ${richLogs.length} enterprise audit log entries successfully!`);
    }
  }

  async create(dto: Partial<AuditLog>): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      ...dto,
      clientApp: dto.clientApp || 'WEB_DASHBOARD',
      severity: dto.severity || AuditSeverity.INFO,
      timestamp: dto.timestamp || new Date(),
    });
    return this.auditLogRepository.save(entry);
  }

  async getStats(): Promise<{
    total: number;
    infoCount: number;
    warnCount: number;
    criticalCount: number;
    todayCount: number;
  }> {
    const total = await this.auditLogRepository.count();
    const infoCount = await this.auditLogRepository.count({ where: { severity: AuditSeverity.INFO } });
    const warnCount = await this.auditLogRepository.count({ where: { severity: AuditSeverity.WARN } });
    const criticalCount = await this.auditLogRepository.count({ where: { severity: AuditSeverity.CRITICAL } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.timestamp >= :today', { today: startOfToday })
      .getCount();

    return { total, infoCount, warnCount, criticalCount, todayCount };
  }

  async findById(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOneBy({ id });
    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found.`);
    }
    return log;
  }

  async findAll(filters?: {
    severity?: AuditSeverity | 'ALL';
    serviceName?: string;
    clientApp?: string;
    actorRole?: string;
    actionCode?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (filters?.severity && filters.severity !== 'ALL') {
      qb.andWhere('log.severity = :severity', { severity: filters.severity });
    }

    if (filters?.serviceName && filters.serviceName !== 'ALL') {
      qb.andWhere('log.serviceName = :serviceName', { serviceName: filters.serviceName });
    }

    if (filters?.clientApp && filters.clientApp !== 'ALL') {
      qb.andWhere('log.clientApp = :clientApp', { clientApp: filters.clientApp });
    }

    if (filters?.actorRole && filters.actorRole !== 'ALL') {
      qb.andWhere('log.actorRole = :actorRole', { actorRole: filters.actorRole });
    }

    if (filters?.actionCode && filters.actionCode !== 'ALL') {
      qb.andWhere('log.actionCode = :actionCode', { actionCode: filters.actionCode });
    }

    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      qb.andWhere('log.timestamp >= :from', { from });
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('log.timestamp <= :to', { to });
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(log.action) LIKE :q OR LOWER(log.actionCode) LIKE :q OR LOWER(log.actorName) LIKE :q OR LOWER(log.target) LIKE :q OR LOWER(log.targetId) LIKE :q OR LOWER(log.details) LIKE :q OR log.ipAddress LIKE :q)',
        { q },
      );
    }

    qb.orderBy('log.timestamp', 'DESC');

    const total = await qb.getCount();

    if (filters?.limit) {
      qb.take(filters.limit);
    } else {
      qb.take(50);
    }

    if (filters?.offset) {
      qb.skip(filters.offset);
    }

    const data = await qb.getMany();
    return { data, total };
  }
}
