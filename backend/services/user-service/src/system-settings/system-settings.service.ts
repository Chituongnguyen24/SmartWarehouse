import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.settingsRepo.find();
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async updateSettings(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      let setting = await this.settingsRepo.findOne({ where: { key } });
      if (!setting) {
        setting = this.settingsRepo.create({ key, value });
      } else {
        setting.value = value;
      }
      await this.settingsRepo.save(setting);
    }
  }

  // Backup mock logic
  async triggerBackup(): Promise<{ message: string, timestamp: string }> {
    return {
      message: 'Backup triggered successfully',
      timestamp: new Date().toISOString()
    };
  }

  // Retrain AI mock logic
  async triggerAIRetrain(): Promise<{ message: string, jobId: string }> {
    return {
      message: 'AI retraining started',
      jobId: 'job_' + Math.random().toString(36).substring(7)
    };
  }
}
