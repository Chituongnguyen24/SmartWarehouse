import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Distributed Tracing: Correlation ID Middleware
  app.use((req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('CityMart - Outbound Service')
    .setDescription('Quản lý quy trình xuất kho: yêu cầu xuất, FEFO ranking, xác nhận xuất kho.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3007;
  await app.listen(port, '0.0.0.0');
  console.log(`Outbound Service is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
