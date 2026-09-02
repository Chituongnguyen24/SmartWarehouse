import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('CityMart - Order Service')
    .setDescription('Quản lý thông tin đơn hàng, chi tiết đơn và trạng thái xử lý.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port, '0.0.0.0');
  console.log(`Order Service is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
