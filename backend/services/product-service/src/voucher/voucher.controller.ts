import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { Voucher } from './voucher.entity';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<Voucher[]> {
    if (activeOnly === 'true') {
      return this.voucherService.findActive();
    }
    return this.voucherService.findAll();
  }

  @Get('active')
  async findActive(): Promise<Voucher[]> {
    return this.voucherService.findActive();
  }

  @Get('validate/:code')
  async validateCode(
    @Param('code') code: string,
    @Query('orderAmount') orderAmount?: string,
    @Query('items') itemsJson?: string,
  ) {
    const amount = orderAmount ? parseFloat(orderAmount) : 0;
    let items = [];
    if (itemsJson) {
      try {
        items = JSON.parse(itemsJson);
      } catch (e) {}
    }
    return this.voucherService.validateCode(code, amount, items);
  }

  @Post('validate')
  async validatePost(
    @Body() body: { code: string; orderAmount: number; items?: any[]; customerId?: string },
  ) {
    return this.voucherService.validateCode(
      body.code,
      Number(body.orderAmount || 0),
      body.items || [],
      body.customerId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Voucher> {
    return this.voucherService.findOne(id);
  }

  @Post()
  async create(@Body() body: Partial<Voucher>): Promise<Voucher> {
    return this.voucherService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<Voucher>,
  ): Promise<Voucher> {
    return this.voucherService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.voucherService.remove(id);
  }
}

