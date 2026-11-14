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
        NODE_ENV: 'production',
        PORT: 3012,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3010,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3011,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3004,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3005,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3007,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3006,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3008,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
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
        NODE_ENV: 'production',
        PORT: 3013,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_NAME: 'sfwms_transport',
      },
    },
  ],
};

