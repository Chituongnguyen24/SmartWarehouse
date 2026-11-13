import { Controller, Post, Put, Body, Get, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
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
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chủ động đổi mật khẩu trong trang Cá nhân' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldPassword: { type: 'string', example: 'oldpassword123' },
        newPassword: { type: 'string', example: 'newpassword123' },
      },
      required: ['oldPassword', 'newPassword'],
    },
  })
  async changePassword(@Request() req, @Body() body: any) {
    const userId = req.user.id || req.user.sub;
    const oldPassword = (body.oldPassword || '').toString();
    const newPassword = (body.newPassword || '').toString();
    return this.authService.changePassword(userId, oldPassword, newPassword);
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
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'customer@sfwms.vn' },
        phone: { type: 'string', example: '0909888999' },
        password: { type: 'string', example: 'newpassword123' },
      },
    },
  })
  async updateProfile(@Request() req, @Body() body: any) {
    const userId = req.user.id || req.user.sub;
    const updatedUser = await this.userService.update(userId, body);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
