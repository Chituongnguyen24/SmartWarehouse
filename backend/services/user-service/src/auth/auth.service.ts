import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EsmsService } from './esms.service';
import { OtpActionType } from './otp-verification.entity';
import { UserRole } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private esmsService: EsmsService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const cleanIdentifier = identifier ? identifier.trim() : '';
    const user = await this.userService.findOneByIdentifier(cleanIdentifier);
    if (user) {
      let isMatch = false;
      if (user.passwordHash) {
        isMatch = await bcrypt.compare(pass, user.passwordHash).catch(() => false);
      } else {
        // Fallback strictly for legacy accounts missing passwordHash
        isMatch = (pass === 'password123');
      }
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

    let addresses = user.addresses;
    if ((!addresses || addresses.length === 0) && user.id) {
      try {
        const fullUser = await this.userService.findOneById(user.id);
        addresses = fullUser?.addresses || [];
      } catch (e) {}
    }

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      token_type: 'Bearer',
      expires_in: 2592000, // 30 days in seconds
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
        addresses: addresses || [],
        licensePlate: user.licensePlate,
        vehicleType: user.vehicleType,
        currentTemp: user.currentTemp,
        targetTempMin: user.targetTempMin,
        targetTempMax: user.targetTempMax,
        rating: user.rating,
        tasksCompleted: user.tasksCompleted,
        totalEarningsToday: user.totalEarningsToday,
      },
    };
  }

  /**
   * 1. GỬI MÃ OTP QUA eSMS.VN
   */
  async sendOtp(phone: string, actionType: string) {
    const cleanPhone = this.esmsService.normalizePhone(phone);
    if (!this.esmsService.isValidVietnamPhone(cleanPhone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ (cần 10 chữ số dạng 03x, 05x, 07x, 08x, 09x)!');
    }

    // Nghiệp vụ Quên Mật Khẩu: Số điện thoại phải tồn tại trong hệ thống
    if (actionType === OtpActionType.RESET_PASSWORD) {
      const user = await this.userService.findOneByIdentifier(cleanPhone);
      if (!user) {
        throw new NotFoundException(`Số điện thoại ${cleanPhone} chưa được đăng ký trong hệ thống! Vui lòng kiểm tra lại.`);
      }
    }

    // Nghiệp vụ Đăng Ký: Số điện thoại không được trùng
    if (actionType === OtpActionType.REGISTER) {
      const existing = await this.userService.findOneByIdentifier(cleanPhone);
      if (existing) {
        throw new ConflictException(`Số điện thoại ${cleanPhone} đã được đăng ký tài khoản! Bạn có thể chọn Quên Mật Khẩu để lấy lại quyền truy cập.`);
      }
    }

    return this.esmsService.sendOtp(cleanPhone, actionType);
  }

  /**
   * 2. XÁC MINH MÃ OTP
   */
  async verifyOtp(phone: string, otpCode: string, actionType?: string) {
    return this.esmsService.verifyOtp(phone, otpCode, actionType);
  }

  /**
   * 3. TỰ ĐẶT LẠI MẬT KHẨU BẰNG OTP (KHÔNG CẦN QUA QUẢN LÝ)
   */
  async forgotPasswordConfirm(phone: string, otpCode: string, newPassword: string) {
    const cleanPhone = this.esmsService.normalizePhone(phone);
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự!');
    }

    // Xác minh mã OTP
    await this.esmsService.verifyOtp(cleanPhone, otpCode, OtpActionType.RESET_PASSWORD);

    // Tìm user và cập nhật mật khẩu
    const user = await this.userService.findOneByIdentifier(cleanPhone);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!');
    }

    await this.userService.updatePasswordDirect(user.id, newPassword.trim());

    return {
      success: true,
      message: 'Mật khẩu đã được thay đổi thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
    };
  }

  /**
   * 4. ĐỔI MẬT KHẨU CHỦ ĐỘNG TRONG PROFILE
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự!');
    }

    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }

    // Kiểm tra mật khẩu cũ
    let isOldMatch = false;
    if (user.passwordHash) {
      isOldMatch = await bcrypt.compare(oldPassword, user.passwordHash).catch(() => false);
    } else {
      isOldMatch = (oldPassword === 'password123');
    }

    if (!isOldMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác!');
    }

    await this.userService.updatePasswordDirect(user.id, newPassword.trim());

    return {
      success: true,
      message: 'Đổi mật khẩu thành công!',
    };
  }

  /**
   * 5. ĐĂNG KÝ TÀI KHOẢN MỚI BẰNG OTP (DÀNH CHO KHÁCH HÀNG / NHÂN VIÊN)
   */
  async registerWithOtp(dto: {
    phone: string;
    name: string;
    password: string;
    otpCode: string;
    role?: UserRole;
  }) {
    const cleanPhone = this.esmsService.normalizePhone(dto.phone);
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BadRequestException('Họ và tên không hợp lệ!');
    }
    if (!dto.password || dto.password.trim().length < 6) {
      throw new BadRequestException('Mật khẩu phải có tối thiểu 6 ký tự!');
    }

    // Xác thực OTP
    await this.esmsService.verifyOtp(cleanPhone, dto.otpCode, OtpActionType.REGISTER);

    const existing = await this.userService.findOneByIdentifier(cleanPhone);
    if (existing) {
      throw new ConflictException(`Số điện thoại ${cleanPhone} đã được đăng ký!`);
    }

    // Tạo email mặc định nếu không truyền
    const generatedEmail = `${cleanPhone}@customer.sfwms.vn`;

    const newUser = await this.userService.create({
      name: dto.name.trim(),
      phone: cleanPhone,
      email: generatedEmail,
      passwordHash: dto.password.trim(),
      role: dto.role || UserRole.CUSTOMER,
      status: 'ACTIVE',
    });

    return this.login(newUser);
  }

  /**
   * 6. ĐĂNG NHẬP NHANH BẰNG OTP (KHÔNG CẦN MẬT KHẨU)
   */
  async loginWithOtp(phone: string, otpCode: string) {
    const cleanPhone = this.esmsService.normalizePhone(phone);
    // Xác thực OTP
    await this.esmsService.verifyOtp(cleanPhone, otpCode, OtpActionType.LOGIN_OTP);

    let user = await this.userService.findOneByIdentifier(cleanPhone);

    // Nếu là khách hàng mới lần đầu đăng nhập OTP -> Tự động khởi tạo tài khoản CUSTOMER
    if (!user) {
      const last4 = cleanPhone.slice(-4);
      user = await this.userService.create({
        name: `Khách Hàng ${last4}`,
        phone: cleanPhone,
        email: `${cleanPhone}@customer.sfwms.vn`,
        passwordHash: 'password123',
        role: UserRole.CUSTOMER,
        status: 'ACTIVE',
      });
    }

    return this.login(user);
  }
}
