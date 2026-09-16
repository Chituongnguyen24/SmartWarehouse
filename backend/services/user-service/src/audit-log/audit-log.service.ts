import { Injectable, OnModuleInit } from '@nestjs/common';
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
    if (count === 0) {
      const seedLogs: Partial<AuditLog>[] = [
        {
          actorName: 'admin (Admin)',
          actorRole: 'ADMIN',
          action: 'Đăng nhập hệ thống quản trị',
          target: 'auth-service',
          serviceName: 'user-service',
          ipAddress: '192.168.1.1',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'admin (Admin)',
          actorRole: 'ADMIN',
          action: 'Tạo tài khoản nhân viên mới: staff2@sfwms.vn',
          target: 'users',
          serviceName: 'user-service',
          ipAddress: '192.168.1.1',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'admin (Admin)',
          actorRole: 'ADMIN',
          action: 'Khóa tài khoản: staff_test@sfwms.vn',
          target: 'users',
          serviceName: 'user-service',
          ipAddress: '192.168.1.1',
          severity: AuditSeverity.WARN,
        },
        {
          actorName: 'manager@sfwms.vn (Quản lý)',
          actorRole: 'WAREHOUSE_MANAGER',
          action: 'Phê duyệt phiếu nhập kho PNK-20260820-001',
          target: 'inbound-orders',
          serviceName: 'inbound-service',
          ipAddress: '192.168.1.10',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'staff@sfwms.vn (NV Kho)',
          actorRole: 'WAREHOUSE_STAFF',
          action: 'Xác nhận soạn hàng FEFO đơn #ORD-884920',
          target: 'outbound-orders',
          serviceName: 'outbound-service',
          ipAddress: '192.168.1.12',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'SYSTEM_BOT',
          actorRole: 'SYSTEM',
          action: 'Cảnh báo AI: Lô cá hồi L-08129 riskScore 85% — sắp hết hạn',
          target: 'lots',
          serviceName: 'ai-service',
          ipAddress: '127.0.0.1',
          severity: AuditSeverity.WARN,
        },
        {
          actorName: 'SYSTEM_BOT',
          actorRole: 'SYSTEM',
          action: 'Nhiệt độ kho lạnh Zone A vượt ngưỡng: 6.2°C (max: 4.0°C)',
          target: 'iot-sensors',
          serviceName: 'iot-service',
          ipAddress: '127.0.0.1',
          severity: AuditSeverity.CRITICAL,
        },
        {
          actorName: 'sales@sfwms.vn (Sales)',
          actorRole: 'SALES_STAFF',
          action: 'Tạo đơn xuất kho B2B #ORD-884925 cho KH CityMart Q7',
          target: 'outbound-orders',
          serviceName: 'outbound-service',
          ipAddress: '192.168.1.45',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'driver@sfwms.vn (Tài xế)',
          actorRole: 'DRIVER',
          action: 'Cập nhật trạng thái: Giao hàng thành công đơn #ORD-884918',
          target: 'deliveries',
          serviceName: 'transport-service',
          ipAddress: '192.168.1.88',
          severity: AuditSeverity.INFO,
        },
        {
          actorName: 'admin (Admin)',
          actorRole: 'ADMIN',
          action: 'Thay đổi cấu hình: ngưỡng cảnh báo FEFO = 5 ngày',
          target: 'system-settings',
          serviceName: 'user-service',
          ipAddress: '192.168.1.1',
          severity: AuditSeverity.WARN,
        },
      ];

      for (const log of seedLogs) {
        await this.auditLogRepository.save(this.auditLogRepository.create(log));
      }
      console.log(`Seeded ${seedLogs.length} audit log entries`);
    }
  }

  async create(dto: Partial<AuditLog>): Promise<AuditLog> {
    return this.auditLogRepository.save(this.auditLogRepository.create(dto));
  }

  async findAll(filters?: {
    severity?: AuditSeverity;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (filters?.severity) {
      qb.andWhere('log.severity = :severity', { severity: filters.severity });
    }

    if (filters?.search) {
      qb.andWhere(
        '(log.action ILIKE :search OR log.actorName ILIKE :search OR log.target ILIKE :search)',
        { search: `%${filters.search}%` },
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
