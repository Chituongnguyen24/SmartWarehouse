import { Controller, Get, Post, Body, Put, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';

@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getSettings() {
    return await this.settingsService.getAllSettings();
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async updateSettings(@Body() updates: Record<string, string>) {
    await this.settingsService.updateSettings(updates);
    return { message: 'Settings updated successfully' };
  }

  @Post('backup')
  @Roles(UserRole.ADMIN)
  async triggerBackup() {
    return await this.settingsService.triggerBackup();
  }

  @Post('ai/retrain')
  @Roles(UserRole.ADMIN)
  async triggerAIRetrain() {
    return await this.settingsService.triggerAIRetrain();
  }
}
