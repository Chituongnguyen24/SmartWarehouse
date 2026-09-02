import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WarehouseModule } from './warehouse/warehouse.module';
import { ZoneModule } from './zone/zone.module';
import { ShelfModule } from './shelf/shelf.module';

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
        database: config.get<string>('DB_NAME', 'sfwms_warehouse'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    WarehouseModule,
    ZoneModule,
    ShelfModule,
  ],
})
export class AppModule {}
