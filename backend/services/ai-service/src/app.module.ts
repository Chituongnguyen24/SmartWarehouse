import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai/ai.service';
import { AiController } from './ai/ai.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AiService],
  controllers: [AiController],
})
export class AppModule {}
