import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException, Optional } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EsmsService } from './esms.service';
import { OtpActionType } from './otp-verification.entity';
import { UserRole } from '../user/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditSeverity } from '../audit-log/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private esmsService: EsmsService,
    @Optional()
    private auditLogService?: AuditLogService,
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

    this.auditLogService?.create({
      actorId: user.id,
      actorName: user.name || 'Người dùng',
      actorRole: user.role || 'USER',
      action: 'Đăng nhập hệ thống thành công',
      actionCode: 'AUTH_LOGIN_SUCCESS',
      target: 'users',
      targetId: user.email || user.phone || user.id,
      serviceName: 'user-service',
      clientApp: 'WEB_DASHBOARD',
      severity: AuditSeverity.INFO,
      details: `Đăng nhập tài khoản ${user.name} (${user.role}) thành công.`,
      payloadAfter: { role: user.role, warehouseCode: user.warehouseCode },
    }).catch(() => {});

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
   * 4.1. GỬI MÃ OTP XÁC THỰC ĐỔI MẬT KHẨU
   */
  async sendChangePasswordOtp(userId: string) {
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }

    // Ngoại trừ role CUSTOMER
    if (user.role === UserRole.CUSTOMER) {
      throw new BadRequestException('Tài khoản khách hàng đăng nhập tự động qua mã OTP di động, không áp dụng tính năng mật khẩu tĩnh.');
    }

    if (!user.phone) {
      throw new BadRequestException('Tài khoản của bạn chưa có số điện thoại để nhận mã OTP xác thực. Vui lòng cập nhật số điện thoại tại mục Thông tin cá nhân trước!');
    }

    const phone = this.esmsService.normalizePhone(user.phone);
    const res = await this.esmsService.sendOtp(phone, OtpActionType.CHANGE_PASSWORD);

    // In nổi bật ra Terminal máy chủ để lập trình viên / kiểm thử viên lấy mã
    console.log(`\n\x1b[36m============================================================\x1b[0m`);
    console.log(`\x1b[36m🔐 [OTP SERVICE] YÊU CẦU ĐỔI MẬT KHẨU TÀI KHOẢN\x1b[0m`);
    console.log(`Tài khoản  : ${user.name} (${user.email || user.phone} - Role: ${user.role})`);
    console.log(`SĐT nhận   : ${phone}`);
    console.log(`\x1b[32m\x1b[1mMÃ OTP XÁC THỰC: [ ${res.otpCode} ] (Hiệu lực: 5 phút)\x1b[0m`);
    console.log(`\x1b[36m============================================================\x1b[0m\n`);

    const maskedPhone = phone.length >= 7 
      ? phone.substring(0, 3) + '****' + phone.substring(phone.length - 3)
      : phone;

    // TUYỆT ĐỐI KHÔNG TRẢ VỀ otpCode TRONG RESPONSE GỬI VỀ FRONTEND
    return {
      success: true,
      phone: maskedPhone,
      cooldownSeconds: res.cooldownSeconds || 60,
      message: `Mã OTP xác thực đổi mật khẩu đã được gửi đến số điện thoại ${maskedPhone}. Vui lòng kiểm tra Terminal để lấy mã.`,
    };
  }

  /**
   * 4.2. ĐỔI MẬT KHẨU CHỦ ĐỘNG TRONG PROFILE (KÈM XÁC THỰC MÃ OTP)
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string, otpCode: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự!');
    }

    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng!');
    }

    // Ngoại trừ role CUSTOMER: Khách hàng đăng nhập bằng OTP, không sử dụng mật khẩu tĩnh
    if (user.role === UserRole.CUSTOMER) {
      throw new BadRequestException('Tài khoản khách hàng đăng nhập tự động qua mã OTP di động, không áp dụng tính năng mật khẩu tĩnh.');
    }

    if (!user.phone) {
      throw new BadRequestException('Tài khoản chưa có số điện thoại để nhận mã xác thực OTP. Vui lòng cập nhật số điện thoại trước!');
    }

    const trimmedOtp = (otpCode || '').trim();
    if (!trimmedOtp) {
      throw new BadRequestException('Vui lòng nhập mã xác thực OTP 6 chữ số gửi về điện thoại / Terminal!');
    }

    // Xác thực mã OTP trước
    const phone = this.esmsService.normalizePhone(user.phone);
    await this.esmsService.verifyOtp(phone, trimmedOtp, OtpActionType.CHANGE_PASSWORD);

    if (oldPassword === newPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
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

    if (this.auditLogService) {
      await this.auditLogService.create({
        action: 'Người dùng tự đổi mật khẩu (Xác thực OTP)',
        actionCode: 'USER_PASSWORD_CHANGED',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        serviceName: 'user-service',
        clientApp: 'WEB_DASHBOARD',
        severity: AuditSeverity.INFO,
        target: 'users',
        targetId: user.id,
        details: `Người dùng ${user.name} (${user.email || user.phone} - Role: ${user.role}) đã xác thực OTP qua số điện thoại ${phone} và đổi mật khẩu đăng nhập thành công.`,
      }).catch(() => {});
    }

    return {
      success: true,
      message: 'Đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.',
    };
  }

  /**
   * 4.1. GỬI MÃ OTP ĐỂ XÁC NHẬN CẬP NHẬT SỐ ĐIỆN THOẠI MỚI
   * (Lưu ý: Mã OTP CHỈ in ra terminal, KHÔNG trả về giao diện)
   */
  async sendPhoneUpdateOtp(userId: string, newPhone: string) {
    const user = await this.userService.findOneById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng!');

    const phone = this.esmsService.normalizePhone(newPhone);
    if (!this.esmsService.isValidVietnamPhone(phone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
    }

    if (phone === user.phone) {
      throw new BadRequestException('Số điện thoại mới trùng khớp với số điện thoại hiện tại của bạn!');
    }

    // Kiểm tra số điện thoại có bị trùng với tài khoản khác
    const existing = await this.userService.findByPhone(phone);
    if (existing && existing.id !== user.id) {
      throw new ConflictException('Số điện thoại này đã được sử dụng bởi một tài khoản khác trong hệ thống!');
    }

    const res = await this.esmsService.sendOtp(phone, OtpActionType.UPDATE_PHONE);

    // In nổi bật ra Terminal máy chủ để lập trình viên / kiểm thử viên lấy mã
    console.log(`\n\x1b[36m============================================================\x1b[0m`);
    console.log(`\x1b[36m📱 [OTP SERVICE] YÊU CẦU CẬP NHẬT SỐ ĐIỆN THOẠI MỚI\x1b[0m`);
    console.log(`Tài khoản  : ${user.name} (${user.email || user.phone} - Role: ${user.role})`);
    console.log(`SĐT mới    : ${phone}`);
    console.log(`\x1b[32m\x1b[1mMÃ OTP XÁC THỰC: [ ${res.otpCode} ] (Hiệu lực: 5 phút)\x1b[0m`);
    console.log(`\x1b[36m============================================================\x1b[0m\n`);

    // TUYỆT ĐỐI KHÔNG TRẢ VỀ otpCode TRONG RESPONSE GỬI VỀ FRONTEND
    return {
      success: true,
      phone,
      cooldownSeconds: res.cooldownSeconds || 60,
      message: 'Mã OTP xác thực đã được gửi đến số điện thoại. Vui lòng kiểm tra Terminal của máy chủ để nhận mã.',
    };
  }

  /**
   * 4.2. XÁC THỰC MÃ OTP VÀ HOÀN TẤT CẬP NHẬT SỐ ĐIỆN THOẠI
   */
  async verifyPhoneUpdateOtp(userId: string, newPhone: string, otpCode: string) {
    const user = await this.userService.findOneById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng!');

    const phone = this.esmsService.normalizePhone(newPhone);
    await this.esmsService.verifyOtp(phone, otpCode, OtpActionType.UPDATE_PHONE);

    const oldPhone = user.phone;
    user.phone = phone;
    await this.userService.saveUser(user);

    if (this.auditLogService) {
      await this.auditLogService.create({
        action: 'Cập nhật số điện thoại cá nhân (Xác thực OTP)',
        actionCode: 'USER_PHONE_UPDATED',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        serviceName: 'user-service',
        clientApp: 'WEB_DASHBOARD',
        severity: AuditSeverity.INFO,
        target: 'users',
        targetId: user.id,
        details: `Người dùng ${user.name} đã xác thực mã OTP và đổi số điện thoại thành công từ "${oldPhone || 'Chưa có'}" sang "${phone}".`,
        payloadBefore: { phone: oldPhone },
        payloadAfter: { phone },
      }).catch(() => {});
    }

    return {
      success: true,
      phone: user.phone,
      message: 'Cập nhật số điện thoại thành công!',
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
