import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InboundOrderModule } from './inbound-order/inbound-order.module';
import { InboundOrder } from './inbound-order/inbound-order.entity';
import { InboundOrderItem } from './inbound-order/inbound-order-item.entity';

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
        entities: [InboundOrder, InboundOrderItem],
        synchronize: true,
      }),
    }),
    InboundOrderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
