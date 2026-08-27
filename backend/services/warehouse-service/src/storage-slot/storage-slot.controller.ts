import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { StorageSlotService } from './storage-slot.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('storage-slots')
@Controller('storage-slots')
export class StorageSlotController {
  constructor(private slotService: StorageSlotService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả ô chứa hàng' })
  @ApiQuery({ name: 'zone', required: false, example: 'COLD' })
  findAll(@Query('zone') zone?: string) {
    return this.slotService.findAll(zone);
  }

  @Get('empty')
  @ApiOperation({ summary: 'Lấy danh sách ô chứa trống' })
  @ApiQuery({ name: 'zone', required: false, example: 'COLD' })
  findEmpty(@Query('zone') zone?: string) {
    return this.slotService.findEmpty(zone);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Gợi ý ô chứa phù hợp cho sản phẩm' })
  @ApiQuery({ name: 'zone', required: true, example: 'COLD' })
  @ApiQuery({ name: 'priority', required: false, example: 'true' })
  suggestSlot(@Query('zone') zone: string, @Query('priority') priority?: string) {
    return this.slotService.suggestSlot(zone, priority === 'true');
  }

  @Get('map/:zoneCode')
  @ApiOperation({ summary: 'Xem sơ đồ vị trí kho theo zone' })
  getSlotMap(@Param('zoneCode') zoneCode: string) {
    return this.slotService.getSlotMap(zoneCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin ô chứa theo ID' })
  findOne(@Param('id') id: string) {
    return this.slotService.findOne(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Gán lô hàng vào ô chứa' })
  assignLot(@Param('id') id: string, @Body() body: any) {
    return this.slotService.assignLot(id, body);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Giải phóng ô chứa (xuất hết lô hàng)' })
  releaseLot(@Param('id') id: string) {
    return this.slotService.releaseLot(id);
  }

  @Put(':id/maintenance')
  @ApiOperation({ summary: 'Đặt ô chứa vào trạng thái bảo trì' })
  setMaintenance(@Param('id') id: string) {
    return this.slotService.setMaintenance(id);
  }
}
