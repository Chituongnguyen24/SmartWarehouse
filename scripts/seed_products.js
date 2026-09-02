/**
 * Script Seed Sản Phẩm từ JSON vào Cơ sở dữ liệu PostgreSQL (sfwms_product)
 * Sử dụng: node scripts/seed_products.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sfwms_product',
};

async function seedProducts() {
  const jsonPath = path.join(__dirname, 'data', 'products.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${jsonPath}`);
    process.exit(1);
  }

  console.log(`📖 Đang đọc dữ liệu từ: ${jsonPath}...`);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const products = JSON.parse(rawData);
  console.log(`📦 Tổng số sản phẩm trong file: ${products.length.toLocaleString('vi-VN')} sản phẩm.`);

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log(`✅ Đã kết nối cơ sở dữ liệu ${DB_CONFIG.database} tại ${DB_CONFIG.host}:${DB_CONFIG.port}`);

    // Đảm bảo extension uuid-ossp tồn tại
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Tạo bảng nếu chưa tồn tại
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        storage_type VARCHAR(50) DEFAULT 'DRY',
        min_temp FLOAT,
        max_temp FLOAT,
        max_humidity FLOAT,
        unit VARCHAR(50) DEFAULT 'Cái',
        price NUMERIC DEFAULT 0,
        image_url TEXT,
        description TEXT,
        origin VARCHAR(255) DEFAULT 'Việt Nam',
        preservation TEXT,
        is_flash_sale BOOLEAN DEFAULT false,
        discount_percent INT DEFAULT 0,
        rating NUMERIC DEFAULT 5.0,
        sold_count INT DEFAULT 0,
        stock INT DEFAULT 100,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('🚀 Bắt đầu nạp dữ liệu (batch insert 200 items/lần)...');
    const BATCH_SIZE = 200;
    let insertedCount = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      const values = [];
      const placeholders = [];

      batch.forEach((p, index) => {
        const offset = index * 19;
        placeholders.push(`(
          $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5},
          $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10},
          $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15},
          $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}
        )`);

        values.push(
          p.id,
          p.sku,
          p.name,
          p.category || 'Khác',
          p.storage_type || 'DRY',
          p.min_temp ?? null,
          p.max_temp ?? null,
          p.max_humidity ?? null,
          p.unit || 'Cái',
          Number(p.price) || 0,
          p.image_url || null,
          p.description || null,
          p.origin || 'Việt Nam',
          p.preservation || null,
          Boolean(p.is_flash_sale),
          Number(p.discount_percent) || 0,
          Number(p.rating) || 5.0,
          Number(p.sold_count) || 0,
          Number(p.stock) || 100
        );
      });

      const queryText = `
        INSERT INTO products (
          id, sku, name, category, storage_type,
          min_temp, max_temp, max_humidity, unit, price,
          image_url, description, origin, preservation, is_flash_sale,
          discount_percent, rating, sold_count, stock
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          storage_type = EXCLUDED.storage_type,
          min_temp = EXCLUDED.min_temp,
          max_temp = EXCLUDED.max_temp,
          max_humidity = EXCLUDED.max_humidity,
          unit = EXCLUDED.unit,
          price = EXCLUDED.price,
          image_url = EXCLUDED.image_url,
          description = EXCLUDED.description,
          origin = EXCLUDED.origin,
          preservation = EXCLUDED.preservation,
          is_flash_sale = EXCLUDED.is_flash_sale,
          discount_percent = EXCLUDED.discount_percent,
          rating = EXCLUDED.rating,
          sold_count = EXCLUDED.sold_count,
          stock = EXCLUDED.stock;
      `;

      await client.query(queryText, values);
      insertedCount += batch.length;
      process.stdout.write(`\r⏳ Tiến độ: ${insertedCount} / ${products.length} sản phẩm...`);
    }

    console.log('\n');
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    console.log(`🎉 HOÀN TẤT SEED DỮ LIỆU! Tổng sản phẩm hiện có trong database: ${countRes.rows[0].count}`);

    await client.end();
  } catch (err) {
    console.error('\n❌ Lỗi khi seed dữ liệu:', err);
    await client.end();
    process.exit(1);
  }
}

seedProducts();
