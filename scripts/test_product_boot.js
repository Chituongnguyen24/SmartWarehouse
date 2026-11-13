const { NestFactory } = require('@nestjs/core');
const path = require('path');

async function testBoot() {
  console.log('1. Requiring AppModule...');
  const { AppModule } = require(path.resolve(__dirname, '../backend/services/product-service/dist/app.module'));
  console.log('2. AppModule loaded successfully. Creating Nest app...');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  console.log('3. Nest app created. Enabling CORS...');
  app.enableCors();
  console.log('4. Starting listen on 3010...');
  await app.listen(3010, '0.0.0.0');
  console.log('5. Product Service listening on port 3010!');
}

testBoot().catch(err => {
  console.error('Boot failed with error:', err);
  process.exit(1);
});

