import { Injectable, OnModuleInit, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

export interface CreateStaffDto {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: UserRole;
  warehouseCode?: string;
  assignedZone?: string;
  shift?: string;
  status?: string;
  department?: string;
  code?: string;
}

export interface UpdateStaffDto {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: UserRole;
  warehouseCode?: string;
  assignedZone?: string;
  shift?: string;
  status?: string;
  department?: string;
  code?: string;
  tasksCompleted?: number;
  rating?: number;
}

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Auto-seed default realistic accounts
    const initialUsers = [
      {
        email: 'admin@sfwms.vn',
        name: 'Nguyễn Chi Tường',
        role: UserRole.ADMIN,
        warehouseCode: undefined,
        code: 'ADMIN-01',
        phone: '0909000001',
        department: 'Ban Giám Đốc',
        assignedZone: 'Toàn hệ thống',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      // WH-006 (Kho Gò Vấp)
      {
        email: 'manager_wh006@sfwms.vn',
        name: 'Nguyễn Hoàng Nam (Thủ Kho)',
        role: UserRole.WAREHOUSE_MANAGER,
        warehouseCode: 'WH-006',
        code: 'NV-GV01',
        phone: '0908123456',
        department: 'Quản trị kho',
        assignedZone: 'Toàn bộ Kho Gò Vấp',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
        tasksCompleted: 1420,
        rating: 4.9,
      },
      {
        email: 'govap@sfwms.vn',
        name: 'Nguyễn Hoàng Nam (Kho Gò Vấp)',
        role: UserRole.WAREHOUSE_MANAGER,
        warehouseCode: 'WH-006',
        code: 'NV-GV01-B',
        phone: '0908123456',
        department: 'Quản trị kho',
        assignedZone: 'Toàn bộ Kho Gò Vấp',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      {
        email: 'staff@sfwms.vn',
        name: 'Trần Văn Bình (Trực Kho)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-006',
        code: 'NV-GV02',
        phone: '0912345678',
        department: 'Vận hành kho',
        assignedZone: 'Khu Khô C & Soạn hàng',
        shift: 'CA_SANG',
        status: 'ACTIVE',
        tasksCompleted: 860,
        rating: 4.8,
      },
      {
        email: 'staff.kho@sfwms.vn',
        name: 'Lê Văn Kho (Trực Kho)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-006',
        code: 'NV-GV03',
        phone: '0933987654',
        department: 'Vận hành kho',
        assignedZone: 'Bàn Đóng Gói & Niêm Phong',
        shift: 'CA_SANG',
        status: 'ACTIVE',
        tasksCompleted: 920,
        rating: 4.7,
      },
      {
        email: 'staff.thuy@sfwms.vn',
        name: 'Phạm Thị Thúy (Trực Kho)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-006',
        code: 'NV-GV04',
        phone: '0987654321',
        department: 'Vận hành kho',
        assignedZone: 'Cửa Tiếp Nhận & Trạm QC-01',
        shift: 'CA_CHIEU',
        status: 'ACTIVE',
        tasksCompleted: 640,
        rating: 4.9,
      },
      {
        email: 'driver.tri@sfwms.vn',
        name: 'Võ Minh Trí (Tài xế)',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'TX-GV05',
        phone: '0977112233',
        department: 'Vận chuyển (Fleet)',
        assignedZone: '🛵 Xe Máy Thùng Lạnh (59-V1 888.99)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
        tasksCompleted: 1100,
        rating: 4.8,
      },
      // WH-001 (Kho Quận 12)
      {
        email: 'manager_wh001@sfwms.vn',
        name: 'Đặng Quốc Huy (QL Q12)',
        role: UserRole.WAREHOUSE_MANAGER,
        warehouseCode: 'WH-001',
        code: 'NV-Q12-01',
        phone: '0901234567',
        department: 'Quản trị kho',
        assignedZone: 'Toàn bộ Kho Quận 12',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      {
        email: 'staff_wh001@sfwms.vn',
        name: 'Hoàng Minh Tuấn (Trực Kho Q12)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-001',
        code: 'NV-Q12-02',
        phone: '0902345678',
        department: 'Vận hành kho',
        assignedZone: 'Khu Lạnh & Soạn hàng Q12',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      // WH-002 (Kho Thủ Đức)
      {
        email: 'manager_wh002@sfwms.vn',
        name: 'Bùi Anh Tuấn (QL Thủ Đức)',
        role: UserRole.WAREHOUSE_MANAGER,
        warehouseCode: 'WH-002',
        code: 'NV-TD01',
        phone: '0903456789',
        department: 'Quản trị kho',
        assignedZone: 'Toàn bộ Kho Thủ Đức',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      {
        email: 'staff_wh002@sfwms.vn',
        name: 'Ngô Thanh Hải (Trực Kho Thủ Đức)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-002',
        code: 'NV-TD02',
        phone: '0904567890',
        department: 'Vận hành kho',
        assignedZone: 'Khu Khô & Đóng gói Thủ Đức',
        shift: 'CA_CHIEU',
        status: 'ACTIVE',
      },
      // WH-005 (Kho Bình Thạnh)
      {
        email: 'manager@sfwms.vn',
        name: 'Trần Văn Bình (Quản lý BThanh)',
        role: UserRole.WAREHOUSE_MANAGER,
        warehouseCode: 'WH-005',
        code: 'NV-BT01',
        phone: '0905678901',
        department: 'Quản trị kho',
        assignedZone: 'Toàn bộ Kho Bình Thạnh',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      {
        email: 'staff_wh005@sfwms.vn',
        name: 'Vũ Đức Thịnh (Trực Kho BThanh)',
        role: UserRole.WAREHOUSE_STAFF,
        warehouseCode: 'WH-005',
        code: 'NV-BT02',
        phone: '0906789012',
        department: 'Vận hành kho',
        assignedZone: 'Khu Nhập hàng & Kiểm kê BThanh',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      // ── ĐỘI XE 9 TÀI XẾ TOÀN HỆ THỐNG ──
      // 1. Xe Tải Lạnh 2.5T (Đặng Hoàng Phúc)
      {
        email: 'truck@sfwms.vn',
        name: 'Đặng Hoàng Phúc',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-TK01',
        phone: '0944778899',
        department: 'Đội Xe Tải Lạnh 2.5T',
        assignedZone: 'Tuyến Tiêu Hủy Đa Phước & Chuyển Kho',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'phuc.dang@sfwms.vn',
        name: 'Đặng Hoàng Phúc',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-TK01',
        phone: '0944778899',
        department: 'Đội Xe Tải Lạnh 2.5T',
        assignedZone: 'Tuyến Tiêu Hủy Đa Phước & Chuyển Kho',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'danghoangphuc@gmail.com',
        name: 'Đặng Hoàng Phúc',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-TK01',
        phone: '0944778899',
        department: 'Đội Xe Tải Lạnh 2.5T',
        assignedZone: 'Tuyến Tiêu Hủy Đa Phước & Chuyển Kho',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      // 2. Xe Bán Tải 1.5T (Phan Hữu Nam)
      {
        email: 'van@sfwms.vn',
        name: 'Phan Hữu Nam',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-VAN01',
        phone: '0918776655',
        department: 'Đội Xe Bán Tải 1.5T',
        assignedZone: 'Gò Vấp - Tân Bình - Q12',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'nam.phan@sfwms.vn',
        name: 'Phan Hữu Nam',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-VAN01',
        phone: '0918776655',
        department: 'Đội Xe Bán Tải 1.5T',
        assignedZone: 'Gò Vấp - Tân Bình - Q12',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      // 3. Xe Máy Thùng Lạnh Gò Vấp (WH-006)
      {
        email: 'driver@sfwms.vn',
        name: 'Võ Minh Trí',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-GV05',
        phone: '0977112233',
        department: 'Vận chuyển Hẻm Phố (Fleet)',
        assignedZone: '🛵 Xe Máy Thùng Lạnh (59-V1 888.99)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'hung.nguyen@sfwms.vn',
        name: 'Nguyễn Văn Hùng',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-GV06',
        phone: '0909888111',
        department: 'Vận chuyển (Fleet)',
        assignedZone: '🛵 Xe Máy Giao Nhanh (59-G2 688.39)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'bao.tran@sfwms.vn',
        name: 'Trần Quốc Bảo',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-GV07',
        phone: '0933445566',
        department: 'Vận chuyển (Fleet)',
        assignedZone: '🛵 Xe Máy Thùng Mát (59-P1 456.78)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'nam.hoang@sfwms.vn',
        name: 'Phạm Hoàng Nam',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-GV08',
        phone: '0918776655',
        department: 'Vận chuyển (Fleet)',
        assignedZone: '🛵 Xe Máy Thùng Mát (59-K1 234.56)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'tung.le@sfwms.vn',
        name: 'Lê Thanh Tùng',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-006',
        code: 'NV-GV09',
        phone: '0966332211',
        department: 'Vận chuyển (Fleet)',
        assignedZone: '🛵 Xe Máy Thùng Lạnh (59-X1 999.11)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      // 4. Xe Máy Liên Kho (Bình Thạnh & Tân Bình)
      {
        email: 'long.bui@sfwms.vn',
        name: 'Bùi Hoàng Long',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-002',
        code: 'NV-BT01',
        phone: '0988112244',
        department: 'Vận chuyển Hub Bình Thạnh',
        assignedZone: '🛵 Xe Máy Thùng Lạnh (59-S2 555.66)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'huy.truong@sfwms.vn',
        name: 'Trương Gia Huy',
        role: UserRole.DRIVER,
        warehouseCode: 'WH-003',
        code: 'NV-TB01',
        phone: '0977223344',
        department: 'Vận chuyển Hub Tân Bình',
        assignedZone: '🛵 Xe Máy Thùng Lạnh (59-H1 333.22)',
        shift: 'CA_SANG',
        status: 'ACTIVE',
      },
      {
        email: 'sales@sfwms.vn',
        name: 'Phạm Minh Đức (Kinh Doanh)',
        role: UserRole.SALES_STAFF,
        warehouseCode: undefined,
        code: 'KD-01',
        phone: '0908901234',
        department: 'Kinh doanh',
        assignedZone: 'Văn phòng',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
      {
        email: 'customer@sfwms.vn',
        name: 'Khách hàng Test',
        role: UserRole.CUSTOMER,
        warehouseCode: undefined,
        code: 'KH-01',
        phone: '0909999999',
        department: 'Khách hàng',
        assignedZone: '',
        shift: 'HANH_CHINH',
        status: 'ACTIVE',
      },
    ];

    for (const item of initialUsers) {
      let user = await this.userRepository.findOneBy({ email: item.email });
      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        const newUser = this.userRepository.create({
          email: item.email,
          name: item.name,
          passwordHash,
          role: item.role,
          warehouseCode: item.warehouseCode,
          code: item.code,
          phone: item.phone,
          department: item.department,
          assignedZone: item.assignedZone,
          shift: item.shift || 'HANH_CHINH',
          status: item.status || 'ACTIVE',
          tasksCompleted: item.tasksCompleted || 0,
          rating: item.rating || 5.0,
        });
        await this.userRepository.save(newUser);
        console.log(`Seeded user: ${item.email} (${item.name}) with default pass: password123`);
      } else {
        // Sync warehouseCode and meta if changed
        let needsUpdate = false;
        if (item.warehouseCode && user.warehouseCode !== item.warehouseCode) {
          user.warehouseCode = item.warehouseCode;
          needsUpdate = true;
        }
        if (item.code && !user.code) {
          user.code = item.code;
          needsUpdate = true;
        }
        if (item.assignedZone && !user.assignedZone) {
          user.assignedZone = item.assignedZone;
          needsUpdate = true;
        }
        if (item.department && !user.department) {
          user.department = item.department;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.userRepository.save(user);
        }
      }
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    return this.userRepository.findOne({
      where: { email: ILike(cleanEmail) },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['addresses'],
    });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'name',
        'email',
        'role',
        'phone',
        'warehouseCode',
        'code',
        'assignedZone',
        'shift',
        'status',
        'department',
        'tasksCompleted',
        'rating',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllStaff(query?: { warehouseCode?: string; role?: string; search?: string; status?: string }): Promise<User[]> {
    const qb = this.userRepository.createQueryBuilder('user');

    // Filter staff & managers & drivers (exclude pure customers if queried as staff)
    if (query?.role && query.role !== 'ALL') {
      qb.andWhere('user.role = :role', { role: query.role });
    } else {
      qb.andWhere('user.role IN (:...roles)', {
        roles: [UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE_MANAGER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SALES_STAFF],
      });
    }

    if (query?.warehouseCode && query.warehouseCode !== 'ALL') {
      qb.andWhere('user.warehouseCode = :warehouseCode', { warehouseCode: query.warehouseCode });
    }

    if (query?.status && query.status !== 'ALL') {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query?.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(user.name ILIKE :s OR user.email ILIKE :s OR user.phone ILIKE :s OR user.code ILIKE :s OR user.assignedZone ILIKE :s)', { s });
    }

    qb.orderBy('user.createdAt', 'DESC');
    return qb.getMany();
  }

  async createStaff(dto: CreateStaffDto): Promise<User> {
    const cleanEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: ILike(cleanEmail) },
    });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" đã tồn tại trong hệ thống (${existing.name})!`);
    }

    if (dto.code && dto.code.trim()) {
      const existingCode = await this.userRepository.findOne({
        where: { code: dto.code.trim() },
      });
      if (existingCode) {
        throw new ConflictException(`Mã nhân viên "${dto.code}" đã được sử dụng (${existingCode.name})!`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password || 'password123', 10);
    const autoCode = dto.code?.trim() || `NV-${(dto.warehouseCode || 'WH').replace('WH-', '')}-${Math.floor(100 + Math.random() * 900)}`;

    const user = this.userRepository.create({
      name: dto.name.trim(),
      email: cleanEmail,
      passwordHash,
      phone: dto.phone?.trim() || '',
      role: dto.role || UserRole.WAREHOUSE_STAFF,
      warehouseCode: dto.warehouseCode || 'WH-006',
      assignedZone: dto.assignedZone || 'Toàn bộ kho',
      shift: dto.shift || 'HANH_CHINH',
      status: dto.status || 'ACTIVE',
      department: dto.department || (dto.role === UserRole.DRIVER ? 'Vận chuyển (Fleet)' : dto.role === UserRole.WAREHOUSE_MANAGER ? 'Quản trị kho' : 'Vận hành kho'),
      code: autoCode,
      tasksCompleted: 0,
      rating: 5.0,
    });

    try {
      return await this.userRepository.save(user);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('violates unique constraint')) {
        throw new ConflictException('Email hoặc Mã nhân viên đã tồn tại trên hệ thống!');
      }
      throw err;
    }
  }

  async updateStaff(id: string, dto: UpdateStaffDto): Promise<User> {
    let user: User | null = null;

    if (id && id.length > 10) {
      user = await this.userRepository.findOneBy({ id });
    }

    // Fallback: match by email or code if client had stale cached ID
    if (!user && dto.email) {
      user = await this.userRepository.findOne({
        where: { email: ILike(dto.email.trim().toLowerCase()) },
      });
    }

    if (!user && dto.code) {
      user = await this.userRepository.findOne({
        where: { code: dto.code.trim() },
      });
    }

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID hoặc Email ${dto.email || id}. Vui lòng làm mới danh sách!`);
    }

    // Check email uniqueness if email is changed
    if (dto.email !== undefined && dto.email.trim().length > 0) {
      const newEmail = dto.email.trim().toLowerCase();
      if (newEmail !== user.email.toLowerCase()) {
        const existingWithEmail = await this.userRepository.findOne({
          where: { email: ILike(newEmail) },
        });
        if (existingWithEmail && existingWithEmail.id !== user.id) {
          throw new ConflictException(`Email "${newEmail}" đã được sử dụng bởi nhân viên khác (${existingWithEmail.name})!`);
        }
        user.email = newEmail;
      }
    }

    // Check code uniqueness if code is changed
    if (dto.code !== undefined && dto.code.trim().length > 0) {
      const newCode = dto.code.trim();
      if (newCode !== user.code) {
        const existingWithCode = await this.userRepository.findOne({
          where: { code: newCode },
        });
        if (existingWithCode && existingWithCode.id !== user.id) {
          throw new ConflictException(`Mã nhân viên "${newCode}" đã được sử dụng bởi nhân viên khác (${existingWithCode.name})!`);
        }
        user.code = newCode;
      }
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.warehouseCode !== undefined) user.warehouseCode = dto.warehouseCode;
    if (dto.assignedZone !== undefined) user.assignedZone = dto.assignedZone;
    if (dto.shift !== undefined) user.shift = dto.shift;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.department !== undefined) user.department = dto.department;
    if (dto.tasksCompleted !== undefined) user.tasksCompleted = dto.tasksCompleted;
    if (dto.rating !== undefined) user.rating = dto.rating;

    if (dto.password && dto.password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(dto.password.trim(), 10);
    }

    try {
      return await this.userRepository.save(user);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('violates unique constraint')) {
        throw new ConflictException('Email hoặc Mã nhân viên đã tồn tại trên hệ thống!');
      }
      throw err;
    }
  }

  async toggleStaffStatus(id: string, status?: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}. Vui lòng làm mới danh sách!`);
    }

    if (status) {
      user.status = status;
    } else {
      user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async create(userDto: Partial<User>): Promise<User> {
    const passwordHash = await bcrypt.hash(userDto.passwordHash || 'password123', 10);
    const user = this.userRepository.create({
      ...userDto,
      passwordHash,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, updateDto: { name?: string; email?: string; phone?: string; password?: string }): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new Error('User not found');
    }
    if (updateDto.name !== undefined) user.name = updateDto.name;
    if (updateDto.email !== undefined) user.email = updateDto.email;
    if (updateDto.phone !== undefined) user.phone = updateDto.phone;
    if (updateDto.password !== undefined && updateDto.password !== '') {
      user.passwordHash = await bcrypt.hash(updateDto.password, 10);
    }
    return this.userRepository.save(user);
  }

  async onboardCustomer(firebaseUid: string, phone: string, name: string, addressStr?: string, lat?: number, lng?: number): Promise<User> {
    let user = await this.userRepository.findOneBy({ firebaseUid });
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = this.userRepository.create({
        firebaseUid,
        phone,
        name,
        role: UserRole.CUSTOMER,
        points: 0,
        tier: 'Thành viên mới',
      });
    } else {
      if (name) user.name = name;
      if (phone) user.phone = phone;
    }
    const savedUser = await this.userRepository.save(user);

    if (addressStr) {
      let address = await this.addressRepository.findOneBy({ userId: savedUser.id, isDefault: true });
      if (!address) {
        address = this.addressRepository.create({
          userId: savedUser.id,
          isDefault: true,
        });
      }
      address.streetAddress = addressStr;
      if (lat !== undefined) address.latitude = lat;
      if (lng !== undefined) address.longitude = lng;
      await this.addressRepository.save(address);
    }

    return savedUser;
  }

  async resetPassword(id: string): Promise<{ newPassword: string }> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new Error('User not found');
    }
    // Generate random 8-char password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
    return { newPassword };
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new Error('User not found');
    }
    user.role = role;
    return this.userRepository.save(user);
  }
}
