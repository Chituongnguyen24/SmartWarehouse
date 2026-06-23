import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('FreshKeep - Report Service')
    .setDescription('Tổng hợp dữ liệu, báo cáo nhập/xuất/tồn kho, xuất PDF/Excel.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port);
  console.log(`Report Service is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
