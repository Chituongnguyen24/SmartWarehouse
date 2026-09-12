const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seedAllStaff() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_auth'
  });

  await client.connect();

  const hash = await bcrypt.hash('password123', 10);

  const staffAccounts = [
    // Super Admin & General
    { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường (Admin Tổng)', role: 'ADMIN', warehouse_code: null, phone: '0909000001' },
    
    // WH-006 (Kho Gò Vấp)
    { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa (Trực Kho Gò Vấp)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-006', phone: '0912345678' },
    { email: 'staff.kho.gv@sfwms.vn', name: 'Lê Văn Kho (Trực Kho GV)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-006', phone: '0933987654' },
    { email: 'staff.thuy.gv@sfwms.vn', name: 'Phạm Thị Thúy (Trực Kho GV)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-006', phone: '0987654321' },
    { email: 'manager_wh006@sfwms.vn', name: 'Nguyễn Hoàng Nam (QL Kho Gò Vấp)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-006', phone: '0908123456' },
    { email: 'govap@sfwms.vn', name: 'Nguyễn Hoàng Nam (Kho Gò Vấp)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-006', phone: '0908123456' },
    { email: 'driver@sfwms.vn', name: 'Võ Thanh Tùng (Tài xế GV)', role: 'DRIVER', warehouse_code: 'WH-006', phone: '0907890123' },
    { email: 'driver.tri@sfwms.vn', name: 'Võ Minh Trí (Tài xế GV)', role: 'DRIVER', warehouse_code: 'WH-006', phone: '0977112233' },

    // WH-001 (Kho Quận 12)
    { email: 'staff_wh001@sfwms.vn', name: 'Hoàng Minh Tuấn (Trực Kho Q12)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-001', phone: '0902345678' },
    { email: 'manager_wh001@sfwms.vn', name: 'Đặng Quốc Huy (QL Q12)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-001', phone: '0901234567' },

    // WH-002 (Kho Thủ Đức)
    { email: 'staff_wh002@sfwms.vn', name: 'Ngô Thanh Hải (Trực Kho Thủ Đức)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-002', phone: '0904567890' },
    { email: 'manager_wh002@sfwms.vn', name: 'Bùi Anh Tuấn (QL Thủ Đức)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-002', phone: '0903456789' },

    // WH-005 (Kho Bình Thạnh)
    { email: 'staff_wh005@sfwms.vn', name: 'Vũ Đức Thịnh (Trực Kho BThanh)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-005', phone: '0906789012' },
    { email: 'manager@sfwms.vn', name: 'Trần Văn Bình (QL Bình Thạnh)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-005', phone: '0905678901' },
    
    // WH-004 (Kho Quận 7)
    { email: 'staff_wh004@sfwms.vn', name: 'Đỗ Văn Nam (Trực Kho Q7)', role: 'WAREHOUSE_STAFF', warehouse_code: 'WH-004', phone: '0907778899' },
    { email: 'manager_wh004@sfwms.vn', name: 'Nguyễn Tấn Đạt (QL Q7)', role: 'WAREHOUSE_MANAGER', warehouse_code: 'WH-004', phone: '0901112233' },

    // Sales & Customers
    { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức (Kinh Doanh)', role: 'SALES_STAFF', warehouse_code: null, phone: '0908901234' },
    { email: 'customer@sfwms.vn', name: 'Khách hàng Test', role: 'CUSTOMER', warehouse_code: null, phone: '0909999999' }
  ];

  for (const acc of staffAccounts) {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [acc.email]);
    if (existing.rows.length > 0) {
      await client.query(`
        UPDATE users 
        SET name = $1, role = $2, warehouse_code = $3, phone = $4, password_hash = $5
        WHERE email = $6
      `, [acc.name, acc.role, acc.warehouse_code, acc.phone, hash, acc.email]);
    } else {
      await client.query(`
        INSERT INTO users (id, email, name, role, warehouse_code, phone, password_hash, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
      `, [acc.email, acc.name, acc.role, acc.warehouse_code, acc.phone, hash]);
    }
  }

  console.log(`Seeded / updated ${staffAccounts.length} accounts with password: password123`);

  const list = await client.query('SELECT email, name, role, warehouse_code FROM users ORDER BY warehouse_code, email');
  console.table(list.rows);

  await client.end();
}

seedAllStaff().catch(console.error);
