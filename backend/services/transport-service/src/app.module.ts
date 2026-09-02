import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransportController } from './transport/transport.controller';
import { TransportService } from './transport/transport.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [TransportController],
  providers: [
    TransportService
  ],
})
export class AppModule {}
