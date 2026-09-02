import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Address } from './address.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async onModuleInit() {
    // Auto-seed default accounts
    const emailList = [
      { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường', role: UserRole.ADMIN, warehouseCode: undefined },
      { email: 'manager@sfwms.vn', name: 'Trần Văn Bình (Quản lý)', role: UserRole.WAREHOUSE_MANAGER, warehouseCode: 'WH-005' },
      { email: 'govap@sfwms.vn', name: 'Nguyễn Hoàng Nam (Kho Gò Vấp)', role: UserRole.WAREHOUSE_MANAGER, warehouseCode: 'WH-006' },
      { email: 'manager_wh006@sfwms.vn', name: 'Nguyễn Hoàng Nam (QL Kho Gò Vấp)', role: UserRole.WAREHOUSE_MANAGER, warehouseCode: 'WH-006' },
      { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa', role: UserRole.WAREHOUSE_STAFF, warehouseCode: 'WH-006' },
      { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức', role: UserRole.SALES_STAFF, warehouseCode: undefined },
      { email: 'driver@sfwms.vn', name: 'Võ Thanh Tùng', role: UserRole.DRIVER, warehouseCode: undefined },
      { email: 'customer@sfwms.vn', name: 'Khách hàng Test', role: UserRole.CUSTOMER, warehouseCode: undefined },
    ];

    for (const item of emailList) {
      let user = await this.userRepository.findOneBy({ email: item.email });
      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        const newUser = this.userRepository.create({
          email: item.email,
          name: item.name,
          passwordHash,
          role: item.role,
          warehouseCode: item.warehouseCode,
        });
        await this.userRepository.save(newUser);
        console.log(`Seeded user: ${item.email} with password: password123`);
      } else if (item.warehouseCode && user.warehouseCode !== item.warehouseCode) {
        user.warehouseCode = item.warehouseCode;
        await this.userRepository.save(user);
      }
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['addresses'],
    });
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

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
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

  async updateProfile(userId: string, data: { name?: string; gender?: string; dob?: Date; addressStr?: string; lat?: number; lng?: number }): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new Error('User not found');

    if (data.name) user.name = data.name;
    if (data.gender) user.gender = data.gender;
    if (data.dob) user.dob = data.dob;

    await this.userRepository.save(user);

    if (data.addressStr) {
      let address = await this.addressRepository.findOneBy({ userId, isDefault: true });
      if (!address) {
        address = this.addressRepository.create({ userId, isDefault: true });
      }
      address.streetAddress = data.addressStr;
      if (data.lat !== undefined) address.latitude = data.lat;
      if (data.lng !== undefined) address.longitude = data.lng;
      await this.addressRepository.save(address);
    }

    return user;
  }
}

