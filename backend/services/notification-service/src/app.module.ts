import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationGateway } from './notification/notification.gateway';
import { NotificationController } from './notification/notification.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [NotificationController],
  providers: [NotificationGateway],
})
export class AppModule {}
