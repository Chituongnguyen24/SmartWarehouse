const { Client } = require('pg');

async function run() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await c.connect();
  const hash = '$2b$10$U82kCnrOejCmwCvmVVqkmOOuSrrfgulOFEk3Db5lHdTOlL4rmyS1m'; // password123

  const users = [
    { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường (Admin Tổng)', role: 'ADMIN', wh: null },
    { email: 'manager_govap@sfwms.vn', name: 'Trần Văn Bình (QL Kho Gò Vấp)', role: 'WAREHOUSE_MANAGER', wh: 'WH-006' },
    { email: 'manager_q12@sfwms.vn', name: 'Lê Minh Quân (QL Kho Q12)', role: 'WAREHOUSE_MANAGER', wh: 'WH-001' },
    { email: 'manager_thuduc@sfwms.vn', name: 'Nguyễn Hoàng Long (QL Kho Thủ Đức)', role: 'WAREHOUSE_MANAGER', wh: 'WH-002' },
    { email: 'manager@sfwms.vn', name: 'Trần Văn Bình (QL Kho Gò Vấp)', role: 'WAREHOUSE_MANAGER', wh: 'WH-006' },
    { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa (Nhân viên Kho Gò Vấp)', role: 'WAREHOUSE_STAFF', wh: 'WH-006' },
    { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức (Nhân viên Kinh doanh)', role: 'SALES_STAFF', wh: null },
    { email: 'driver@sfwms.vn', name: 'Võ Thanh Tùng (Tài xế Giao vận)', role: 'DRIVER', wh: null },
    { email: 'customer@sfwms.vn', name: 'Khách hàng Thử Nghiệm', role: 'CUSTOMER', wh: null }
  ];

  for (const u of users) {
    await c.query(`
      INSERT INTO users (id, email, password_hash, name, role, warehouse_code, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = $2, name = $3, role = $4, warehouse_code = $5;
    `, [u.email, hash, u.name, u.role, u.wh]);
  }

  console.log('✅ Set password123 for all demo users');
  const res = await c.query('SELECT email, name, role, warehouse_code FROM users ORDER BY role, email');
  console.table(res.rows);
  await c.end();
}

run().catch(console.error);
