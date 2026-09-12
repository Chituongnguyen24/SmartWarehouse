const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'sfwms_outbound'
});

async function main() {
  await client.connect();
  
  // Ensure columns exist if TypeORM synchronize hasn't run yet
  await client.query(`
    ALTER TABLE outbound_orders 
    ADD COLUMN IF NOT EXISTS assigned_driver_id VARCHAR,
    ADD COLUMN IF NOT EXISTS assigned_driver_name VARCHAR,
    ADD COLUMN IF NOT EXISTS assigned_driver_phone VARCHAR,
    ADD COLUMN IF NOT EXISTS assigned_driver_plate VARCHAR,
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR;
  `);

  // Update Phuc orders (043, 041, 039, 037, 035)
  await client.query(`
    UPDATE outbound_orders 
    SET 
      assigned_driver_id = 'NV-TK01',
      assigned_driver_name = 'Đặng Hoàng Phúc (Tài xế Xe Tải)',
      assigned_driver_phone = '0944778899',
      assigned_driver_plate = '51D-892.45'
    WHERE order_code IN ('OB-20260905-043', 'OB-20260905-041', 'OB-20260905-039', 'OB-20260905-037', 'OB-20260905-035');
  `);

  // Update Nam orders (042, 040, 038, 036, 034)
  await client.query(`
    UPDATE outbound_orders 
    SET 
      assigned_driver_id = 'NV-VAN01',
      assigned_driver_name = 'Phan Hữu Nam (Tài xế Bán Tải)',
      assigned_driver_phone = '0918776655',
      assigned_driver_plate = '51C-734.12'
    WHERE order_code IN ('OB-20260905-042', 'OB-20260905-040', 'OB-20260905-038', 'OB-20260905-036', 'OB-20260905-034');
  `);

  // Set 034 as DELIVERED
  await client.query(`
    UPDATE outbound_orders 
    SET status = 'DELIVERED'
    WHERE order_code = 'OB-20260905-034';
  `);

  const res = await client.query(`
    SELECT order_code, status, assigned_driver_id, assigned_driver_name 
    FROM outbound_orders 
    WHERE order_code LIKE 'OB-20260905-%' 
    ORDER BY order_code DESC;
  `);

  console.log('✅ Result in PostgreSQL sfwms_outbound:');
  console.table(res.rows);
  
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
