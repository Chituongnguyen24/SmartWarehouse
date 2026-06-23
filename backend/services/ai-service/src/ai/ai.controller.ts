import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('predict-spoilage')
  @ApiOperation({ summary: 'Manually trigger spoilage risk recalculation for a zone' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        zoneId: { type: 'string', example: 'COLD' },
        temperature: { type: 'number', example: 8.5 },
        humidity: { type: 'number', example: 85 },
        durationMinutes: { type: 'number', example: 20 },
      },
      required: ['zoneId', 'temperature', 'humidity', 'durationMinutes'],
    },
  })
  predictSpoilage(@Body() body: any) {
    if (!body.zoneId || body.temperature === undefined || body.humidity === undefined || body.durationMinutes === undefined) {
      throw new BadRequestException('zoneId, temperature, humidity, and durationMinutes are required');
    }
    return this.aiService.recalculateZoneRisk(body.zoneId, body.temperature, body.humidity, body.durationMinutes);
  }

  @Get('forecast/:sku')
  @ApiOperation({ summary: 'Get AI demand forecasting and restock recommendations for a product' })
  getForecast(@Param('sku') sku: string) {
    if (!sku) {
      throw new BadRequestException('sku is required');
    }
    return this.aiService.getDemandForecast(sku);
  }
}
