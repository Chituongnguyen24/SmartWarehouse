/**
 * MASTER DATABASE RESET & SEED SCRIPT
 * Nạp toàn bộ 5.044 sản phẩm Emart Mall, sinh lô tồn kho 16 kho,
 * đơn hàng TMĐT, phiếu nhập, phiếu xuất đa trạng thái
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
};

const ALL_WAREHOUSES = [
  'WH-001', 'WH-002', 'WH-003', 'WH-004', 'WH-005', 'WH-006', 'WH-007', 'WH-008',
  'WH-009', 'WH-010', 'WH-011', 'WH-012', 'WH-013', 'WH-014', 'WH-015', 'WH-016'
];

const SUPPLIERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Công ty TNHH Emart Việt Nam' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Tập đoàn Thực phẩm CJ CheilJedang' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Công ty CP Hàng Tiêu Dùng Masan' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Công ty Nông sản Sạch Đà Lạt Farm' }
];

const MOCK_CUSTOMERS = [
  { name: 'Nguyễn Văn An', phone: '0901234567', address: '123 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM', lat: 10.7769, lng: 106.7009 },
  { name: 'Trần Thị Bích', phone: '0912345678', address: '45 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM', lat: 10.7924, lng: 106.6853 },
  { name: 'Lê Hoàng Nam', phone: '0987654321', address: '78 Quang Trung, Phường 10, Gò Vấp, TP.HCM', lat: 10.8286, lng: 106.6713 },
  { name: 'Phạm Minh Đức', phone: '0933445566', address: '102 Nguyễn Thị Thập, Tân Phú, Quận 7, TP.HCM', lat: 10.7339, lng: 106.7225 },
  { name: 'Võ Thị Hồng', phone: '0977889900', address: '56 Cộng Hòa, Phường 4, Tân Bình, TP.HCM', lat: 10.8015, lng: 106.6526 },
  { name: 'Đặng Quốc Huy', phone: '0945612378', address: '12 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức', lat: 10.8494, lng: 106.7537 },
  { name: 'Bùi Thanh Thảo', phone: '0966554433', address: '89 Tên Lửa, An Lạc A, Bình Tân, TP.HCM', lat: 10.7584, lng: 106.6022 },
  { name: 'Hoàng Kim Yến', phone: '0922334455', address: '34 Phan Xích Long, Phường 2, Phú Nhuận, TP.HCM', lat: 10.7967, lng: 106.6771 }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  console.log('================================================================');
  console.log('🔄 BẮT ĐẦU RESET & SEED TOÀN DIỆN HỆ THỐNG SMARTWAREHOUSE');
  console.log('================================================================\n');

  // Đọc file sản phẩm Emart Mall
  const productsJsonPath = path.join(__dirname, '../backend/data/emart_products.json');
  if (!fs.existsSync(productsJsonPath)) {
    throw new Error(`Không tìm thấy file: ${productsJsonPath}`);
  }
  const rawProducts = JSON.parse(fs.readFileSync(productsJsonPath, 'utf-8'));
  console.log(`📖 Đã đọc ${rawProducts.length} sản phẩm Emart Mall từ JSON.\n`);

  // =========================================================================
  // 1. PRODUCT SERVICE (sfwms_product)
  // =========================================================================
  console.log('--- 1/5. RESET & SEED SẢN PHẨM (sfwms_product) ---');
  const prodClient = new Client({ ...DB_CONFIG, database: 'sfwms_product' });
  await prodClient.connect();

  console.log('  🧹 Xóa toàn bộ sản phẩm cũ trong bảng `products`...');
  await prodClient.query('TRUNCATE TABLE products CASCADE;');

  console.log(`  💾 Đang nạp ${rawProducts.length} sản phẩm Emart Mall theo từng Batch...`);
  const insertedProductRecords = [];
  const BATCH_SIZE = 400;

  for (let i = 0; i < rawProducts.length; i += BATCH_SIZE) {
    const batch = rawProducts.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];

    batch.forEach((p, bIdx) => {
      const pId = crypto.randomUUID();
      insertedProductRecords.push({
        id: pId,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        storageType: p.storageType || 'DRY',
        shelfLifeDays: p.shelfLifeDays || 365,
        price: p.price || 25000,
        originalPrice: p.originalPrice || p.price,
        unit: p.unit || 'Cái',
        imageUrl: p.imageUrl
      });

      const offset = bIdx * 19;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19})`
      );

      const minTemp = p.storageType === 'FROZEN' ? -25 : p.storageType === 'COLD' ? 2 : null;
      const maxTemp = p.storageType === 'FROZEN' ? -15 : p.storageType === 'COLD' ? 8 : null;
      const maxHumidity = p.storageType === 'DRY' ? 70 : null;

      values.push(
        pId,                                         // $1 id
        p.sku,                                       // $2 sku
        p.name,                                      // $3 name
        p.category,                                  // $4 category
        p.storageType || 'DRY',                      // $5 storage_type
        minTemp,                                     // $6 min_temp
        maxTemp,                                     // $7 max_temp
        maxHumidity,                                 // $8 max_humidity
        p.unit || 'Cái',                             // $9 unit
        p.price || 25000,                            // $10 price
        p.imageUrl || '',                            // $11 image_url
        `Sản phẩm ${p.name} chính hãng Emart Mall. Phù hợp bảo quản điều kiện ${p.storageType || 'DRY'}.`, // $12 description
        p.origin || 'Việt Nam',                      // $13 origin
        p.storageType === 'FROZEN' ? 'Bảo quản đông lạnh -18°C' : p.storageType === 'COLD' ? 'Bảo quản mát 2°C - 8°C' : 'Nơi khô ráo, thoáng mát', // $14 preservation
        p.discountPercent > 0,                       // $15 is_flash_sale
        p.discountPercent || 0,                      // $16 discount_percent
        (4.5 + (Math.random() * 0.5)).toFixed(1),    // $17 rating (4.5 - 5.0)
        randomInt(20, 1500),                         // $18 sold_count
        randomInt(50, 1000)                          // $19 stock
      );
    });

    const insertSql = `
      INSERT INTO products (
        id, sku, name, category, storage_type, min_temp, max_temp, max_humidity, unit,
        price, image_url, description, origin, preservation, is_flash_sale, discount_percent,
        rating, sold_count, stock
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (sku) DO NOTHING;
    `;
    await prodClient.query(insertSql, values);
  }

  const prodCountRes = await prodClient.query('SELECT COUNT(*) FROM products');
  console.log(`  ✅ Đã nạp thành công ${prodCountRes.rows[0].count} sản phẩm vào Database ` + '`sfwms_product`\n');
  await prodClient.end();

  // =========================================================================
  // 2. INVENTORY SERVICE (sfwms_inventory)
  // =========================================================================
  console.log('--- 2/5. RESET & SEED LÔ TỒN KHO 16 KHO (sfwms_inventory) ---');
  const invClient = new Client({ ...DB_CONFIG, database: 'sfwms_inventory' });
  await invClient.connect();

  console.log('  🧹 Xóa các lô hàng tồn kho cũ trong bảng `lots`...');
  try {
    await invClient.query('TRUNCATE TABLE stock_movements CASCADE;');
  } catch (e) {}
  await invClient.query('TRUNCATE TABLE lots CASCADE;');

  console.log('  📦 Đang sinh các lô hàng thực tế (FEFO Dates) phân bổ 16 kho...');
  const inventoryLots = [];

  // Để kho phong phú nhưng tối ưu hiệu năng: Mỗi sản phẩm phân bổ vào 3 đến 8 kho
  insertedProductRecords.forEach((p, pIdx) => {
    // Chọn ngẫu nhiên 3 đến 7 kho cho mỗi sản phẩm
    const shuffledWh = [...ALL_WAREHOUSES].sort(() => 0.5 - Math.random());
    const targetWhs = shuffledWh.slice(0, randomInt(3, 7));

    targetWhs.forEach((whCode) => {
      const lotCount = randomInt(1, 2); // 1-2 lô mỗi kho
      for (let l = 0; l < lotCount; l++) {
        const importDaysAgo = randomInt(1, 60);
        const importDate = new Date(Date.now() - importDaysAgo * 86400000);
        
        // Hạn sử dụng dựa trên shelfLifeDays của sản phẩm
        // Một số lô tạo cận date để test FEFO / Alert Spoilage
        const isNearExpiry = Math.random() < 0.08; // 8% cận date
        let expiryDaysFromNow = isNearExpiry 
          ? randomInt(2, 7) 
          : Math.max(10, p.shelfLifeDays - importDaysAgo);
        
        const expiryDate = new Date(Date.now() + expiryDaysFromNow * 86400000);
        const quantity = randomInt(100, 2000);
        const remainingQty = Math.floor(quantity * (0.3 + Math.random() * 0.7));
        const riskScore = isNearExpiry ? randomInt(75, 95) : randomInt(0, 30);
        const status = isNearExpiry ? 'AT_RISK' : 'NORMAL';

        const zone = p.storageType;
        const shelfPrefix = zone === 'FROZEN' ? 'frz' : zone === 'COLD' ? 'cld' : 'dry';
        const location = `${shelfPrefix}-shelf-${randomInt(1, 30)}-slot-${randomInt(1, 10)}`;

        inventoryLots.push({
          id: crypto.randomUUID(),
          lotCode: `LOT-${p.sku}-${whCode}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          productId: p.id,
          supplierId: randomChoice(SUPPLIERS).id,
          importDate: importDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          quantity,
          remainingQty,
          zone,
          location,
          warehouseCode: whCode,
          riskScore,
          status,
          createdBy: 'system_seed'
        });
      }
    });
  });

  console.log(`  💾 Đang chèn ${inventoryLots.length} Lô hàng vào Database sfwms_inventory...`);
  const LOT_BATCH = 400;
  for (let i = 0; i < inventoryLots.length; i += LOT_BATCH) {
    const batch = inventoryLots.slice(i, i + LOT_BATCH);
    const values = [];
    const placeholders = [];

    batch.forEach((lot, bIdx) => {
      const offset = bIdx * 14;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      );
      values.push(
        lot.id,
        lot.lotCode,
        lot.productId,
        lot.supplierId,
        lot.importDate,
        lot.expiryDate,
        lot.quantity,
        lot.remainingQty,
        lot.zone,
        lot.location,
        lot.warehouseCode,
        lot.riskScore,
        lot.status,
        lot.createdBy
      );
    });

    const lotInsertSql = `
      INSERT INTO lots (
        id, lot_code, product_id, supplier_id, import_date, expiry_date,
        quantity, remaining_qty, zone, location, warehouse_code, risk_score,
        status, created_by
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (lot_code) DO NOTHING;
    `;
    await invClient.query(lotInsertSql, values);
  }

  const lotCountRes = await invClient.query('SELECT COUNT(*) FROM lots');
  console.log(`  ✅ Đã nạp thành công ${lotCountRes.rows[0].count} Lô tồn kho vào ` + '`sfwms_inventory`\n');
  await invClient.end();

  // =========================================================================
  // 3. INBOUND SERVICE (sfwms_inbound)
  // =========================================================================
  console.log('--- 3/5. RESET & SEED PHIẾU NHẬP KHO ĐA TRẠNG THÁI (sfwms_inbound) ---');
  const inClient = new Client({ ...DB_CONFIG, database: 'sfwms_inbound' });
  await inClient.connect();

  console.log('  🧹 Xóa phiếu nhập kho cũ...');
  await inClient.query('TRUNCATE TABLE inbound_order_items CASCADE;');
  await inClient.query('TRUNCATE TABLE inbound_orders CASCADE;');

  const INBOUND_STATUSES = ['DRAFT', 'PENDING', 'RECEIVING', 'QUALITY_CHECK', 'COMPLETED'];
  const inboundOrdersToInsert = [];

  for (let i = 1; i <= 60; i++) {
    const whCode = randomChoice(ALL_WAREHOUSES);
    const supplier = randomChoice(SUPPLIERS);
    const status = randomChoice(INBOUND_STATUSES);
    const orderId = crypto.randomUUID();
    const orderCode = `INB-2026-${String(i).padStart(4, '0')}`;

    const numItems = randomInt(2, 6);
    let totalQuantity = 0;
    let totalAmount = 0;
    const items = [];

    for (let k = 0; k < numItems; k++) {
      const prod = randomChoice(insertedProductRecords);
      const qty = randomInt(50, 500);
      const itemPrice = prod.price || 30000;
      totalQuantity += qty;
      totalAmount += (qty * itemPrice);

      items.push({
        id: crypto.randomUUID(),
        inboundOrderId: orderId,
        sku: prod.sku,
        productName: prod.name,
        expectedQuantity: qty,
        unit: prod.unit,
        unitPrice: itemPrice,
        receivedQuantity: status === 'COMPLETED' ? qty : status === 'RECEIVING' ? Math.floor(qty * 0.5) : 0,
        status: status === 'COMPLETED' ? 'STORED' : status === 'RECEIVING' ? 'RECEIVED' : 'PENDING',
        assignedZone: prod.storageType
      });
    }

    inboundOrdersToInsert.push({
      id: orderId,
      orderCode,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceNumber: `INV-${randomInt(100000, 999999)}`,
      delivererName: `Tài xế giao hàng ${i}`,
      totalAmount,
      status,
      totalItems: numItems,
      totalQuantity,
      warehouseCode: whCode,
      qualityCheckPassed: status === 'COMPLETED',
      items
    });
  }

  for (const inb of inboundOrdersToInsert) {
    await inClient.query(`
      INSERT INTO inbound_orders (
        id, order_code, supplier_id, supplier_name, invoice_number, deliverer_name,
        total_amount, status, total_items, total_quantity, quality_check_passed, warehouse_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    `, [
      inb.id, inb.orderCode, inb.supplierId, inb.supplierName, inb.invoiceNumber,
      inb.delivererName, inb.totalAmount, inb.status, inb.totalItems, inb.totalQuantity,
      inb.qualityCheckPassed, inb.warehouseCode
    ]);

    for (const it of inb.items) {
      await inClient.query(`
        INSERT INTO inbound_order_items (
          id, inbound_order_id, sku, product_name, expected_quantity, unit,
          unit_price, received_quantity, status, assigned_zone, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, [
        it.id, it.inboundOrderId, it.sku, it.productName, it.expectedQuantity,
        it.unit, it.unitPrice, it.receivedQuantity, it.status, it.assignedZone
      ]);
    }
  }

  const inbCountRes = await inClient.query('SELECT COUNT(*) FROM inbound_orders');
  console.log(`  ✅ Đã tạo thành công ${inbCountRes.rows[0].count} Phiếu nhập kho đa trạng thái vào ` + '`sfwms_inbound`\n');
  await inClient.end();

  // =========================================================================
  // 4. OUTBOUND SERVICE (sfwms_outbound)
  // =========================================================================
  console.log('--- 4/5. RESET & SEED PHIẾU XUẤT KHO ĐA TRẠNG THÁI (sfwms_outbound) ---');
  const outClient = new Client({ ...DB_CONFIG, database: 'sfwms_outbound' });
  await outClient.connect();

  console.log('  🧹 Xóa phiếu xuất kho cũ...');
  await outClient.query('TRUNCATE TABLE outbound_order_items CASCADE;');
  await outClient.query('TRUNCATE TABLE outbound_orders CASCADE;');

  const OUTBOUND_STATUSES = ['PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'CONFIRMED', 'CANCELLED'];

  for (let i = 1; i <= 60; i++) {
    const cust = randomChoice(MOCK_CUSTOMERS);
    const whCode = randomChoice(ALL_WAREHOUSES);
    const status = randomChoice(OUTBOUND_STATUSES);
    const orderId = crypto.randomUUID();
    const orderCode = `OB-2026-${String(i).padStart(4, '0')}`;

    const numItems = randomInt(1, 4);
    let totalQty = 0;
    const items = [];

    for (let k = 0; k < numItems; k++) {
      const prod = randomChoice(insertedProductRecords);
      const qty = randomInt(1, 10);
      totalQty += qty;
      items.push({
        id: crypto.randomUUID(),
        outboundOrderId: orderId,
        sku: prod.sku,
        productName: prod.name,
        requestedQuantity: qty,
        pickedQuantity: ['PICKING', 'PACKED', 'SHIPPED', 'CONFIRMED'].includes(status) ? qty : 0,
        status: status === 'CONFIRMED' ? 'COMPLETED' : status
      });
    }

    await outClient.query(`
      INSERT INTO outbound_orders (
        id, order_code, status, requester_name, destination,
        total_items, total_quantity, warehouse_code, latitude, longitude,
        notes, confirmed_by, confirmed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    `, [
      orderId, orderCode, status, cust.name, cust.address,
      numItems, totalQty, whCode, cust.lat, cust.lng,
      `Giao hàng cho khách ${cust.name}`,
      status === 'CONFIRMED' ? 'QUAN LY KHO' : null,
      status === 'CONFIRMED' ? new Date().toISOString() : null
    ]);

    for (const it of items) {
      await outClient.query(`
        INSERT INTO outbound_order_items (
          id, outbound_order_id, sku, product_name, requested_quantity, picked_quantity, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        it.id, it.outboundOrderId, it.sku, it.productName, it.requestedQuantity, it.pickedQuantity, it.status
      ]);
    }
  }

  const outCountRes = await outClient.query('SELECT COUNT(*) FROM outbound_orders');
  console.log(`  ✅ Đã tạo thành công ${outCountRes.rows[0].count} Phiếu xuất kho đa trạng thái vào ` + '`sfwms_outbound`\n');
  await outClient.end();

  // =========================================================================
  // 5. ORDER SERVICE (sfwms_order) - E-Commerce Online Orders
  // =========================================================================
  console.log('--- 5/5. RESET & SEED ĐƠN HÀNG THƯƠNG MẠI ĐIỆN TỬ (sfwms_order) ---');
  const ordClient = new Client({ ...DB_CONFIG, database: 'sfwms_order' });
  await ordClient.connect();

  console.log('  🧹 Xóa đơn hàng TMĐT cũ...');
  await ordClient.query('TRUNCATE TABLE order_items CASCADE;');
  await ordClient.query('TRUNCATE TABLE orders CASCADE;');

  const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PICKING', 'PACKED', 'DELIVERING', 'COMPLETED', 'CANCELLED'];

  for (let i = 1; i <= 50; i++) {
    const cust = randomChoice(MOCK_CUSTOMERS);
    const status = randomChoice(ORDER_STATUSES);
    const orderId = crypto.randomUUID();

    const numItems = randomInt(1, 5);
    let totalAmount = 0;
    const items = [];

    for (let k = 0; k < numItems; k++) {
      const prod = randomChoice(insertedProductRecords);
      const qty = randomInt(1, 4);
      const price = prod.price || 35000;
      totalAmount += (price * qty);

      items.push({
        id: crypto.randomUUID(),
        orderId,
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        price,
        quantity: qty
      });
    }

    const shippingFee = 25000;
    totalAmount += shippingFee;

    await ordClient.query(`
      INSERT INTO orders (
        "id", "customerId", "customerName", "customerPhone", "customerAddress",
        "status", "totalAmount", "shippingFee", "discount", "shippingLat", "shippingLng",
        "deliveryMethod", "paymentMethod", "note", "assignedWarehouseId", "assignedWarehouseName", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
    `, [
      orderId, crypto.randomUUID(), cust.name, cust.phone, cust.address,
      status, totalAmount, shippingFee, 0, cust.lat, cust.lng,
      'home', 'cod', `Đơn đặt hàng online khách ${cust.name}`, 'WH-001', 'Kho Hàng Quận 12 (HCM North)'
    ]);

    for (const it of items) {
      await ordClient.query(`
        INSERT INTO order_items (
          "id", "orderId", "productId", "sku", "productName", "price", "quantity"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        it.id, it.orderId, it.productId, it.sku, it.productName, it.price, it.quantity
      ]);
    }
  }

  const ordCountRes = await ordClient.query('SELECT COUNT(*) FROM orders');
  console.log(`  ✅ Đã tạo thành công ${ordCountRes.rows[0].count} Đơn hàng online vào ` + '`sfwms_order`\n');
  await ordClient.end();

  console.log('================================================================');
  console.log('🎉🎉 TẤT CẢ CƠ SỞ DỮ LIỆU ĐÃ ĐƯỢC RESET & SEED THÀNH CÔNG RỰC RỠ!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('❌ Lỗi trong quá trình Reset & Seed:', err);
  process.exit(1);
});
