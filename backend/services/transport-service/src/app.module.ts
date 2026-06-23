import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransportModule } from './transport/transport.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TransportModule,
  ],
})
export class AppModule {}
