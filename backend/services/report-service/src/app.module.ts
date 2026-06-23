import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReportModule,
  ],
})
export class AppModule {}
