const path = require('path');
const dotenv = require('dotenv');

// Nạp cấu hình biến môi trường bảo mật từ file .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const commonEnv = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  JWT_SECRET: process.env.JWT_SECRET || 'ee20b6d5a12b988c1be1ee0d5b7931dd513080f001986f20eeab2df633a8ca5f',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  RABBITMQ_HOST: process.env.RABBITMQ_HOST || '127.0.0.1',
  RABBITMQ_PORT: process.env.RABBITMQ_PORT || 5672,
  RABBITMQ_USER: process.env.RABBITMQ_USER || 'guest',
  RABBITMQ_PASS: process.env.RABBITMQ_PASS || 'guest',
  ESMS_API_KEY: process.env.ESMS_API_KEY || '',
  ESMS_SECRET_KEY: process.env.ESMS_SECRET_KEY || '',
  ESMS_SMS_TYPE: process.env.ESMS_SMS_TYPE || '2',
  ESMS_BRANDNAME: process.env.ESMS_BRANDNAME || 'Baotrixemay',
  ESMS_LIVE_SEND: process.env.ESMS_LIVE_SEND || 'false',
};

module.exports = {
  apps: [
    // 1. User & Authentication Service (Cổng 3012)
    {
      name: 'sfwms-user',
      cwd: './backend/services/user-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        ...commonEnv,
        PORT: 3012,
        DB_NAME: 'sfwms_auth',
      },
    },

    // 2. Product Service (Cổng 3010)
    {
      name: 'sfwms-product',
      cwd: './backend/services/product-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        ...commonEnv,
        PORT: 3010,
        DB_NAME: 'sfwms_product',
      },
    },

    // 3. Inventory Service (Cổng 3011)
    {
      name: 'sfwms-inventory',
      cwd: './backend/services/inventory-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        ...commonEnv,
        PORT: 3011,
        DB_NAME: 'sfwms_inventory',
      },
    },

    // 4. Order & Realtime Gateway Service (Cổng 3004)
    {
      name: 'sfwms-order',
      cwd: './backend/services/order-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        ...commonEnv,
        PORT: 3004,
        DB_NAME: 'sfwms_order',
      },
    },

    // 5. Warehouse Service (Cổng 3005)
    {
      name: 'sfwms-warehouse',
      cwd: './backend/services/warehouse-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        ...commonEnv,
        PORT: 3005,
        DB_NAME: 'sfwms_warehouse',
      },
    },

    // 6. Outbound Service (Cổng 3007)
    {
      name: 'sfwms-outbound',
      cwd: './backend/services/outbound-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        ...commonEnv,
        PORT: 3007,
        DB_NAME: 'sfwms_outbound',
      },
    },

    // 7. Inbound Service (Cổng 3006)
    {
      name: 'sfwms-inbound',
      cwd: './backend/services/inbound-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        ...commonEnv,
        PORT: 3006,
        DB_NAME: 'sfwms_inbound',
      },
    },

    // 8. Report Service (Cổng 3008)
    {
      name: 'sfwms-report',
      cwd: './backend/services/report-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        ...commonEnv,
        PORT: 3008,
        DB_NAME: 'sfwms_report',
      },
    },

    // 9. Transport Service (Cổng 3013)
    {
      name: 'sfwms-transport',
      cwd: './backend/services/transport-service',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      env: {
        ...commonEnv,
        PORT: 3013,
        DB_NAME: 'sfwms_transport',
      },
    },

    // 10. Customer Web (Next.js SSR - Cổng 3000)
    {
      name: 'sfwms-customer-web',
      cwd: './frontend/customer-web',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '450M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
