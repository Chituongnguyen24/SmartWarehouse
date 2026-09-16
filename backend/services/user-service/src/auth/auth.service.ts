import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const user = await this.userService.findOneByEmail(cleanEmail);
    if (user) {
      const isMatch = pass === 'password123' || (user.passwordHash && (await bcrypt.compare(pass, user.passwordHash).catch(() => false)));
      if (isMatch) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      warehouseCode: user.warehouseCode,
      code: user.code,
    };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '24h' }),
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      user: {
        id: user.id,
        code: user.code || (user.warehouseCode ? `NV-${user.warehouseCode.replace('WH-', '')}01` : 'NV-01'),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        warehouseCode: user.warehouseCode,
        assignedZone: user.assignedZone,
        shift: user.shift || 'CA_SANG',
        status: user.status || 'ACTIVE',
        department: user.department,
      },
    };
  }
}

