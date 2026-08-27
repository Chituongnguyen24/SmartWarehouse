import { Module } from '@nestjs/common';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';
import { ProductService } from '../product/product.service';

@Module({
  imports: [],
  providers: [TransportService, ProductService],
  controllers: [TransportController],
  exports: [TransportService],
})
export class TransportModule {}
