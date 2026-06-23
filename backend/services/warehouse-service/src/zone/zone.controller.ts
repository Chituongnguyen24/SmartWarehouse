import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('zones')
@Controller('zones')
export class ZoneController {
  constructor(private zoneService: ZoneService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả khu vực kho' })
  findAll() {
    return this.zoneService.findAll();
  }

  @Get('capacity')
  @ApiOperation({ summary: 'Tổng quan sức chứa từng khu vực kho' })
  getCapacity() {
    return this.zoneService.getCapacitySummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khu vực kho theo ID' })
  findOne(@Param('id') id: string) {
    return this.zoneService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Lấy thông tin khu vực kho theo code (COLD/FROZEN/DRY)' })
  findByCode(@Param('code') code: string) {
    return this.zoneService.findByCode(code);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khu vực kho mới' })
  create(@Body() body: any) {
    return this.zoneService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khu vực kho' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.zoneService.update(id, body);
  }
}
