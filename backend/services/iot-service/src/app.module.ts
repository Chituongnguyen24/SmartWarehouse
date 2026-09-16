import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SensorReading } from './sensor/sensor.entity';
import { SensorService } from './sensor/sensor.service';
import { SensorController } from './sensor/sensor.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqlite',
        database: 'sfwms_iot.db',
        entities: [SensorReading],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([SensorReading]),
  ],
  providers: [SensorService],
  controllers: [SensorController],
})
export class AppModule {}
