import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationGateway } from './notification/notification.gateway';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [NotificationGateway],
})
export class AppModule {}
