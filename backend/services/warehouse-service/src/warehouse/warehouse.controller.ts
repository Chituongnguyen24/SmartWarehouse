import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('warehouses')
@Controller('warehouses')
export class WarehouseController {
  constructor(private warehouseService: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả kho hàng' })
  findAll() {
    return this.warehouseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết kho hàng theo ID' })
  findOne(@Param('id') id: string) {
    return this.warehouseService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết kho hàng theo mã code' })
  findByCode(@Param('code') code: string) {
    return this.warehouseService.findByCode(code);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo kho hàng mới' })
  create(@Body() body: any) {
    return this.warehouseService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin kho hàng' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.warehouseService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa kho hàng' })
  remove(@Param('id') id: string) {
    return this.warehouseService.remove(id);
  }
}
