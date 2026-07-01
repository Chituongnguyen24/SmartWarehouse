import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Auto-seed default accounts
    const emailList = [
      { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường', role: UserRole.ADMIN },
      { email: 'manager@sfwms.vn', name: 'Trần Văn Bình', role: UserRole.WAREHOUSE_MANAGER },
      { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa', role: UserRole.WAREHOUSE_STAFF },
      { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức', role: UserRole.SALES_STAFF },
      { email: 'driver@sfwms.vn', name: 'Võ Thanh Tùng', role: UserRole.DRIVER },
    ];

    for (const item of emailList) {
      const exists = await this.userRepository.findOneBy({ email: item.email });
      if (!exists) {
        const passwordHash = await bcrypt.hash('password123', 10);
        const newUser = this.userRepository.create({
          email: item.email,
          name: item.name,
          passwordHash,
          role: item.role,
        });
        await this.userRepository.save(newUser);
        console.log(`Seeded user: ${item.email} with password: password123`);
      }
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async create(userDto: Partial<User>): Promise<User> {
    const passwordHash = await bcrypt.hash(userDto.passwordHash || 'password123', 10);
    const user = this.userRepository.create({
      ...userDto,
      passwordHash,
    });
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
}

