import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { User } from './user/user.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { SystemSetting } from './system-settings/system-setting.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'sfwms_auth'),
        entities: [User, AuditLog, SystemSetting],
        synchronize: true,
      }),
    }),
    UserModule,
    AuthModule,
    AuditLogModule,
    SystemSettingsModule,
  ],
})
export class AppModule {}
