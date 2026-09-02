/**
 * REALISTIC & SYNCHRONIZED ORDERS SEEDER
 * Sinh đơn hàng, phiếu nhập, phiếu xuất vừa phải (3-6 đơn/kho),
 * phân bổ địa lý chuẩn xác theo từng kho và đồng bộ trạng thái giữa các dịch vụ.
 */

const { Client } = require('pg');
const crypto = require('crypto');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
};

// 16 Kho kèm thông tin địa lý và các địa chỉ nhận hàng xung quanh kho đó
const WAREHOUSE_GEO_DATA = [
  {
    code: 'WH-001', name: 'Kho Hàng Quận 12 (HCM North)', lat: 10.8671, lng: 106.6713,
    destinations: [
      { name: 'Nguyễn Văn Toàn', phone: '0901112233', address: '45 Tô Ký, P. Trung Mỹ Tây, Q.12', lat: 10.8580, lng: 106.6150 },
      { name: 'Trần Thị Mai', phone: '0902223344', address: '120 Lê Văn Khương, P. Hiệp Thành, Q.12', lat: 10.8750, lng: 106.6500 },
      { name: 'Lê Minh Tuấn', phone: '0903334455', address: '88 Hà Huy Giáp, P. Thạnh Lộc, Q.12', lat: 10.8800, lng: 106.6800 },
      { name: 'Phạm Quỳnh Như', phone: '0904445566', address: '15 Nguyễn Văn Quá, P. Đông Hưng Thuận, Q.12', lat: 10.8400, lng: 106.6250 }
    ]
  },
  {
    code: 'WH-002', name: 'Kho Hàng Thủ Đức (HCM East)', lat: 10.8494, lng: 106.7725,
    destinations: [
      { name: 'Đặng Thanh Tùng', phone: '0911112233', address: '50 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức', lat: 10.8510, lng: 106.7680 },
      { name: 'Hoàng Bích Thủy', phone: '0912223344', address: '12 Đặng Văn Bi, P. Trường Thọ, TP. Thủ Đức', lat: 10.8420, lng: 106.7620 },
      { name: 'Vũ Hoàng Nam', phone: '0913334455', address: '215 Hoàng Diệu 2, P. Linh Trung, TP. Thủ Đức', lat: 10.8580, lng: 106.7780 },
      { name: 'Đỗ Thúy Hằng', phone: '0914445566', address: '78 Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức', lat: 10.8460, lng: 106.7850 }
    ]
  },
  {
    code: 'WH-003', name: 'Kho Hàng Bình Chánh (HCM West)', lat: 10.6868, lng: 106.5932,
    destinations: [
      { name: 'Bùi Đức Trọng', phone: '0921112233', address: '12 Quốc lộ 1A, Xã Bình Chánh, H. Bình Chánh', lat: 10.6800, lng: 106.5850 },
      { name: 'Ngô Mỹ Linh', phone: '0922223344', address: '45 Đinh Đức Thiện, Xã Tân Quý Tây, H. Bình Chánh', lat: 10.6720, lng: 106.5750 },
      { name: 'Trương Tấn Sang', phone: '0923334455', address: '89 Nguyễn Hữu Trí, TT. Tân Túc, H. Bình Chánh', lat: 10.6950, lng: 106.5980 }
    ]
  },
  {
    code: 'WH-004', name: 'Kho Hàng Quận 7 (HCM South)', lat: 10.7324, lng: 106.7214,
    destinations: [
      { name: 'Nguyễn Ngọc Trâm', phone: '0931112233', address: '105 Nguyễn Thị Thập, P. Tân Phú, Q.7', lat: 10.7380, lng: 106.7150 },
      { name: 'Lâm Gia Bảo', phone: '0932223344', address: '45 Huỳnh Tấn Phát, P. Tân Thuận Đông, Q.7', lat: 10.7520, lng: 106.7320 },
      { name: 'Trần Bảo Ngọc', phone: '0933334455', address: '88 Nguyễn Đức Cảnh, P. Tân Phong, Q.7', lat: 10.7250, lng: 106.7080 }
    ]
  },
  {
    code: 'WH-005', name: 'Kho Hàng Bình Thạnh (HCM Center-East)', lat: 10.8016, lng: 106.7135,
    destinations: [
      { name: 'Phan Minh Khang', phone: '0941112233', address: '120 Điện Biên Phủ, P. 15, Q. Bình Thạnh', lat: 10.7950, lng: 106.7050 },
      { name: 'Đoàn Thu Hà', phone: '0942223344', address: '45 Xô Viết Nghệ Tĩnh, P. 21, Q. Bình Thạnh', lat: 10.7920, lng: 106.7110 },
      { name: 'Nguyễn Văn Đạt', phone: '0943334455', address: '78 Bạch Đằng, P. 24, Q. Bình Thạnh', lat: 10.8060, lng: 106.7020 }
    ]
  },
  {
    code: 'WH-006', name: 'Kho Hàng Gò Vấp (HCM Northwest)', lat: 10.8252, lng: 106.6631,
    destinations: [
      { name: 'Nguyễn Hoàng Nam', phone: '0987654321', address: '350 Quang Trung, P. 10, Q. Gò Vấp', lat: 10.8252, lng: 106.6631 },
      { name: 'Trần Thị Thúy', phone: '0988112233', address: '45 Phan Văn Trị, P. 5, Q. Gò Vấp', lat: 10.8290, lng: 106.6850 },
      { name: 'Lê Văn Cường', phone: '0988223344', address: '120 Nguyễn Oanh, P. 17, Q. Gò Vấp', lat: 10.8410, lng: 106.6790 },
      { name: 'Vũ Minh Tuấn', phone: '0988334455', address: '78 Thống Nhất, P. 11, Q. Gò Vấp', lat: 10.8410, lng: 106.6620 },
      { name: 'Phạm Hồng Nhung', phone: '0988445566', address: '210 Lê Đức Thọ, P. 15, Q. Gò Vấp', lat: 10.8520, lng: 106.6710 },
      { name: 'Bùi Kim Oanh', phone: '0988556677', address: '95 Phạm Văn Đồng, P. 1, Q. Gò Vấp', lat: 10.8190, lng: 106.6880 }
    ]
  },
  {
    code: 'WH-007', name: 'Kho Hàng Quận 1 (HCM Center)', lat: 10.7769, lng: 106.7009,
    destinations: [
      { name: 'Trịnh Quốc Bảo', phone: '0951112233', address: '25 Nguyễn Huệ, P. Bến Nghé, Q.1', lat: 10.7740, lng: 106.7030 },
      { name: 'Lý Kim Cúc', phone: '0952223344', address: '88 Hai Bà Trưng, P. Bến Nghé, Q.1', lat: 10.7810, lng: 106.7010 },
      { name: 'Nguyễn Tấn Đạt', phone: '0953334455', address: '45 Đề Thám, P. Cô Giang, Q.1', lat: 10.7620, lng: 106.6940 }
    ]
  },
  {
    code: 'WH-008', name: 'Kho Hàng Quận 5 (HCM South-West)', lat: 10.7574, lng: 106.6635,
    destinations: [
      { name: 'Lương Vĩnh Thuận', phone: '0961112233', address: '45 Trần Hưng Đạo, P. 7, Q.5', lat: 10.7550, lng: 106.6680 },
      { name: 'Hà Gia Mẫn', phone: '0962223344', address: '88 Nguyễn Trãi, P. 3, Q.5', lat: 10.7600, lng: 106.6740 }
    ]
  },
  {
    code: 'WH-009', name: 'Kho Hàng Tân Bình (HCM West-Center)', lat: 10.7938, lng: 106.6509,
    destinations: [
      { name: 'Nguyễn Anh Tuấn', phone: '0971112233', address: '120 Cộng Hòa, P. 12, Q. Tân Bình', lat: 10.8010, lng: 106.6450 },
      { name: 'Phan Thị Diễm', phone: '0972223344', address: '45 Hoàng Hoa Thám, P. 13, Q. Tân Bình', lat: 10.8020, lng: 106.6480 }
    ]
  },
  {
    code: 'WH-010', name: 'Kho Hàng Bình Tân (HCM Deep-West)', lat: 10.7492, lng: 106.6025,
    destinations: [
      { name: 'Lê Hữu Phước', phone: '0981112233', address: '56 Kinh Dương Vương, P. An Lạc, Q. Bình Tân', lat: 10.7480, lng: 106.6080 },
      { name: 'Đỗ Thảo Vy', phone: '0982223344', address: '12 Tên Lửa, P. An Lạc A, Q. Bình Tân', lat: 10.7590, lng: 106.6120 }
    ]
  },
  {
    code: 'WH-011', name: 'Kho Hàng Hóc Môn (HCM Far-North)', lat: 10.8833, lng: 106.5931,
    destinations: [
      { name: 'Cao Đình Trọng', phone: '0991112233', address: '34 Nguyễn Ảnh Thủ, Xã Bà Điểm, H. Hóc Môn', lat: 10.8810, lng: 106.5950 }
    ]
  },
  {
    code: 'WH-012', name: 'Kho Hàng Nhà Bè (HCM Far-South)', lat: 10.6953, lng: 106.7231,
    destinations: [
      { name: 'Mai Văn Hùng', phone: '0905556677', address: '78 Huỳnh Tấn Phát, TT. Nhà Bè, H. Nhà Bè', lat: 10.6920, lng: 106.7260 }
    ]
  },
  {
    code: 'WH-013', name: 'Kho Hàng Phú Nhuận (HCM Mid-Center)', lat: 10.7992, lng: 106.6803,
    destinations: [
      { name: 'Đặng Thanh Tâm', phone: '0906667788', address: '12 Phan Xích Long, P. 2, Q. Phú Nhuận', lat: 10.7980, lng: 106.6820 },
      { name: 'Lê Hoàng Yến', phone: '0907778899', address: '45 Nguyễn Văn Trỗi, P. 11, Q. Phú Nhuận', lat: 10.7920, lng: 106.6780 }
    ]
  },
  {
    code: 'WH-014', name: 'Kho Hàng Quận 8 (HCM South-West-Line)', lat: 10.7239, lng: 106.6342,
    destinations: [
      { name: 'Vũ Đức Thịnh', phone: '0908889900', address: '102 Phạm Thế Hiển, P. 4, Q.8', lat: 10.7280, lng: 106.6450 }
    ]
  },
  {
    code: 'WH-015', name: 'Kho Hàng Củ Chi (HCM Northwest-Zone)', lat: 10.9625, lng: 106.4981,
    destinations: [
      { name: 'Hồ Tấn Tài', phone: '0909990011', address: '50 Quốc lộ 22, TT. Củ Chi, H. Củ Chi', lat: 10.9700, lng: 106.4950 }
    ]
  },
  {
    code: 'WH-016', name: 'Kho Hàng Quận 10 (HCM Center-West)', lat: 10.7719, lng: 106.6669,
    destinations: [
      { name: 'Nguyễn Thành Đạt', phone: '0910001122', address: '200 Đường 3 Tháng 2, P. 12, Q.10', lat: 10.7730, lng: 106.6650 },
      { name: 'Trần Thị Thu', phone: '0911002233', address: '88 Tô Hiến Thành, P. 15, Q.10', lat: 10.7780, lng: 106.6590 }
    ]
  }
];

const SUPPLIERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Công ty TNHH Emart Việt Nam' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Tập đoàn Thực phẩm CJ CheilJedang' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Công ty Cổ phần Sữa Vinamilk' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Công ty CP Hàng Tiêu Dùng Masan' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Công ty Nông sản Sạch Đà Lạt Farm' }
];

const DRIVERS = [
  { id: 'NV-GV01', name: 'Võ Thanh Tùng', phone: '0901234888', plate: '59-V1 123.45' },
  { id: 'NV-GV02', name: 'Nguyễn Văn Hùng', phone: '0902345888', plate: '59-V2 678.90' },
  { id: 'NV-GV03', name: 'Trần Đình Trọng', phone: '0903456888', plate: '59-V3 111.22' },
  { id: 'NV-GV04', name: 'Lê Hoàng Quân', phone: '0904567888', plate: '59-V4 333.44' }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  console.log('================================================================');
  console.log('📦 SEEDING REALISTIC & SYNCHRONIZED ORDERS FOR 16 WAREHOUSES');
  console.log('================================================================\n');

  // Lấy danh sách sản phẩm mẫu từ sfwms_product
  const prodClient = new Client({ ...DB_CONFIG, database: 'sfwms_product' });
  await prodClient.connect();
  const prodRes = await prodClient.query('SELECT id, sku, name, price, unit, storage_type FROM products LIMIT 500');
  const products = prodRes.rows;
  await prodClient.end();
  console.log(`Đã load ${products.length} sản phẩm mẫu từ Database.\n`);

  // Kết nối các databases
  const inClient = new Client({ ...DB_CONFIG, database: 'sfwms_inbound' });
  const outClient = new Client({ ...DB_CONFIG, database: 'sfwms_outbound' });
  const ordClient = new Client({ ...DB_CONFIG, database: 'sfwms_order' });

  await inClient.connect();
  await outClient.connect();
  await ordClient.connect();

  console.log('🧹 Dọn dẹp các đơn cũ trong sfwms_inbound, sfwms_outbound, sfwms_order...');
  await inClient.query('TRUNCATE TABLE inbound_order_items CASCADE; TRUNCATE TABLE inbound_orders CASCADE;');
  await outClient.query('TRUNCATE TABLE outbound_order_items CASCADE; TRUNCATE TABLE outbound_orders CASCADE;');
  await ordClient.query('TRUNCATE TABLE order_items CASCADE; TRUNCATE TABLE orders CASCADE;');

  let totalInbound = 0;
  let totalOutbound = 0;
  let totalEcomOrders = 0;

  let orderSeq = 1;

  for (const wh of WAREHOUSE_GEO_DATA) {
    console.log(`📍 Đang xử lý Kho: [${wh.code}] ${wh.name}...`);

    // 1. Sinh Phiếu Nhập Kho (Inbound) cho kho này: 3-4 phiếu đa trạng thái
    const inStatuses = ['DRAFT', 'PENDING', 'RECEIVING', 'COMPLETED'];
    for (let s = 0; s < inStatuses.length; s++) {
      const status = inStatuses[s];
      const supplier = SUPPLIERS[s % SUPPLIERS.length];
      const inId = crypto.randomUUID();
      const inCode = `INB-${wh.code}-${String(orderSeq).padStart(4, '0')}`;
      
      const numItems = randomInt(2, 4);
      let totalQty = 0;
      let totalAmount = 0;
      const items = [];

      for (let k = 0; k < numItems; k++) {
        const p = randomChoice(products);
        const qty = randomInt(50, 200);
        const price = p.price || 30000;
        totalQty += qty;
        totalAmount += (qty * price);

        items.push({
          id: crypto.randomUUID(),
          inboundOrderId: inId,
          sku: p.sku,
          productName: p.name,
          expectedQuantity: qty,
          unit: p.unit || 'Cái',
          unitPrice: price,
          receivedQuantity: status === 'COMPLETED' ? qty : status === 'RECEIVING' ? Math.floor(qty * 0.5) : 0,
          status: status === 'COMPLETED' ? 'STORED' : status === 'RECEIVING' ? 'RECEIVED' : 'PENDING',
          assignedZone: p.storage_type || 'DRY'
        });
      }

      await inClient.query(`
        INSERT INTO inbound_orders (
          id, order_code, supplier_id, supplier_name, invoice_number, deliverer_name,
          total_amount, status, total_items, total_quantity, quality_check_passed, warehouse_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, [
        inId, inCode, supplier.id, supplier.name, `HD-${randomInt(10000, 99999)}`,
        `Tài xế giao ${supplier.name}`, totalAmount, status, numItems, totalQty,
        status === 'COMPLETED', wh.code
      ]);

      for (const it of items) {
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
      orderSeq++;
      totalInbound++;
    }

    // 2. Sinh Đơn Xuất Kho & Đơn Hàng TMĐT (Đồng bộ tuyệt đối về trạng thái, địa chỉ, khách hàng)
    // Các trạng thái chu trình:
    // PENDING (Đơn mới) -> PICKING (Đang nhặt hàng) -> PACKED (Đã đóng gói) -> DELIVERING (Đang giao) -> COMPLETED (Giao xong)
    const workflowPairs = [
      { ecomStatus: 'PENDING', outStatus: 'PENDING' },
      { ecomStatus: 'PICKING', outStatus: 'PICKING' },
      { ecomStatus: 'PACKED', outStatus: 'PACKED' },
      { ecomStatus: 'DELIVERING', outStatus: 'SHIPPED' },
      { ecomStatus: 'COMPLETED', outStatus: 'CONFIRMED' },
    ];

    for (let w = 0; w < Math.min(workflowPairs.length, wh.destinations.length); w++) {
      const pair = workflowPairs[w];
      const dest = wh.destinations[w];
      const driver = randomChoice(DRIVERS);

      const orderId = crypto.randomUUID();
      const codeSuffix = String(orderSeq).padStart(4, '0');
      const orderCode = `ORD-${wh.code}-${codeSuffix}`;
      const obCode = `OB-${wh.code}-${codeSuffix}`;
      orderSeq++;

      const numItems = randomInt(2, 4);
      let totalAmount = 0;
      let totalQty = 0;
      const orderItems = [];

      for (let k = 0; k < numItems; k++) {
        const p = randomChoice(products);
        const qty = randomInt(1, 4);
        const price = p.price || 35000;
        totalAmount += (price * qty);
        totalQty += qty;

        orderItems.push({
          id: crypto.randomUUID(),
          orderId,
          productId: p.id,
          sku: p.sku,
          productName: p.name,
          price,
          quantity: qty
        });
      }

      const shippingFee = 15000;
      totalAmount += shippingFee;

      // A. Chèn vào sfwms_order (Customer Web Store Order)
      await ordClient.query(`
        INSERT INTO orders (
          "id", "customerId", "customerName", "customerPhone", "customerAddress",
          "status", "totalAmount", "shippingFee", "discount", "shippingLat", "shippingLng",
          "deliveryMethod", "paymentMethod", "note", "assignedWarehouseId", "assignedWarehouseName",
          "assignedDriverId", "assignedDriverName", "assignedDriverPhone", "assignedDriverPlate",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      `, [
        orderId, crypto.randomUUID(), dest.name, dest.phone, dest.address,
        pair.ecomStatus, totalAmount, shippingFee, 0, dest.lat, dest.lng,
        'home', 'cod', `Đơn giao từ ${wh.name} đến ${dest.address}`,
        wh.code, wh.name,
        ['DELIVERING', 'COMPLETED'].includes(pair.ecomStatus) ? driver.id : null,
        ['DELIVERING', 'COMPLETED'].includes(pair.ecomStatus) ? driver.name : null,
        ['DELIVERING', 'COMPLETED'].includes(pair.ecomStatus) ? driver.phone : null,
        ['DELIVERING', 'COMPLETED'].includes(pair.ecomStatus) ? driver.plate : null
      ]);

      for (const it of orderItems) {
        await ordClient.query(`
          INSERT INTO order_items (
            "id", "orderId", "productId", "sku", "productName", "price", "quantity"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          it.id, it.orderId, it.productId, it.sku, it.productName, it.price, it.quantity
        ]);
      }
      totalEcomOrders++;

      // B. Chèn vào sfwms_outbound (Warehouse Outbound Dispatch Order)
      await outClient.query(`
        INSERT INTO outbound_orders (
          id, order_code, status, requested_by, requester_name, destination,
          total_items, total_quantity, warehouse_code, latitude, longitude,
          notes, confirmed_by, confirmed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        orderId, obCode, pair.outStatus, orderId, dest.name, dest.address,
        numItems, totalQty, wh.code, dest.lat, dest.lng,
        `Giao hàng tận nơi: ${dest.address} (Bán kính gần kho ${wh.code})`,
        pair.outStatus === 'CONFIRMED' ? 'QUAN LY KHO' : null,
        pair.outStatus === 'CONFIRMED' ? new Date().toISOString() : null
      ]);

      for (const it of orderItems) {
        await outClient.query(`
          INSERT INTO outbound_order_items (
            id, outbound_order_id, sku, product_name, requested_quantity, picked_quantity, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          it.id, orderId, it.sku, it.productName, it.quantity,
          ['PICKING', 'PACKED', 'SHIPPED', 'CONFIRMED'].includes(pair.outStatus) ? it.quantity : 0,
          pair.outStatus === 'CONFIRMED' ? 'COMPLETED' : pair.outStatus
        ]);
      }
      totalOutbound++;
    }
  }

  await inClient.end();
  await outClient.end();
  await ordClient.end();

  console.log('\n================================================================');
  console.log('🎉 SEED DỮ LIỆU ĐƠN HÀNG ĐỒNG BỘ THÀNH CÔNG RỰC RỠ!');
  console.log(`📋 Tổng số Phiếu Nhập Kho (Inbound): ${totalInbound} phiếu (phân bổ đều 16 kho)`);
  console.log(`🚚 Tổng số Phiếu Xuất Kho (Outbound): ${totalOutbound} phiếu (địa chỉ chuẩn theo bán kính kho)`);
  console.log(`🛒 Tổng số Đơn Hàng TMĐT (E-commerce Orders): ${totalEcomOrders} đơn (đồng bộ trạng thái 100%)`);
  console.log('================================================================');
}

run().catch(console.error);
