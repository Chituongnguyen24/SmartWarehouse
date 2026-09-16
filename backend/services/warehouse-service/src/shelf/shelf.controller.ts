import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('shelves')
@Controller('shelves')
export class ShelfController {
  constructor(private shelfService: ShelfService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả kệ hàng' })
  findAll() {
    return this.shelfService.findAll();
  }

  @Get('zone/:zoneId')
  @ApiOperation({ summary: 'Lấy danh sách kệ hàng theo zone' })
  findByZone(@Param('zoneId') zoneId: string) {
    return this.shelfService.findByZone(zoneId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin kệ hàng theo ID' })
  findOne(@Param('id') id: string) {
    return this.shelfService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo kệ hàng mới' })
  create(@Body() body: any) {
    return this.shelfService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin kệ hàng' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.shelfService.update(id, body);
  }
}
