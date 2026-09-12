const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await c.connect();
  const hash = await bcrypt.hash('password123', 10);
  
  const users = [
    { email: 'admin@sfwms.vn', name: 'Nguyễn Chi Tường (Admin Tổng)', role: 'ADMIN', wh: null },
    { email: 'manager_govap@sfwms.vn', name: 'Trần Văn Bình (QL Kho Gò Vấp - WH-006)', role: 'WAREHOUSE_MANAGER', wh: 'WH-006' },
    { email: 'manager_q12@sfwms.vn', name: 'Lê Minh Quân (QL Kho Q12 - WH-001)', role: 'WAREHOUSE_MANAGER', wh: 'WH-001' },
    { email: 'manager_thuduc@sfwms.vn', name: 'Nguyễn Hoàng Long (QL Kho Thủ Đức - WH-002)', role: 'WAREHOUSE_MANAGER', wh: 'WH-002' },
    { email: 'manager@sfwms.vn', name: 'Trần Văn Bình (QL Kho Gò Vấp)', role: 'WAREHOUSE_MANAGER', wh: 'WH-006' },
    { email: 'staff@sfwms.vn', name: 'Lê Thị Hoa (Nhân viên Kho Gò Vấp)', role: 'WAREHOUSE_STAFF', wh: 'WH-006' },
    { email: 'sales@sfwms.vn', name: 'Phạm Minh Đức (Nhân viên Kinh doanh)', role: 'SALES_STAFF', wh: null },
    
    // ── 9 TÀI XẾ TOÀN HỆ THỐNG SMART FOOD LOGISTICS ──
    // 1. Đội Xe Tải Lạnh 2.5T (Đặng Hoàng Phúc)
    { email: 'truck@sfwms.vn', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'phuc.dang@sfwms.vn', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'danghoangphuc@sfwms.vn', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'danghoangphuc@gmail.com', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'phuc@sfwms.vn', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', role: 'DRIVER', wh: 'WH-006' },
    
    // 2. Đội Xe Bán Tải 1.5T (Phan Hữu Nam)
    { email: 'van@sfwms.vn', name: 'Phan Hữu Nam (Tài xế Xe Bán Tải 1.5T)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'nam.phan@sfwms.vn', name: 'Phan Hữu Nam (Tài xế Xe Bán Tải 1.5T)', role: 'DRIVER', wh: 'WH-006' },
    
    // 3. Đội Xe Máy Thùng Lạnh Gò Vấp (WH-006)
    { email: 'driver@sfwms.vn', name: 'Võ Minh Trí (Tài xế Xe Máy Thùng Lạnh)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'tri.vo@sfwms.vn', name: 'Võ Minh Trí (Tài xế Xe Máy Thùng Lạnh)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'hung.nguyen@sfwms.vn', name: 'Nguyễn Văn Hùng (Tài xế Xe Máy Siêu Tốc)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'bao.tran@sfwms.vn', name: 'Trần Quốc Bảo (Tài xế Xe Máy Thùng Mát)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'nam.hoang@sfwms.vn', name: 'Phạm Hoàng Nam (Tài xế Xe Máy Thùng Mát)', role: 'DRIVER', wh: 'WH-006' },
    { email: 'tung.le@sfwms.vn', name: 'Lê Thanh Tùng (Tài xế Xe Máy Thùng Lạnh)', role: 'DRIVER', wh: 'WH-006' },
    
    // 4. Đội Xe Máy Hub Bình Thạnh (WH-002) & Tân Bình (WH-003)
    { email: 'long.bui@sfwms.vn', name: 'Bùi Hoàng Long (Tài xế Kho Bình Thạnh)', role: 'DRIVER', wh: 'WH-002' },
    { email: 'huy.truong@sfwms.vn', name: 'Trương Gia Huy (Tài xế Kho Tân Bình)', role: 'DRIVER', wh: 'WH-003' },

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

  const res = await c.query('SELECT email, name, role, warehouse_code FROM users ORDER BY role, email');
  console.log('✅ Updated users in sfwms_auth:');
  console.table(res.rows);
  await c.end();
}

run().catch(console.error);
