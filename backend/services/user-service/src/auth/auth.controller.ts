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
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate via Firebase and return JWT' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firebaseUid: { type: 'string' },
        phone: { type: 'string' },
        name: { type: 'string' },
        address: { type: 'string' },
        lat: { type: 'number' },
        lng: { type: 'number' },
      },
      required: ['firebaseUid', 'phone', 'name'],
    },
  })
  async firebaseLogin(@Body() body: { firebaseUid: string; phone: string; name: string; address?: string; lat?: number; lng?: number }) {
    return this.authService.firebaseLogin(body.firebaseUid, body.phone, body.name, body.address, body.lat, body.lng);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (using sub from JWT)' })
  async getMe(@Request() req) {
    const user = await this.userService.findOneById(req.user.sub || req.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { passwordHash, ...result } = user;
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
    const userId = req.user.id;
    const updatedUser = await this.userService.update(userId, body);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
