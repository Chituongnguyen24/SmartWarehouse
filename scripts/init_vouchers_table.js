const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    password: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'sfwms_product'
  });

  await client.connect();

  const query = `
    CREATE TABLE IF NOT EXISTS vouchers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) DEFAULT 'FIXED',
      discount_value FLOAT NOT NULL DEFAULT 20000,
      min_order_value FLOAT DEFAULT 0,
      max_discount FLOAT,
      usage_limit INT DEFAULT 1000,
      used_count INT DEFAULT 0,
      start_date TIMESTAMP DEFAULT NOW(),
      end_date TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    INSERT INTO vouchers (code, title, description, discount_type, discount_value, min_order_value, usage_limit, is_active)
    VALUES 
      ('FREESHIP', 'Miễn phí vận chuyển 15.000đ', 'Áp dụng cho mọi đơn hàng từ 150.000đ tại TP.HCM', 'FIXED', 15000, 150000, 500, true),
      ('CTMART20', 'Giảm 20.000đ Đơn Đầu Tiên', 'Dành riêng cho khách hàng mua sắm đơn từ 200.000đ', 'FIXED', 20000, 200000, 1000, true),
      ('GIAM50K', 'Đại Tiệc Giảm 50.000đ', 'Áp dụng cho đơn hàng thực phẩm từ 500.000đ', 'FIXED', 50000, 500000, 200, true),
      ('SALE10', 'Ưu Đãi Thành Viên 10%', 'Giảm ngay 10% tối đa 40.000đ cho đơn hàng tươi sống từ 250.000đ', 'PERCENT', 10, 250000, 300, true)
    ON CONFLICT (code) DO NOTHING;
  `;

  await client.query(query);
  console.log('TABLE vouchers created and seeded successfully!');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

