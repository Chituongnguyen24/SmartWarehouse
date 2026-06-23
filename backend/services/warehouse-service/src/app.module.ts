import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ZoneModule } from './zone/zone.module';
import { ShelfModule } from './shelf/shelf.module';
import { StorageSlotModule } from './storage-slot/storage-slot.module';
import { Zone } from './zone/zone.entity';
import { Shelf } from './shelf/shelf.entity';
import { StorageSlot } from './storage-slot/storage-slot.entity';

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
        entities: [Zone, Shelf, StorageSlot],
        synchronize: true,
      }),
    }),
    ZoneModule,
    ShelfModule,
    StorageSlotModule,
  ],
})
export class AppModule {}
