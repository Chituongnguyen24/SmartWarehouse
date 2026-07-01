import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransportModule } from './transport/transport.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TransportModule,
    AuthModule,
  ],
})
export class AppModule {}
