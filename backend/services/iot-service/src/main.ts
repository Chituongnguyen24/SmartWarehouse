import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('CityMart SFWMS - IoT Service Gateway')
    .setDescription('Centralized IoT Gateway managing Shelves A1, A2, A3 (Pick-to-Light) and Cool Storage Environmental Climate Monitoring.')
    .setVersion('2.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`IoT Service Gateway is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api`);
}
bootstrap();
