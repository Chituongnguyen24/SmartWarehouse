import { Controller, Post, Put, Body, Get, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'admin@sfwms.vn' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  async login(@Body() body: any) {
    const identifier = (body.email || body.phone || body.account || body.code || body.username || body.identifier || '').toString().trim();
    const password = (body.password || body.pass || '').toString();
    const user = await this.authService.validateUser(identifier, password);
    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }
    return this.authService.login(user);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã xác thực OTP qua tin nhắn SMS (eSMS.vn)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '0908123456' },
        actionType: { type: 'string', example: 'RESET_PASSWORD', enum: ['REGISTER', 'RESET_PASSWORD', 'LOGIN_OTP'] },
      },
      required: ['phone'],
    },
  })
  async sendOtp(@Body() body: any) {
    const phone = (body.phone || body.phoneNumber || '').toString().trim();
    const actionType = (body.actionType || body.type || 'RESET_PASSWORD').toString().trim().toUpperCase();
    return this.authService.sendOtp(phone, actionType);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác minh mã OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '0908123456' },
        otpCode: { type: 'string', example: '123456' },
        actionType: { type: 'string', example: 'RESET_PASSWORD' },
      },
      required: ['phone', 'otpCode'],
    },
  })
  async verifyOtp(@Body() body: any) {
    const phone = (body.phone || '').toString().trim();
    const otpCode = (body.otpCode || body.otp || '').toString().trim();
    const actionType = body.actionType ? body.actionType.toString().trim().toUpperCase() : undefined;
    return this.authService.verifyOtp(phone, otpCode, actionType);
  }

  @Post('forgot-password/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tự đặt lại mật khẩu mới bằng OTP SMS (không cần qua quản trị viên)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '0908123456' },
        otpCode: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: 'newpassword123' },
      },
      required: ['phone', 'otpCode', 'newPassword'],
    },
  })
  async forgotPasswordConfirm(@Body() body: any) {
    const phone = (body.phone || '').toString().trim();
    const otpCode = (body.otpCode || body.otp || '').toString().trim();
    const newPassword = (body.newPassword || body.password || '').toString();
    return this.authService.forgotPasswordConfirm(phone, otpCode, newPassword);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới kèm mã OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '0908123456' },
        name: { type: 'string', example: 'Nguyễn Văn A' },
        password: { type: 'string', example: 'password123' },
        otpCode: { type: 'string', example: '123456' },
        role: { type: 'string', example: 'CUSTOMER' },
      },
      required: ['phone', 'name', 'password', 'otpCode'],
    },
  })
  async register(@Body() body: any) {
    return this.authService.registerWithOtp(body);
  }

  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập nhanh bằng số điện thoại và OTP SMS (không cần mật khẩu)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '0908123456' },
        otpCode: { type: 'string', example: '123456' },
      },
      required: ['phone', 'otpCode'],
    },
  })
  async loginOtp(@Body() body: any) {
    const phone = (body.phone || '').toString().trim();
    const otpCode = (body.otpCode || body.otp || '').toString().trim();
    return this.authService.loginWithOtp(phone, otpCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP xác nhận trước khi đổi mật khẩu (Mã OTP chỉ in ra Terminal)' })
  async sendChangePasswordOtp(@Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.authService.sendChangePasswordOtp(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chủ động đổi mật khẩu trong trang Cá nhân (yêu cầu mã OTP)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldPassword: { type: 'string', example: 'oldpassword123' },
        newPassword: { type: 'string', example: 'newpassword123' },
        otpCode: { type: 'string', example: '123456' },
      },
      required: ['oldPassword', 'newPassword', 'otpCode'],
    },
  })
  async changePassword(@Request() req, @Body() body: any) {
    const userId = req.user.id || req.user.sub;
    const oldPassword = (body.oldPassword || '').toString();
    const newPassword = (body.newPassword || '').toString();
    const otpCode = (body.otpCode || body.otp || '').toString().trim();
    return this.authService.changePassword(userId, oldPassword, newPassword, otpCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('phone/send-otp')
  @ApiOperation({ summary: 'Gửi mã OTP xác nhận đổi số điện thoại (Mã OTP chỉ in ra Terminal)' })
  async sendPhoneOtp(@Request() req, @Body() body: { phone: string }) {
    const userId = req.user.id || req.user.sub;
    const phone = (body.phone || '').toString().trim();
    if (!phone) {
      throw new BadRequestException('Vui lòng nhập số điện thoại mới cần cập nhật!');
    }
    return this.authService.sendPhoneUpdateOtp(userId, phone);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('phone/verify-otp')
  @ApiOperation({ summary: 'Xác thực mã OTP và cập nhật số điện thoại mới' })
  async verifyPhoneOtp(@Request() req, @Body() body: { phone: string; otpCode: string }) {
    const userId = req.user.id || req.user.sub;
    const phone = (body.phone || '').toString().trim();
    const otpCode = (body.otpCode || '').toString().trim();
    if (!phone || !otpCode) {
      throw new BadRequestException('Vui lòng nhập đầy đủ số điện thoại và mã OTP xác thực 6 chữ số!');
    }
    return this.authService.verifyPhoneUpdateOtp(userId, phone, otpCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (alias)' })
  getMe(@Request() req) {
    const { passwordHash, ...result } = req.user;
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    const { passwordHash, ...result } = req.user;
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile (Chỉ được đổi tên, địa chỉ, thông tin cá nhân cơ bản)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        address: { type: 'string', example: '123 Nguyễn Văn Cừ, Q.5' },
        gender: { type: 'string', example: 'MALE' },
        dob: { type: 'string', example: '1995-05-20' },
      },
    },
  })
  async updateProfile(@Request() req, @Body() body: any) {
    const userId = req.user.id || req.user.sub;
    // BẢO MẬT: Chỉ cho phép cập nhật các trường được phép thay đổi cá nhân
    const allowedUpdates: any = {};
    if (body.name && typeof body.name === 'string' && body.name.trim().length > 0) {
      allowedUpdates.name = body.name.trim();
    }
    if (body.address !== undefined) {
      allowedUpdates.address = typeof body.address === 'string' ? body.address.trim() : body.address;
    }
    if (body.gender !== undefined) {
      allowedUpdates.gender = body.gender;
    }
    if (body.dob !== undefined) {
      allowedUpdates.dob = body.dob;
    }

    const updatedUser = await this.userService.update(userId, allowedUpdates);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
