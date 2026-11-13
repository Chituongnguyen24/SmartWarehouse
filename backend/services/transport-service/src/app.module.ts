import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransportController } from './transport/transport.controller';
import { TransportService } from './transport/transport.service';
import { ProductService } from './product/product.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [TransportController],
  providers: [
    TransportService,
    ProductService,
  ],
})
export class AppModule {}
