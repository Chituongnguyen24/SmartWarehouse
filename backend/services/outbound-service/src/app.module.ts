import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OutboundOrderModule } from './outbound-order/outbound-order.module';
import { OutboundOrder } from './outbound-order/outbound-order.entity';
import { OutboundOrderItem } from './outbound-order/outbound-order-item.entity';

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
        database: config.get<string>('DB_NAME', 'sfwms_outbound'),
        entities: [OutboundOrder, OutboundOrderItem],
        synchronize: true,
      }),
    }),
    OutboundOrderModule,
  ],
})
export class AppModule {}
