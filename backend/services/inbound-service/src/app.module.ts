import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InboundOrderModule } from './inbound-order/inbound-order.module';
import { QualityCheckModule } from './quality-check/quality-check.module';
import { InboundOrder } from './inbound-order/inbound-order.entity';
import { InboundOrderItem } from './inbound-order/inbound-order-item.entity';
import { QualityCheck } from './quality-check/quality-check.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'sfwms_inbound'),
        entities: [InboundOrder, InboundOrderItem, QualityCheck],
        synchronize: true,
      }),
    }),
    InboundOrderModule,
    QualityCheckModule,
  ],
})
export class AppModule {}
