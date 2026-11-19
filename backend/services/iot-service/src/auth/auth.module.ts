import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          process.env.JWT_SECRET || 'super-secret-jwt-key',
        ),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [JwtStrategy, RolesGuard],
  exports: [PassportModule, JwtModule, JwtStrategy, RolesGuard],
})
export class AuthModule {}
