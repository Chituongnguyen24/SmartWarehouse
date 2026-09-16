import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { UserService, CreateStaffDto, UpdateStaffDto } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.userService.updateProfile(userId, body);
  }

  // ─────────────────────────────────────────────────────────────
  //  STAFF MANAGEMENT ENDPOINTS (Full CRUD & Multi-Warehouse)
  // ─────────────────────────────────────────────────────────────

  @Get('staff')
  @ApiOperation({ summary: 'List all warehouse staff and managers' })
  @ApiQuery({ name: 'warehouseCode', required: false, description: 'Filter by warehouse code (WH-006, etc.)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, phone, code' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (ACTIVE, INACTIVE, ON_LEAVE)' })
  async findAllStaff(
    @Query('warehouseCode') warehouseCode?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.userService.findAllStaff({ warehouseCode, role, search, status });
  }

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision / Create a new staff account' })
  async createStaff(@Body() body: CreateStaffDto) {
    return this.userService.createStaff(body);
  }

  @Put('staff/:id')
  @ApiOperation({ summary: 'Update staff member details / reset password' })
  async updateStaff(@Param('id') id: string, @Body() body: UpdateStaffDto) {
    return this.userService.updateStaff(id, body);
  }

  @Patch('staff/:id/status')
  @ApiOperation({ summary: 'Toggle or update staff active status' })
  async toggleStaffStatus(@Param('id') id: string, @Body() body?: { status?: string }) {
    return this.userService.toggleStaffStatus(id, body?.status);
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete staff member account' })
  async deleteStaff(@Param('id') id: string) {
    await this.userService.remove(id);
    return { success: true, message: 'Đã xóa nhân viên thành công' };
  }

  // ─────────────────────────────────────────────────────────────
  //  GENERIC USER ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user by ID' })
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
