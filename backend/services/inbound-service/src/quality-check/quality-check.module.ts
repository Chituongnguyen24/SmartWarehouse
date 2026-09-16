import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityCheck } from './quality-check.entity';
import { QualityCheckService } from './quality-check.service';

@Module({
  imports: [TypeOrmModule.forFeature([QualityCheck])],
  providers: [QualityCheckService],
  exports: [QualityCheckService],
})
export class QualityCheckModule {}
