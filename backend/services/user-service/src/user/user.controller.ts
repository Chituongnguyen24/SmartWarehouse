import { Controller, Get, Post, Patch, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'List all users (Admin & Manager only)' })
  findAll() {
    return this.userService.findAll();
  }

  @Post()
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
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user by ID (Admin only)' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return { message: 'User deleted successfully' };
  }

  @Patch(':id/toggle-lock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lock or unlock a user account (Admin only)' })
  async toggleLock(@Param('id') id: string) {
    const user = await this.userService.toggleLock(id);
    return {
      message: user.isLocked ? 'Tài khoản đã bị khóa' : 'Tài khoản đã được mở khóa',
      isLocked: user.isLocked,
    };
  }

  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user password to a random password (Admin only)' })
  async resetPassword(@Param('id') id: string) {
    const result = await this.userService.resetPassword(id);
    return {
      message: 'Mật khẩu đã được reset thành công',
      newPassword: result.newPassword,
    };
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: Object.values(UserRole), example: 'WAREHOUSE_MANAGER' },
      },
      required: ['role'],
    },
  })
  async updateRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    const user = await this.userService.updateRole(id, body.role);
    return {
      message: 'Vai trò đã được cập nhật',
      user: { id: user.id, name: user.name, role: user.role },
    };
  }
}
