import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SensorReading } from './sensor/sensor.entity';
import { SensorService } from './sensor/sensor.service';
import { SensorController } from './sensor/sensor.controller';
import { MqttGatewayService } from './mqtt/mqtt-gateway.service';
import { ShelfService } from './shelf/shelf.service';
import { ShelfController } from './shelf/shelf.controller';
import { ClimateService } from './climate/climate.service';
import { ClimateController } from './climate/climate.controller';
import { AuthModule } from './auth';
import { RabbitMqService } from './rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
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
  providers: [
    SensorService,
    MqttGatewayService,
    ShelfService,
    ClimateService,
    RabbitMqService,
  ],
  controllers: [
    SensorController,
    ShelfController,
    ClimateController,
  ],
  exports: [
    MqttGatewayService,
    ShelfService,
    ClimateService,
    RabbitMqService,
  ],
})
export class AppModule {}
