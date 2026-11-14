import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { OtpVerification } from './otp-verification.entity';
import { EsmsService } from './esms.service';

@Module({
  imports: [
    UserModule,
    AuditLogModule,
    PassportModule,
    TypeOrmModule.forFeature([OtpVerification]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'sfwms_jwt_secret_key_2026'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, EsmsService],
  controllers: [AuthController],
  exports: [AuthService, EsmsService],
})
export class AuthModule {}
