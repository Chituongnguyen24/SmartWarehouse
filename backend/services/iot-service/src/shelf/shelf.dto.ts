import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocateShelfDto {
  @ApiProperty({ description: 'Mã kệ hàng (A1, A2, A3)', example: 'A1' })
  @IsString()
  @IsNotEmpty()
  shelfCode: string;

  @ApiPropertyOptional({ description: 'Mã đơn hàng xuất kho', example: 'ORD-20261118-001' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Tên sản phẩm tại kệ', example: 'Thịt đùi heo CP' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ description: 'Số lượng cần lấy', example: 2 })
  @IsNumber()
  @IsOptional()
  qty?: number;

  @ApiPropertyOptional({ description: 'Thứ tự bước lấy hàng hiện tại', example: 1 })
  @IsNumber()
  @IsOptional()
  step?: number;

  @ApiPropertyOptional({ description: 'Tổng số bước lấy hàng trên 3 kệ IoT của đơn', example: 3 })
  @IsNumber()
  @IsOptional()
  totalSteps?: number;

  @ApiPropertyOptional({ description: 'Mã vị trí slot', example: 'A1-01' })
  @IsString()
  @IsOptional()
  slotCode?: string;

  @ApiPropertyOptional({ description: 'Mã kho', example: 'WH-006' })
  @IsString()
  @IsOptional()
  warehouseCode?: string;

  @ApiPropertyOptional({ description: 'Bật/tắt còi khi định vị kệ (mặc định theo cấu hình hệ thống)', example: true })
  @IsBoolean()
  @IsOptional()
  buzzerEnabled?: boolean;
}

export class SetBuzzerModeDto {
  @ApiPropertyOptional({ description: 'Bật còi báo (true = Đèn + Còi, false = Chỉ sáng đèn)', example: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Tắt còi báo (true = Chỉ sáng đèn, false = Đèn + Còi)', example: true })
  @IsBoolean()
  @IsOptional()
  muted?: boolean;
}

export class ChirpShelfDto {
  @ApiProperty({ description: 'Mã kệ hàng (A1, A2, A3)', example: 'A2' })
  @IsString()
  @IsNotEmpty()
  shelfCode: string;

  @ApiPropertyOptional({ description: 'Mã kho', example: 'WH-006' })
  @IsString()
  @IsOptional()
  warehouseCode?: string;
}

export class StopShelfDto {
  @ApiProperty({ description: 'Mã kệ hàng (A1, A2, A3)', example: 'A1' })
  @IsString()
  @IsNotEmpty()
  shelfCode: string;

  @ApiPropertyOptional({ description: 'Mã kho', example: 'WH-006' })
  @IsString()
  @IsOptional()
  warehouseCode?: string;
}

export class CompleteShelfDto {
  @ApiProperty({ description: 'Mã kệ hàng (A1, A2, A3)', example: 'A1' })
  @IsString()
  @IsNotEmpty()
  shelfCode: string;

  @ApiPropertyOptional({ description: 'Mã đơn hàng', example: 'ORD-20261118-001' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Mã kho', example: 'WH-006' })
  @IsString()
  @IsOptional()
  warehouseCode?: string;
}
