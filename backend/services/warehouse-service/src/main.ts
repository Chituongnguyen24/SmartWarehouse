import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('CityMart - Warehouse Service')
    .setDescription('Quản lý cấu trúc vật lý kho: zone, kệ hàng, ô chứa hàng (storage slot).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Warehouse Service is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
