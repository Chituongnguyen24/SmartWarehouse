import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('onboard')
  @ApiOperation({ summary: 'Onboard a new customer from Firebase Phone Auth' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firebaseUid: { type: 'string' },
        phone: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['firebaseUid', 'phone', 'name'],
    },
  })
  async onboardCustomer(@Body() body: { firebaseUid: string; phone: string; name: string }) {
    return this.userService.onboardCustomer(body.firebaseUid, body.phone, body.name);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile (name, gender, dob, address)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        gender: { type: 'string' },
        dob: { type: 'string', format: 'date' },
        addressStr: { type: 'string' },
        lat: { type: 'number' },
        lng: { type: 'number' },
      }
    }
  })
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.userService.updateProfile(userId, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'List all users (Admin & Manager only)' })
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'newuser@sfwms.vn' },
        passwordHash: { type: 'string', example: 'password123' },
        role: { type: 'string', enum: Object.values(UserRole), example: 'WAREHOUSE_STAFF' },
      },
      required: ['name', 'email', 'role'],
    },
  })
  create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user by ID (Admin only)' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
