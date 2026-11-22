import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShelfService } from './shelf.service';
import { LocateShelfDto, ChirpShelfDto, StopShelfDto, CompleteShelfDto, SetBuzzerModeDto } from './shelf.dto';

@ApiTags('IoT Shelves')
@ApiBearerAuth()
@Controller(['api/iot/shelf', 'shelf'])
export class ShelfController {
  constructor(private readonly shelfService: ShelfService) {}

  @Post('locate')
  @ApiOperation({ summary: 'Kích hoạt định vị kệ hàng (Bật đèn LED & Còi nhấp nháy)' })
  locateShelf(@Body() dto: LocateShelfDto) {
    return this.shelfService.locateShelf(dto);
  }

  @Post('chirp')
  @ApiOperation({ summary: 'Bóp còi Smartkey định vị kệ hàng (như remote ô tô/xe máy)' })
  chirpShelf(@Body() dto: ChirpShelfDto) {
    return this.shelfService.chirpShelf(dto);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Tắt đèn và còi kệ (Chuyển trạng thái sang Đã đến kệ - ARRIVED)' })
  stopShelf(@Body() dto: StopShelfDto) {
    return this.shelfService.stopShelf(dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Xác nhận hoàn thành lấy hàng tại kệ (sau khi quét barcode)' })
  completeShelf(@Body() dto: CompleteShelfDto) {
    return this.shelfService.completeShelf(dto);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Đặt lại toàn bộ 3 kệ hàng về trạng thái Sẵn sàng (IDLE)' })
  resetAll() {
    return this.shelfService.resetAllShelves();
  }

  @Post('buzzer')
  @ApiOperation({ summary: 'Bật/tắt chế độ còi báo khi lấy hàng (tắt còi chỉ sáng đèn)' })
  setBuzzerMode(@Body() dto: SetBuzzerModeDto) {
    const enabled =
      typeof dto.enabled === 'boolean'
        ? dto.enabled
        : typeof dto.muted === 'boolean'
          ? !dto.muted
          : true;
    return this.shelfService.setBuzzerMode(enabled);
  }

  @Get('status')
  @ApiOperation({ summary: 'Lấy trạng thái chi tiết thời gian thực của 3 kệ A1, A2, A3' })
  getStatus() {
    return this.shelfService.getAllStatus();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Lấy danh sách nhật ký sự kiện phần cứng IoT gần đây' })
  getLogs(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 30;
    return this.shelfService.getEventLogs(l);
  }
}
