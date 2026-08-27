const { Client } = require('pg');

const dbConfig = {
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
};

async function seedDatabase(dbName, queries) {
  const client = new Client({ ...dbConfig, database: dbName });
  await client.connect();
  console.log(`Connected to ${dbName}`);
  try {
    for (const query of queries) {
      await client.query(query);
    }
    console.log(`Seeded ${dbName} successfully!`);
  } catch (error) {
    console.error(`Error seeding ${dbName}:`, error);
  } finally {
    await client.end();
  }
}

async function run() {
  console.log("Bắt đầu tiến trình Seed Data chuẩn UTF-8...");

  // 1. SFWMS_AUTH: Users
  const authQueries = [
    `TRUNCATE TABLE addresses CASCADE;`,
    `TRUNCATE TABLE users CASCADE;`,
    `INSERT INTO users (id, name, email, password_hash, role) VALUES
      ('de477bd0-4929-4472-a3df-bc11224b1c10', 'Phạm Minh Đức', 'admin@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'ADMIN'),
      ('360e915e-497e-4461-b011-494f9ea3a742', 'Võ Thanh Tùng', 'driver@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER'),
      ('199da84c-9548-4f99-9ff9-2399299b8a7f', 'Khách hàng Test', 'customer@sfwms.vn', '$2b$10$dhw39QYy12/fVEYZBOK/3OyZPqEUQJX604aVbA.efh3Pv9F1WWcJ6', 'CUSTOMER'),
      ('2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'Nhân Viên Kho 1', 'staff@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF');
    `
  ];

  // 2. SFWMS_PRODUCT: Categories & Products
  const productQueries = [
    `TRUNCATE TABLE products CASCADE;`,
    `TRUNCATE TABLE categories CASCADE;`,
    `INSERT INTO categories (id, name, description) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'Rau củ quả', 'Thực phẩm xanh, tươi ngon mỗi ngày'),
      ('22222222-2222-2222-2222-222222222222', 'Thịt cá', 'Thực phẩm tươi sống, bảo quản kho lạnh'),
      ('33333333-3333-3333-3333-333333333333', 'Đông lạnh', 'Hải sản và thực phẩm đông lạnh'),
      ('44444444-4444-4444-4444-444444444444', 'Đồ khô', 'Gạo, mì, các loại hạt');
    `,
    `INSERT INTO products (id, sku, name, category, storage_type, unit, price, stock, min_temp, max_temp) VALUES 
      ('55555555-5555-5555-5555-555555555551', 'RCQ001', 'Cà chua Đà Lạt', '11111111-1111-1111-1111-111111111111', 'COLD', '1 kg', 25000, 100, 2.0, 8.0),
      ('55555555-5555-5555-5555-555555555552', 'RCQ002', 'Rau muống chuẩn VietGAP', '11111111-1111-1111-1111-111111111111', 'COLD', '500g', 15000, 50, 2.0, 10.0),
      ('55555555-5555-5555-5555-555555555553', 'TC001', 'Thịt bò Úc nhập khẩu', '22222222-2222-2222-2222-222222222222', 'FROZEN', '1 kg', 250000, 200, -18.0, -10.0),
      ('55555555-5555-5555-5555-555555555554', 'TC002', 'Cá hồi Na Uy', '22222222-2222-2222-2222-222222222222', 'FROZEN', '500g', 180000, 150, -20.0, -15.0),
      ('55555555-5555-5555-5555-555555555555', 'DK001', 'Gạo ST25 Ông Cua', '44444444-4444-4444-4444-444444444444', 'DRY', '5 kg', 150000, 500, 15.0, 30.0);
    `
  ];

  // 3. SFWMS_WAREHOUSE: Warehouses
  const warehouseQueries = [
    `TRUNCATE TABLE warehouses CASCADE;`,
    `INSERT INTO warehouses (id, code, name, address, latitude, longitude) VALUES 
      ('66666666-6666-6666-6666-666666666661', 'WH-MN-01', 'Kho Tổng Miền Nam', 'KCN Tân Bình, TP.HCM', 10.803, 106.634),
      ('66666666-6666-6666-6666-666666666662', 'WH-HCM-07', 'Kho Trung Chuyển Q7', 'Quận 7, TP.HCM', 10.732, 106.721);
    `,
    `INSERT INTO zones (id, warehouse_id, code, name, type, min_temp, max_temp, max_capacity, min_humidity, max_humidity) VALUES 
      ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', 'COLD', 'Kho Lạnh', 'COLD', 2.0, 8.0, 1000, 40, 60),
      ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666661', 'FROZEN', 'Kho Đông Lạnh', 'FROZEN', -25.0, -18.0, 500, 30, 50),
      ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666661', 'DRY', 'Kho Khô', 'DRY', 15.0, 25.0, 2000, 40, 70);
    `,
    `INSERT INTO shelves (id, code, name, zone_id, max_slots, floor) VALUES 
      ('88888888-8888-8888-8888-888888888881', 'CL-A', 'Kệ A - Kho Lạnh', '77777777-7777-7777-7777-777777777771', 8, 1),
      ('88888888-8888-8888-8888-888888888882', 'CL-B', 'Kệ B - Kho Lạnh', '77777777-7777-7777-7777-777777777771', 8, 1);
    `,
    `INSERT INTO storage_slots (id, code, shelf_id, status, row, position) VALUES 
      ('99999999-9999-9999-9999-999999999991', 'CL-A-01', '88888888-8888-8888-8888-888888888881', 'EMPTY', 1, 1),
      ('99999999-9999-9999-9999-999999999992', 'CL-A-02', '88888888-8888-8888-8888-888888888881', 'OCCUPIED', 1, 2),
      ('99999999-9999-9999-9999-999999999993', 'CL-A-03', '88888888-8888-8888-8888-888888888881', 'FULL', 1, 3),
      ('99999999-9999-9999-9999-999999999994', 'CL-A-04', '88888888-8888-8888-8888-888888888881', 'MAINTENANCE', 1, 4),
      ('99999999-9999-9999-9999-999999999995', 'CL-A-05', '88888888-8888-8888-8888-888888888881', 'EMPTY', 2, 1),
      ('99999999-9999-9999-9999-999999999996', 'CL-A-06', '88888888-8888-8888-8888-888888888881', 'EMPTY', 2, 2),
      ('99999999-9999-9999-9999-999999999997', 'CL-A-07', '88888888-8888-8888-8888-888888888881', 'EMPTY', 2, 3),
      ('99999999-9999-9999-9999-999999999998', 'CL-A-08', '88888888-8888-8888-8888-888888888881', 'EMPTY', 2, 4),
      ('99999999-9999-9999-9999-999999999999', 'CL-B-01', '88888888-8888-8888-8888-888888888882', 'EMPTY', 1, 1),
      ('99999999-9999-9999-9999-99999999999a', 'CL-B-02', '88888888-8888-8888-8888-888888888882', 'EMPTY', 1, 2),
      ('99999999-9999-9999-9999-99999999999b', 'CL-B-03', '88888888-8888-8888-8888-888888888882', 'EMPTY', 1, 3),
      ('99999999-9999-9999-9999-99999999999c', 'CL-B-04', '88888888-8888-8888-8888-888888888882', 'EMPTY', 1, 4),
      ('99999999-9999-9999-9999-99999999999d', 'CL-B-05', '88888888-8888-8888-8888-888888888882', 'EMPTY', 2, 1),
      ('99999999-9999-9999-9999-99999999999e', 'CL-B-06', '88888888-8888-8888-8888-888888888882', 'EMPTY', 2, 2),
      ('99999999-9999-9999-9999-99999999999f', 'CL-B-07', '88888888-8888-8888-8888-888888888882', 'EMPTY', 2, 3),
      ('99999999-9999-9999-9999-999999999990', 'CL-B-08', '88888888-8888-8888-8888-888888888882', 'EMPTY', 2, 4);
    `
  ];

  await seedDatabase('sfwms_auth', authQueries);
  await seedDatabase('sfwms_product', productQueries);
  await seedDatabase('sfwms_warehouse', warehouseQueries);

  console.log("Hoàn thành quá trình Seed Data!");
}

run();
