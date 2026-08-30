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
  console.log(`\n🔗 Kết nối ${dbName}...`);
  try {
    for (const query of queries) {
      await client.query(query);
    }
    console.log(`✅ ${dbName} — Seed thành công!`);
  } catch (error) {
    console.error(`❌ ${dbName} lỗi:`, error.message);
  } finally {
    await client.end();
  }
}

async function run() {
  console.log('══════════════════════════════════════════════════');
  console.log('  CityMart SFWMS — Unified Seed Data');
  console.log('══════════════════════════════════════════════════');

  // ==========================================
  // 1. SFWMS_AUTH: Users
  // ==========================================
  const authQueries = [
    `TRUNCATE TABLE addresses CASCADE;`,
    `TRUNCATE TABLE users CASCADE;`,
    `INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
      ('de477bd0-4929-4472-a3df-bc11224b1c10', 'Phạm Minh Đức', 'admin@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'ADMIN', '0900000001'),
      ('360e915e-497e-4461-b011-494f9ea3a742', 'Võ Thanh Tùng', 'driver@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0900000002'),
      ('199da84c-9548-4f99-9ff9-2399299b8a7f', 'Khách hàng Test', 'customer@sfwms.vn', '$2b$10$dhw39QYy12/fVEYZBOK/3OyZPqEUQJX604aVbA.efh3Pv9F1WWcJ6', 'CUSTOMER', '0900000003'),
      ('2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d', 'Nhân Viên Kho 1', 'staff@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0900000004'),
      ('b1000001-0001-4001-8001-200000000001', 'Nguyễn Văn An', 'staff2@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0901000001'),
      ('b1000001-0001-4001-8001-200000000002', 'Trần Thị Bích', 'staff3@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0901000002'),
      ('b1000001-0001-4001-8001-200000000003', 'Lê Minh Khôi', 'driver2@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0901000003'),
      ('b1000001-0001-4001-8001-200000000004', 'Phạm Hoàng Dũng', 'driver3@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0901000004'),
      ('b1000001-0001-4001-8001-200000000005', 'Ngô Thị Mai', 'sales2@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'SALES_STAFF', '0901000005'),
      ('b1000001-0001-4001-8001-200000000006', 'Vũ Quang Huy', 'manager2@sfwms.vn', '$2b$10$Swk.knA.jf56snysuLHj7.yz6O1yYw.inZPBQX.aNVVw9yg6k9Qtu', 'WAREHOUSE_MANAGER', '0901000006'),
      ('b1000001-0001-4001-8001-200000000011', 'Trần Hữu Nam', 'staff4@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000001'),
      ('b1000001-0001-4001-8001-200000000012', 'Nguyễn Phương Thảo', 'staff5@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000002'),
      ('b1000001-0001-4001-8001-200000000013', 'Hoàng Ngọc Sơn', 'staff6@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000003'),
      ('b1000001-0001-4001-8001-200000000014', 'Đặng Thu Hà', 'staff7@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000004'),
      ('b1000001-0001-4001-8001-200000000015', 'Lý Quốc Bảo', 'staff8@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000005'),
      ('b1000001-0001-4001-8001-200000000016', 'Vũ Minh Tuấn', 'driver4@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0902000006'),
      ('b1000001-0001-4001-8001-200000000017', 'Bùi Xuân Trường', 'driver5@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0902000007'),
      ('b1000001-0001-4001-8001-200000000018', 'Đỗ Thành Long', 'driver6@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0902000008'),
      ('b1000001-0001-4001-8001-200000000019', 'Lê Bích Ngọc', 'sales3@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'SALES_STAFF', '0902000009'),
      ('b1000001-0001-4001-8001-200000000020', 'Nguyễn Thanh Tùng', 'manager3@sfwms.vn', '$2b$10$Swk.knA.jf56snysuLHj7.yz6O1yYw.inZPBQX.aNVVw9yg6k9Qtu', 'WAREHOUSE_MANAGER', '0902000010'),
      ('b1000001-0001-4001-8001-200000000021', 'Trịnh Bích Phương', 'staff9@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000011'),
      ('b1000001-0001-4001-8001-200000000022', 'Cao Minh Phát', 'staff10@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000012'),
      ('b1000001-0001-4001-8001-200000000023', 'Lâm Thúy Uyên', 'staff11@sfwms.vn', '$2b$10$gqcy7Ur5xv3IpmxP7HIWZuCc1Hs/wLxu.wxgKsgKT52OdmOWzzau6', 'WAREHOUSE_STAFF', '0902000013'),
      ('b1000001-0001-4001-8001-200000000024', 'Đoàn Nhật Vượng', 'driver7@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0902000014'),
      ('b1000001-0001-4001-8001-200000000025', 'Trương Quốc Anh', 'driver8@sfwms.vn', '$2b$10$fm9y1I9drUdRLMC.RX7c8uAxqHtzPnur1SsWvfhVvjn9SRUOrA3.u', 'DRIVER', '0902000015');
    `
  ];

  // ==========================================
  // 2. SFWMS_PRODUCT: Categories & Products
  // ==========================================
  const productQueries = [
    `TRUNCATE TABLE products CASCADE;`,
    `TRUNCATE TABLE categories CASCADE;`,
    
    `INSERT INTO categories (id, name, description, product_count) VALUES 
      ('11111111-1111-1111-1111-111111111111', 'Rau củ quả', 'Thực phẩm xanh, rau củ quả tươi sống mỗi ngày', 10),
      ('22222222-2222-2222-2222-222222222222', 'Thịt & Hải sản', 'Thịt lợn, bò, gà, hải sản tươi và đông lạnh', 8),
      ('33333333-3333-3333-3333-333333333333', 'Thực phẩm đông lạnh', 'Đồ ăn sơ chế đông lạnh, kem, đá', 5),
      ('44444444-4444-4444-4444-444444444444', 'Thực phẩm khô', 'Gạo, mì, phở, bún miến, đậu hạt', 7),
      ('55555555-5555-5555-5555-555555555555', 'Nước giải khát', 'Nước ngọt, nước suối, bia, rượu', 6),
      ('66666666-6666-6666-6666-666666666666', 'Sữa & Chế phẩm', 'Sữa tươi, sữa chua, bơ, phô mai', 5),
      ('77777777-7777-7777-7777-777777777777', 'Đồ ăn vặt', 'Bánh kẹo, snack, socola', 6),
      ('88888888-8888-8888-8888-888888888888', 'Gia vị & Nước chấm', 'Nước mắm, xì dầu, tương ớt, muối, đường', 5);
    `,

    `INSERT INTO products (id, sku, name, category, storage_type, min_temp, max_temp, unit, price, description, origin, preservation, stock) VALUES 
      (gen_random_uuid(), 'VEG-CABBAGE-01', 'Bắp cải thảo Đà Lạt', '11111111-1111-1111-1111-111111111111', 'COLD', 2, 8, '1 kg', 25000, 'Bắp cải thảo tươi sạch', 'Đà Lạt, VN', 'Bảo quản mát', 1200),
      (gen_random_uuid(), 'VEG-TOMATO-01', 'Cà chua cherry', '11111111-1111-1111-1111-111111111111', 'COLD', 2, 8, '500g', 35000, 'Cà chua cherry giòn ngọt', 'Đà Lạt, VN', 'Bảo quản mát', 800),
      (gen_random_uuid(), 'VEG-BROCCOLI-01', 'Súp lơ xanh', '11111111-1111-1111-1111-111111111111', 'COLD', 2, 8, '1 kg', 45000, 'Súp lơ xanh giàu vitamin', 'Lâm Đồng', 'Bảo quản mát', 500),
      (gen_random_uuid(), 'FRUIT-APPLE-01', 'Táo Envy Mỹ', '11111111-1111-1111-1111-111111111111', 'COLD', 0, 4, '1 kg', 180000, 'Táo Envy nhập khẩu Mỹ', 'USA', 'Bảo quản mát', 300),
      (gen_random_uuid(), 'FRUIT-GRAPE-01', 'Nho mẫu đơn Hàn Quốc', '11111111-1111-1111-1111-111111111111', 'COLD', 0, 4, '500g', 350000, 'Nho ngọt lịm không hạt', 'Hàn Quốc', 'Bảo quản mát', 150),
      (gen_random_uuid(), 'MEAT-BEEF-01', 'Thịt bò Úc nhập khẩu', '22222222-2222-2222-2222-222222222222', 'FROZEN', -18, -10, '1 kg', 320000, 'Thịt bò Úc thái mỏng', 'Úc', 'Cấp đông', 500),
      (gen_random_uuid(), 'MEAT-PORK-01', 'Thịt ba chỉ heo', '22222222-2222-2222-2222-222222222222', 'COLD', 0, 4, '500g', 85000, 'Thịt heo sạch MeatDeli', 'VN', 'Bảo quản mát', 800),
      (gen_random_uuid(), 'SEAFOOD-SALMON-01', 'Cá hồi Na Uy', '22222222-2222-2222-2222-222222222222', 'FROZEN', -20, -15, '500g', 280000, 'Phi lê cá hồi', 'Na Uy', 'Cấp đông', 300),
      (gen_random_uuid(), 'FROZEN-PIZZA-01', 'Pizza hải sản đông lạnh', '33333333-3333-3333-3333-333333333333', 'FROZEN', -18, -15, '1 Hộp', 120000, 'Pizza size L nướng lò', 'VN', 'Cấp đông', 400),
      (gen_random_uuid(), 'DRY-RICE-01', 'Gạo ST25 Ông Cua', '44444444-4444-4444-4444-444444444444', 'DRY', 15, 30, '5 kg', 190000, 'Gạo ngon nhất thế giới', 'Sóc Trăng, VN', 'Nơi khô ráo', 1000),
      (gen_random_uuid(), 'DRY-NOODLE-01', 'Mì Hảo Hảo Tôm chua cay', '44444444-4444-4444-4444-444444444444', 'DRY', 15, 35, '1 Thùng', 115000, 'Mì ăn liền', 'VN', 'Nơi khô ráo', 5000),
      (gen_random_uuid(), 'DRINK-COCA-01', 'Coca-Cola thùng 24 lon', '55555555-5555-5555-5555-555555555555', 'DRY', 15, 35, '1 Thùng', 215000, 'Nước giải khát có gas', 'VN', 'Nơi thoáng mát', 3000),
      (gen_random_uuid(), 'MILK-TH-01', 'Sữa tươi TH True Milk ít đường', '66666666-6666-6666-6666-666666666666', 'DRY', 15, 30, '1 Thùng', 340000, 'Sữa tiệt trùng', 'VN', 'Nơi thoáng mát', 2000),
      (gen_random_uuid(), 'SNACK-CHIPS-01', 'Snack khoai tây Lays', '77777777-7777-7777-7777-777777777777', 'DRY', 15, 30, '1 Gói lớn', 25000, 'Bim bim Lays', 'VN', 'Nơi khô ráo', 4000),
      (gen_random_uuid(), 'SAUCE-FISH-01', 'Nước mắm Nam Ngư', '88888888-8888-8888-8888-888888888888', 'DRY', 15, 35, '1 Chai 750ml', 42000, 'Nước mắm pha', 'VN', 'Nơi thoáng mát', 3000);
    `
  ];

  // ==========================================
  // 3. SFWMS_WAREHOUSE: Updates
  // ==========================================
  const warehouseQueries = [
    // Reset status to EMPTY before randomizing
    `UPDATE storage_slots SET status = 'EMPTY', lot_code = NULL, product_sku = NULL, current_weight_kg = 0;`,
    
    // OCCUPIED ~35%
    `UPDATE storage_slots SET 
      status = 'OCCUPIED', 
      lot_code = 'LOT-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4)),
      product_sku = CASE (floor(random() * 10))::int
        WHEN 0 THEN 'VEG-CABBAGE-01' WHEN 1 THEN 'VEG-TOMATO-01' WHEN 2 THEN 'FRUIT-APPLE-01'
        WHEN 3 THEN 'MEAT-BEEF-01' WHEN 4 THEN 'MEAT-PORK-01' WHEN 5 THEN 'SEAFOOD-SALMON-01'
        WHEN 6 THEN 'MILK-TH-01' WHEN 7 THEN 'DRY-RICE-01' WHEN 8 THEN 'DRINK-COCA-01'
        ELSE 'SNACK-CHIPS-01' END,
      current_weight_kg = floor(random() * 300 + 50)
    WHERE id IN (
      SELECT id FROM storage_slots WHERE status = 'EMPTY' ORDER BY random() LIMIT (
        SELECT GREATEST(floor(count(*) * 0.35), 1) FROM storage_slots WHERE status = 'EMPTY'
      )
    );`,

    // FULL ~20%
    `UPDATE storage_slots SET 
      status = 'FULL', 
      lot_code = 'LOT-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 4)),
      product_sku = CASE (floor(random() * 8))::int
        WHEN 0 THEN 'VEG-BROCCOLI-01' WHEN 1 THEN 'FRUIT-GRAPE-01' WHEN 2 THEN 'MEAT-PORK-01'
        WHEN 3 THEN 'SEAFOOD-SALMON-01' WHEN 4 THEN 'MILK-TH-01' WHEN 5 THEN 'DRY-NOODLE-01'
        WHEN 6 THEN 'DRINK-COCA-01' ELSE 'SNACK-CHIPS-01' END,
      current_weight_kg = max_weight_kg
    WHERE id IN (
      SELECT id FROM storage_slots WHERE status = 'EMPTY' ORDER BY random() LIMIT (
        SELECT GREATEST(floor(count(*) * 0.30), 1) FROM storage_slots WHERE status = 'EMPTY'
      )
    );`,

    // MAINTENANCE ~5%
    `UPDATE storage_slots SET status = 'MAINTENANCE' WHERE id IN (
      SELECT id FROM storage_slots WHERE status = 'EMPTY' ORDER BY random() LIMIT (
        SELECT GREATEST(floor(count(*) * 0.08), 1) FROM storage_slots WHERE status = 'EMPTY'
      )
    );`,

    `UPDATE shelves SET current_slots_used = (
      SELECT COUNT(*) FROM storage_slots 
      WHERE shelf_id = shelves.id AND status IN ('OCCUPIED', 'FULL')
    );`
  ];

  // ==========================================
  // 4. SFWMS_INVENTORY: Suppliers, Lots, Movements
  // ==========================================
  const inventoryQueries = [
    `TRUNCATE TABLE stock_movements CASCADE;`,
    `TRUNCATE TABLE lots CASCADE;`,
    `TRUNCATE TABLE suppliers CASCADE;`,
    
    `INSERT INTO suppliers (id, name, contact, address) VALUES
      ('11111111-1111-1111-1111-111111111111', 'Đà Lạt Hasfarm', '0281231234', 'Đà Lạt, Lâm Đồng'),
      ('22222222-2222-2222-2222-222222222222', 'MeatDeli', '0281112222', 'Hà Nam, Việt Nam'),
      ('33333333-3333-3333-3333-333333333333', 'Vissan', '0283334444', 'Bình Thạnh, TP.HCM'),
      ('44444444-4444-4444-4444-444444444444', 'TH True Milk', '0283900900', 'Nghệ An, Việt Nam'),
      ('55555555-5555-5555-5555-555555555555', 'CP Vietnam', '0283821821', 'Bình Dương, Việt Nam'),
      ('66666666-6666-6666-6666-666666666666', 'Vinamilk', '0281122334', 'Quận 7, TP.HCM'),
      ('77777777-7777-7777-7777-777777777777', 'Nutifood', '0282233445', 'Bình Dương, Việt Nam'),
      ('88888888-8888-8888-8888-888888888888', 'Suntory PepsiCo', '0283344556', 'Quận 1, TP.HCM'),
      ('99999999-9999-9999-9999-999999999999', 'Coca-Cola Beverages', '0284455667', 'Thủ Đức, TP.HCM'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cholimex Food', '0285566778', 'KCN Vĩnh Lộc, TP.HCM'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Masan Consumer', '0286677889', 'Quận 1, TP.HCM'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Acecook Vietnam', '0287788990', 'Tân Phú, TP.HCM'),
      ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Trung Nguyên Legend', '0289900112', 'Buôn Ma Thuột, Đắk Lắk'),
      ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Hải sản Hùng Vương', '0281011223', 'Vũng Tàu, Việt Nam'),
      ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Trái cây Hoàng Gia', '0283233445', 'Long An, Việt Nam'),
      ('00000000-0000-0000-0000-000000000001', 'Kinh Đô Mondelez', '0284344556', 'Bình Dương, Việt Nam'),
      ('00000000-0000-0000-0000-000000000002', 'Orion Vina', '0285455667', 'Bắc Ninh, Việt Nam'),
      ('00000000-0000-0000-0000-000000000003', 'Gạo Cỏ May', '0286566778', 'Đồng Tháp, Việt Nam')
    ON CONFLICT (id) DO NOTHING;`,

    `INSERT INTO lots (id, lot_code, product_id, supplier_id, import_date, expiry_date, quantity, remaining_qty, zone, location, warehouse_code, risk_score, status, created_by) VALUES
      ('a1000001-0001-4001-8001-100000000001', 'LOT-VEG-Q12-001', 'd8de8a74-61f1-4065-8fcb-793a81a5b349', '11111111-1111-1111-1111-111111111111', '2026-08-25 08:00:00', '2026-09-10 08:00:00', 200, 165, 'COLD', 'Q12_CL-A-01', 'Q12', 15, 'NORMAL', 'admin-id'),
      ('a1000001-0001-4001-8001-100000000002', 'LOT-MEAT-Q12-001', 'a03de2de-be0a-42b5-86fd-01fbddde61dc', '22222222-2222-2222-2222-222222222222', '2026-08-22 06:00:00', '2026-11-22 06:00:00', 80, 72, 'FROZEN', 'Q12_FR-A-01', 'Q12', 0, 'NORMAL', 'admin-id'),
      ('a1000001-0001-4001-8001-100000000003', 'LOT-MILK-TD-001', '5a652d5b-ccde-4945-af98-1223dad7ef89', '44444444-4444-4444-4444-444444444444', '2026-08-28 07:00:00', '2026-09-12 07:00:00', 300, 250, 'COLD', 'TD_CL-A-01', 'TD', 20, 'NORMAL', 'admin-id')
    ON CONFLICT (lot_code) DO NOTHING;`,

    `INSERT INTO stock_movements (lot_id, movement_type, quantity, reason, performed_by) VALUES
      ('a1000001-0001-4001-8001-100000000001', 'IN', 200, 'IMPORT', 'admin-id'),
      ('a1000001-0001-4001-8001-100000000001', 'OUT', 35, 'SALES_ORDER', 'sales-id'),
      ('a1000001-0001-4001-8001-100000000002', 'IN', 80, 'IMPORT', 'admin-id'),
      ('a1000001-0001-4001-8001-100000000002', 'OUT', 8, 'SALES_ORDER', 'sales-id'),
      ('a1000001-0001-4001-8001-100000000003', 'IN', 300, 'IMPORT', 'admin-id'),
      ('a1000001-0001-4001-8001-100000000003', 'OUT', 50, 'SALES_ORDER', 'sales-id');`
  ];

  // ==========================================
  // 5. SFWMS_OUTBOUND: Outbound Orders
  // ==========================================
  const outboundQueries = [
    `TRUNCATE TABLE outbound_order_items CASCADE;`,
    `TRUNCATE TABLE outbound_orders CASCADE;`,
    `INSERT INTO outbound_orders (id, order_code, status, requested_by, requester_name, destination, total_items, total_quantity, warehouse_code) VALUES
      ('b2000001-0001-4001-8001-100000000001', 'OB-20260807-001', 'PENDING', '199da84c-9548-4f99-9ff9-2399299b8a7f', 'Khách hàng Test', '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM', 3, 15, 'Q5'),
      ('b2000001-0001-4001-8001-100000000002', 'OB-20260807-002', 'PROCESSING', '199da84c-9548-4f99-9ff9-2399299b8a7f', 'Đại lý VinMart+', '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 2, 50, 'Q1'),
      ('b2000001-0001-4001-8001-100000000003', 'OB-20260807-003', 'COMPLETED', '199da84c-9548-4f99-9ff9-2399299b8a7f', 'Cửa hàng Bách Hóa Xanh', '456 Điện Biên Phủ, Phường 21, Quận Bình Thạnh, TP.HCM', 1, 20, 'BThanh');
    `,
    `INSERT INTO outbound_order_items (id, outbound_order_id, sku, product_name, requested_quantity, picked_quantity, status) VALUES
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000001', 'VEG-CABBAGE-01', 'Bắp cải thảo Đà Lạt', 5, 0, 'PENDING'),
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000001', 'FRUIT-APPLE-01', 'Táo Envy Mỹ', 5, 0, 'PENDING'),
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000001', 'MILK-TH-01', 'Sữa tươi TH True Milk ít đường', 5, 0, 'PENDING'),
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000002', 'MEAT-BEEF-01', 'Thịt bò Úc nhập khẩu', 20, 10, 'PROCESSING'),
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000002', 'SEAFOOD-SALMON-01', 'Cá hồi Na Uy', 30, 30, 'PICKED'),
      (gen_random_uuid(), 'b2000001-0001-4001-8001-100000000003', 'DRY-RICE-01', 'Gạo ST25 Ông Cua', 20, 20, 'COMPLETED');
    `
  ];

  // ==========================================
  // 6. SFWMS_INBOUND: Inbound Orders
  // ==========================================
  const inboundQueries = [
    `TRUNCATE TABLE quality_checks CASCADE;`,
    `TRUNCATE TABLE inbound_order_items CASCADE;`,
    `TRUNCATE TABLE inbound_orders CASCADE;`,
    `INSERT INTO inbound_orders (id, order_code, supplier_id, supplier_name, status, total_items, total_quantity, created_by) VALUES
      ('c3000001-0001-4001-8001-100000000001', 'IB-20260807-001', '11111111-1111-1111-1111-111111111111', 'Đà Lạt Hasfarm', 'PENDING', 2, 100, 'de477bd0-4929-4472-a3df-bc11224b1c10'),
      ('c3000001-0001-4001-8001-100000000002', 'IB-20260807-002', '22222222-2222-2222-2222-222222222222', 'MeatDeli', 'COMPLETED', 1, 50, 'de477bd0-4929-4472-a3df-bc11224b1c10');
    `,
    `INSERT INTO inbound_order_items (id, inbound_order_id, sku, product_name, expected_quantity, received_quantity, expiry_date, status) VALUES
      (gen_random_uuid(), 'c3000001-0001-4001-8001-100000000001', 'VEG-TOMATO-01', 'Cà chua cherry', 50, 0, '2026-09-01', 'PENDING'),
      (gen_random_uuid(), 'c3000001-0001-4001-8001-100000000001', 'FRUIT-GRAPE-01', 'Nho mẫu đơn Hàn Quốc', 50, 0, '2026-09-01', 'PENDING'),
      (gen_random_uuid(), 'c3000001-0001-4001-8001-100000000002', 'MEAT-PORK-01', 'Thịt ba chỉ heo', 50, 50, '2026-12-01', 'STORED');
    `
  ];

  await seedDatabase('sfwms_auth', authQueries);
  await seedDatabase('sfwms_product', productQueries);
  await seedDatabase('sfwms_warehouse', warehouseQueries);
  await seedDatabase('sfwms_inventory', inventoryQueries);
  await seedDatabase('sfwms_outbound', outboundQueries);
  await seedDatabase('sfwms_inbound', inboundQueries);

  console.log('\n══════════════════════════════════════════════════');
  console.log('  ✅ HOÀN TẤT! Toàn bộ Database đã được Seed.');
  console.log('══════════════════════════════════════════════════');
}

run();
