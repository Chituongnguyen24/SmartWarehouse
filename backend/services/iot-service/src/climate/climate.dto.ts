import { IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimulateClimateDto {
  @ApiProperty({ description: 'Nhiệt độ giả lập (°C)', example: 8.5 })
  @IsNumber()
  temperature: number;

  @ApiProperty({ description: 'Độ ẩm giả lập (%)', example: 85.0 })
  @IsNumber()
  humidity: number;

  @ApiProperty({ description: 'Bật chế độ giả lập', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class SilenceAlarmDto {
  @ApiPropertyOptional({ description: 'Thời gian tắt còi (giây), mặc định 60s', example: 60 })
  @IsNumber()
  @IsOptional()
  durationSeconds?: number;
}
