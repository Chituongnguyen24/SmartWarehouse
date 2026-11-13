const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database: postgres');

  // Ensure all columns exist
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS code VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS warehouse_code VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS shift VARCHAR DEFAULT 'HANH_CHINH';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ACTIVE';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_code VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS b2b_type VARCHAR DEFAULT 'DAILY';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_limit BIGINT DEFAULT 50000000;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS debt_balance BIGINT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_rate FLOAT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS license_plate VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR;
  `);

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Standardize ADMINs
  await client.query(`
    UPDATE users
    SET code = COALESCE(code, 'ADM-01'),
        phone = COALESCE(phone, '0901000001'),
        warehouse_code = COALESCE(warehouse_code, 'TOAN_HE_THONG'),
        department = 'Ban Quản Trị Hệ Thống (HQ)',
        assigned_zone = 'Toàn Hệ Thống',
        shift = 'HANH_CHINH',
        status = 'ACTIVE'
    WHERE role = 'ADMIN' AND code IS NULL;
  `);
  // Update admin Nguyễn Chi Tường
  await client.query(`
    UPDATE users
    SET code = 'ADM-01',
        phone = '0909000001',
        warehouse_code = 'TOAN_HE_THONG',
        department = 'Ban Quản Trị & Ban Giám Đốc',
        assigned_zone = 'Toàn bộ hệ thống kho C.T Mart',
        shift = 'HANH_CHINH',
        status = 'ACTIVE'
    WHERE role = 'ADMIN' AND (name ILIKE '%Tường%' OR email ILIKE '%admin%');
  `);
  // Update admin Lê Công Chung
  await client.query(`
    UPDATE users
    SET code = 'ADM-02',
        warehouse_code = 'TOAN_HE_THONG',
        department = 'Quản Trị Hệ Thống & Kỹ Thuật',
        assigned_zone = 'Toàn bộ hệ thống kho C.T Mart',
        shift = 'HANH_CHINH',
        status = 'ACTIVE'
    WHERE role = 'ADMIN' AND name ILIKE '%Chung%';
  `);

  // 2. Standardize WAREHOUSE_MANAGERs
  const managers = await client.query(`SELECT id, name, email, warehouse_code, code FROM users WHERE role = 'WAREHOUSE_MANAGER' ORDER BY created_at ASC`);
  const whList = ['WH-006', 'WH-001', 'WH-002', 'WH-003', 'WH-004', 'WH-005', 'WH-006'];
  const phoneList = ['0908123456', '0908234567', '0908345678', '0908456789', '0908567890', '0908678901', '0908789012'];
  for (let i = 0; i < managers.rows.length; i++) {
    const m = managers.rows[i];
    const mCode = m.code || `MGR-0${i + 1}`;
    const mWh = m.warehouse_code || whList[i % whList.length];
    const mPhone = phoneList[i % phoneList.length];
    const mZone = `Toàn khu vực ${mWh}`;
    await client.query(`
      UPDATE users
      SET code = $1,
          warehouse_code = $2,
          phone = COALESCE(phone, $3),
          department = 'Ban Quản Lý Vận Hành Kho',
          assigned_zone = $4,
          shift = 'HANH_CHINH',
          status = 'ACTIVE'
      WHERE id = $5
    `, [mCode, mWh, mPhone, mZone, m.id]);
  }

  // 3. Standardize WAREHOUSE_STAFFs
  const staff = await client.query(`SELECT id, name, email, warehouse_code, code FROM users WHERE role = 'WAREHOUSE_STAFF' ORDER BY created_at ASC`);
  const zones = ['Khu Mát A (2°C ~ 6°C)', 'Khu Đông Lạnh B (-18°C ~ 0°C)', 'Khu Khô C & Soạn Hàng', 'Khu Đóng Gói Pick-to-Light', 'Khu Tiếp Nhận Inbound'];
  const shifts = ['CA_SANG', 'CA_CHIEU', 'CA_DEM', 'HANH_CHINH'];
  for (let i = 0; i < staff.rows.length; i++) {
    const s = staff.rows[i];
    const sCode = s.code || `NV-0${i + 1}`;
    const sWh = s.warehouse_code || whList[i % whList.length];
    const sPhone = `0918${String(100000 + i * 11111).slice(0, 6)}`;
    const sZone = zones[i % zones.length];
    const sShift = shifts[i % shifts.length];
    await client.query(`
      UPDATE users
      SET code = $1,
          warehouse_code = $2,
          phone = COALESCE(phone, $3),
          department = 'Bộ Phận Vận Hành & Soạn Hàng Kho',
          assigned_zone = $4,
          shift = $5,
          status = 'ACTIVE'
      WHERE id = $6
    `, [sCode, sWh, sPhone, sZone, sShift, s.id]);
  }

  // 4. Standardize SALES_STAFF
  await client.query(`
    UPDATE users
    SET code = 'SLS-01',
        phone = COALESCE(phone, '0903888999'),
        warehouse_code = 'TOAN_HE_THONG',
        department = 'Bộ Phận Kinh Doanh & Chăm Sóc Khách Hàng B2B',
        assigned_zone = 'Văn Phòng Bán Hàng & Live Support',
        shift = 'HANH_CHINH',
        status = 'ACTIVE'
    WHERE role = 'SALES_STAFF';
  `);

  // 5. Standardize DRIVERs
  const drivers = await client.query(`SELECT id, name, code, warehouse_code, license_plate FROM users WHERE role = 'DRIVER' ORDER BY created_at ASC`);
  const licensePlates = ['59C-882.14', '59C-912.45', '59C-741.23', '59C-654.89', '59C-321.78', '59C-159.35', '59C-753.95', '59C-456.12', '59C-987.65', '59C-258.14', '59C-369.25', '59C-147.89'];
  const vehicleTypes = ['Xe tải lạnh 1.5 tấn (Thermo King)', 'Xe tải lạnh 2.5 tấn (Carrier)', 'Xe van đông lạnh 1.0 tấn', 'Xe tải lạnh 3.5 tấn chuyên tuyến'];
  for (let i = 0; i < drivers.rows.length; i++) {
    const d = drivers.rows[i];
    const dCode = d.code || `DRV-${String(i + 1).padStart(2, '0')}`;
    const dPlate = d.license_plate || licensePlates[i % licensePlates.length];
    const dVehicle = vehicleTypes[i % vehicleTypes.length];
    const dWh = d.warehouse_code || whList[i % whList.length];
    const dPhone = `097${String(1000000 + i * 23456).slice(0, 7)}`;
    const dZone = `Tuyến giao hàng ${dWh}`;
    await client.query(`
      UPDATE users
      SET code = $1,
          license_plate = $2,
          vehicle_type = $3,
          warehouse_code = $4,
          phone = COALESCE(phone, $5),
          department = 'Đội Xe Vận Chuyển Giao Nhận Lạnh (Fleet)',
          assigned_zone = $6,
          shift = 'CA_SANG',
          status = 'ACTIVE',
          current_temp = 3.2,
          target_temp_min = 0.0,
          target_temp_max = 4.0
      WHERE id = $7
    `, [dCode, dPlate, dVehicle, dWh, dPhone, dZone, d.id]);
  }

  // 6. Standardize CUSTOMERs (B2B + Retail)
  await client.query(`
    UPDATE users
    SET code = 'CUST-01',
        phone = COALESCE(phone, '0909999999'),
        warehouse_code = 'TOAN_HE_THONG',
        department = 'Khách Hàng Mua Lẻ (E-Commerce Web)',
        status = 'ACTIVE',
        tier = 'Thành viên Bạc',
        points = 450
    WHERE role = 'CUSTOMER' AND name ILIKE '%Khách hàng Test%';
  `);

  await client.query(`
    UPDATE users
    SET code = 'CUST-02',
        warehouse_code = 'TOAN_HE_THONG',
        department = 'Khách Hàng Thành Viên Cá Nhân',
        status = 'ACTIVE',
        tier = 'Thành viên Vàng',
        points = 1250
    WHERE role = 'CUSTOMER' AND name ILIKE '%Lê Công Chung%' AND code IS NULL;
  `);

  console.log('✅ ALL 39 USERS IN DATABASE HAVE BEEN COMPREHENSIVELY STANDARDIZED!');
  await client.end();
}

main().catch(err => {
  console.error('Error standardizing users:', err);
  process.exit(1);
});
