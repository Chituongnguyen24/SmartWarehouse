import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClimateService } from './climate.service';
import { SimulateClimateDto, SilenceAlarmDto } from './climate.dto';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '../auth';

@ApiTags('IoT Climate')
@ApiBearerAuth()
@Controller(['api/iot/climate', 'climate'])
export class ClimateController {
  constructor(private readonly climateService: ClimateService) {}

  @Get('status')
  @ApiOperation({ summary: 'Lấy trạng thái nhiệt độ, độ ẩm và cảnh báo an toàn kho mát' })
  getStatus() {
    return this.climateService.getStatus();
  }

  @Post('simulate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Giả lập thông số nhiệt độ / độ ẩm để kiểm thử các kịch bản bất thường' })
  simulate(@Body() dto: SimulateClimateDto) {
    return this.climateService.setSimulation(dto);
  }

  @Post('alarm/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF)
  @ApiOperation({ summary: 'Kích hoạt thử nghiệm báo động khẩn cấp đồng loạt 3 kệ A1, A2, A3' })
  testAlarm() {
    return this.climateService.triggerTestAlarm();
  }

  @Post('alarm/silence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF)
  @ApiOperation({ summary: 'Tạm tắt còi báo động trong 60 giây (vẫn duy trì đèn cảnh báo)' })
  silenceAlarm(@Body() dto: SilenceAlarmDto) {
    return this.climateService.silenceAlarm(dto);
  }

  @Post('alarm/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Khôi phục an toàn (Chỉ được phép khi cả Nhiệt độ và Độ ẩm đạt chuẩn)' })
  clearAlarm() {
    return this.climateService.clearAlarm();
  }
}
