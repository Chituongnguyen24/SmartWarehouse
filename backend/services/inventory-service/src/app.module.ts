import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InventoryModule } from './inventory/inventory.module';
import { Lot } from './inventory/entities/lot.entity';
import { Supplier } from './inventory/entities/supplier.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';

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
        database: config.get<string>('DB_NAME', 'sfwms_inventory'),
        entities: [Lot, Supplier, StockMovement],
        synchronize: true,
      }),
    }),
    InventoryModule,
  ],
})
export class AppModule {}
