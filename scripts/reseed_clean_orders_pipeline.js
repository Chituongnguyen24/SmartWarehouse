/**
 * RESEED ORDER PIPELINE DATA (Chuẩn quy trình 7 bước WMS Doanh nghiệp)
 * 1. PENDING: Đơn hàng mới tạo, chờ quản lý duyệt
 * 2. PROCESSING: Quản lý đã duyệt đơn, chuyển xuống kho sẵn sàng gom hàng
 * 3. PICKING: Nhân viên kho đang gom hàng trên kệ
 * 4. PACKED: Đã gom hàng xong, đã đóng thùng dán tem niêm phong
 * 5. CONFIRMED (READY_FOR_DELIVERY): Thủ kho kiểm tra, duyệt phiếu xuất kho
 * 6. SHIPPED (DELIVERING): Tài xế nhận hàng lên xe đi giao
 * 7. DELIVERED (COMPLETED): Giao hàng thành công, thu COD và ký nhận POD
 */

const path = require('path');
const crypto = require('crypto');
const { Client } = require(path.resolve('backend/scripts/node_modules/pg'));

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
};

const GOVAP_CUSTOMERS = [
  { name: 'Nguyễn Văn Cường', phone: '0903112233', address: '12 Nguyễn Oanh, Phường 7, Gò Vấp, TP.HCM', lat: 10.8295, lng: 106.6781 },
  { name: 'Trần Thị Thu Thủy', phone: '0918223344', address: '45 Quang Trung, Phường 10, Gò Vấp, TP.HCM', lat: 10.8351, lng: 106.6667 },
  { name: 'Lê Hoàng Nam', phone: '0988334455', address: '78 Phan Văn Trị, Phường 5, Gò Vấp, TP.HCM', lat: 10.8236, lng: 106.6892 },
  { name: 'Hoàng Thị Mai', phone: '0934445566', address: '150 Lê Đức Thọ, Phường 16, Gò Vấp, TP.HCM', lat: 10.8492, lng: 106.6738 },
  { name: 'Vũ Minh Tuấn', phone: '0909556677', address: '320 Nguyễn Văn Nghi, Phường 7, Gò Vấp, TP.HCM', lat: 10.8241, lng: 106.6875 },
  { name: 'Đoàn Gia Bảo', phone: '0977667788', address: '89 Thống Nhất, Phường 11, Gò Vấp, TP.HCM', lat: 10.8389, lng: 106.6642 },
  { name: 'Bùi Kim Oanh', phone: '0945778899', address: '204 Nguyễn Văn Lượng, Phường 17, Gò Vấp, TP.HCM', lat: 10.8415, lng: 106.6763 },
  { name: 'Phạm Hồng Nhung', phone: '0912889900', address: '56 Cây Trâm (Đường số 10), Phường 8, Gò Vấp, TP.HCM', lat: 10.8443, lng: 106.6548 },
  { name: 'Đỗ Tiến Dũng', phone: '0908990011', address: '34 Phạm Ngũ Lão, Phường 3, Gò Vấp, TP.HCM', lat: 10.8197, lng: 106.6823 },
  { name: 'Lâm Khánh Linh', phone: '0938001122', address: '112 Dương Quảng Hàm, Phường 5, Gò Vấp, TP.HCM', lat: 10.8312, lng: 106.6854 },
  { name: 'Trịnh Hoàng Long', phone: '0979112233', address: '25 Nguyễn Tư Giản, Phường 12, Gò Vấp, TP.HCM', lat: 10.8367, lng: 106.6432 },
  { name: 'Võ Tuyết Mai', phone: '0983223344', address: '67 Lê Văn Thọ, Phường 9, Gò Vấp, TP.HCM', lat: 10.8431, lng: 106.6611 },
  { name: 'Ngô Trọng Hiếu', phone: '0901334455', address: '48 Đường số 20, Phường 6, Gò Vấp, TP.HCM', lat: 10.8475, lng: 106.6899 },
  { name: 'Đinh Phương Thảo', phone: '0915445566', address: '189 Bùi Quang Là, Phường 12, Gò Vấp, TP.HCM', lat: 10.8329, lng: 106.6385 },
  { name: 'Trần Đại Nghĩa', phone: '0937556677', address: '220 Phan Huy Ích, Phường 14, Gò Vấp, TP.HCM', lat: 10.8398, lng: 106.6341 },
  { name: 'Nguyễn Thúy Hằng', phone: '0978667788', address: '15 Tân Sơn, Phường 12, Gò Vấp, TP.HCM', lat: 10.8318, lng: 106.6489 },
  { name: 'Phan Quốc Tuấn', phone: '0949778899', address: '73 Huỳnh Văn Nghệ, Phường 12, Gò Vấp, TP.HCM', lat: 10.8344, lng: 106.6417 },
  { name: 'Lê Diệu Linh', phone: '0913889900', address: '95 Trần Thị Nghỉ, Phường 7, Gò Vấp, TP.HCM', lat: 10.8268, lng: 106.6795 },
  { name: 'Hồ Hoàng Yến', phone: '0906990011', address: '124 Lý Thường Kiệt, Phường 7, Gò Vấp, TP.HCM', lat: 10.8255, lng: 106.6861 },
  { name: 'Mai Văn Hùng', phone: '0939001122', address: '88 Nguyễn Thái Sơn, Phường 3, Gò Vấp, TP.HCM', lat: 10.8183, lng: 106.6812 },
  { name: 'Chu Bảo Ngọc', phone: '0975112233', address: '16 Bạch Đằng, Phường 2, Tân Bình (Giáp Gò Vấp)', lat: 10.8142, lng: 106.6711 },
];

const DRIVERS = [
  { id: '43ea789d-da4b-4a5d-9aee-8d98c1af1779', name: 'Võ Minh Trí (Tài xế GV)', phone: '0977112233', plate: '59G1-889.24' },
  { id: '1b2efc33-17b7-4958-abf2-5939881beb23', name: 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)', phone: '0908889922', plate: '59C-992.31' },
  { id: '65c556d2-c0b2-4e7c-a5eb-8b03c891009e', name: 'Phan Hữu Nam (Tài xế Xe Bán Tải 1.5T)', phone: '0912334455', plate: '59C-882.14' },
  { id: 'be59a688-6755-443e-bc96-cc92e07b9128', name: 'Nguyễn Văn Hùng (Tài xế Xe Máy Siêu Tốc)', phone: '0933778899', plate: '59V2-667.89' },
];

// Định nghĩa 7 bước quy trình WMS chuẩn
// Mỗi bước gồm: { orderStatus, outboundStatus, desc, count }
const PIPELINE_STAGES = [
  { stage: 1, orderStatus: 'PENDING', outboundStatus: 'PENDING', desc: '1. Chờ quản lý duyệt đơn', count: 3 },
  { stage: 2, orderStatus: 'PROCESSING', outboundStatus: 'PROCESSING', desc: '2. Quản lý đã duyệt, sẵn sàng gom hàng', count: 3 },
  { stage: 3, orderStatus: 'PICKING', outboundStatus: 'PICKING', desc: '3. Nhân viên đang gom hàng trên kệ', count: 3 },
  { stage: 4, orderStatus: 'PACKED', outboundStatus: 'PACKED', desc: '4. Đã đóng gói xong thùng hàng', count: 3 },
  { stage: 5, orderStatus: 'READY_FOR_DELIVERY', outboundStatus: 'CONFIRMED', desc: '5. Đã xuất kho, chờ tài xế nhận', count: 3 },
  { stage: 6, orderStatus: 'DELIVERING', outboundStatus: 'SHIPPED', desc: '6. Tài xế nhận hàng lên xe đi giao', count: 3 },
  { stage: 7, orderStatus: 'COMPLETED', outboundStatus: 'DELIVERED', desc: '7. Đã giao thành công tận tay (POD)', count: 3 },
];

async function main() {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU SEED LẠI TOÀN BỘ ĐƠN HÀNG THEO CHUẨN QUY TRÌNH 7 BƯỚC WMS:');
  console.log('   PENDING -> DUYỆT ĐƠN -> PICKING -> PACKED -> CONFIRMED -> SHIPPED -> DELIVERED');
  console.log('========================================================================\n');

  const prodClient = new Client({ ...DB_CONFIG, database: 'sfwms_product' });
  const ordClient = new Client({ ...DB_CONFIG, database: 'sfwms_order' });
  const outClient = new Client({ ...DB_CONFIG, database: 'sfwms_outbound' });
  const invClient = new Client({ ...DB_CONFIG, database: 'sfwms_inventory' });

  await prodClient.connect();
  await ordClient.connect();
  await outClient.connect();
  await invClient.connect();

  // 1. Lấy danh sách sản phẩm mẫu từ DB sfwms_product & các lô hàng từ sfwms_inventory
  const prodRes = await prodClient.query('SELECT id, sku, name, price, category, unit FROM products ORDER BY created_at DESC LIMIT 50');
  const products = prodRes.rows;
  console.log(`📦 Đã nạp ${products.length} sản phẩm mẫu từ sfwms_product.`);

  const lotsRes = await invClient.query(`
    SELECT id, lot_code, product_id, location, zone, expiry_date, risk_score 
    FROM lots 
    WHERE (warehouse_code = 'WH-006' OR warehouse_code IS NULL) AND remaining_qty > 0
    ORDER BY expiry_date ASC
  `);
  const lots = lotsRes.rows;
  console.log(`📦 Đã nạp ${lots.length} lô hàng khả dụng từ kho Gò Vấp.`);

  // 2. Xóa sạch dữ liệu đơn hàng cũ
  console.log('🧹 Xóa sạch đơn hàng TMĐT cũ (orders, order_items)...');
  await ordClient.query('TRUNCATE TABLE order_items CASCADE;');
  await ordClient.query('TRUNCATE TABLE orders CASCADE;');

  console.log('🧹 Xóa sạch phiếu xuất kho cũ (outbound_orders, outbound_order_items)...');
  await outClient.query('TRUNCATE TABLE outbound_order_items CASCADE;');
  await outClient.query('TRUNCATE TABLE outbound_orders CASCADE;');

  let orderIndex = 0;

  for (const stage of PIPELINE_STAGES) {
    console.log(`\n📌 Khởi tạo Nhóm: ${stage.desc} (${stage.count} đơn)...`);

    for (let c = 0; c < stage.count; c++) {
      orderIndex++;
      const orderId = crypto.randomUUID();
      const orderCode = `OB-2026-${String(11000 + orderIndex)}`;
      const cust = GOVAP_CUSTOMERS[(orderIndex - 1) % GOVAP_CUSTOMERS.length];
      const driver = DRIVERS[(orderIndex - 1) % DRIVERS.length];

      // Ngày tạo: tạo trong hôm nay (11/11/2026) hoặc vài giờ trước
      const createdDate = new Date(`2026-11-11T${String(8 + Math.floor(orderIndex / 3)).padStart(2, '0')}:${String((orderIndex * 7) % 60).padStart(2, '0')}:00Z`);

      // Chọn 1-3 sản phẩm cho đơn
      const numItems = (orderIndex % 3) + 1;
      let totalAmount = 0;
      let totalQty = 0;
      const orderItems = [];

      for (let k = 0; k < numItems; k++) {
        const prod = products[(orderIndex * 3 + k) % products.length];
        const qty = (k === 0) ? ((orderIndex % 3) + 1) : 1;
        totalQty += qty;
        totalAmount += qty * Number(prod.price);

        // Trạng thái từng item theo giai đoạn:
        let itemStatus = 'PENDING';
        let pickedQty = 0;

        if (stage.stage === 1 || stage.stage === 2) {
          // PENDING & PROCESSING: chưa ai lấy
          itemStatus = 'PENDING';
          pickedQty = 0;
        } else if (stage.stage === 3) {
          // PICKING: Đang lấy dở (lấy được món đầu tiên, món sau đang chờ)
          if (k === 0) {
            itemStatus = 'PICKED';
            pickedQty = qty;
          } else {
            itemStatus = 'PENDING';
            pickedQty = 0;
          }
        } else if (stage.stage >= 4) {
          // PACKED, CONFIRMED, SHIPPED, DELIVERED: đã lấy đủ 100%
          itemStatus = stage.stage === 7 ? 'COMPLETED' : (stage.stage === 4 ? 'PACKED' : 'CONFIRMED');
          pickedQty = qty;
        }

        orderItems.push({
          id: crypto.randomUUID(),
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          price: Number(prod.price),
          quantity: qty,
          pickedQuantity: pickedQty,
          status: itemStatus
        });
      }

      // Thông tin xác nhận và tài xế:
      const isConfirmed = stage.stage >= 5;
      const isShipped = stage.stage >= 6;
      const isDelivered = stage.stage === 7;

      const confirmedBy = isConfirmed ? 'Trần Văn Bình (Quản lý kho Gò Vấp)' : null;
      const confirmedAt = isConfirmed ? createdDate.toISOString() : null;

      const assignedDriverId = isShipped ? driver.id : null;
      const assignedDriverName = isShipped ? driver.name : null;
      const assignedDriverPhone = isShipped ? driver.phone : null;
      const assignedDriverPlate = isShipped ? driver.plate : null;

      const podPhotoUrl = isDelivered ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800' : null;
      const podSignature = isDelivered ? 'Ký nhận: ' + cust.name : null;

      // Ghi chú chuẩn chỉ nghiệp vụ
      let noteText = `Đơn hàng trực tuyến - Khách: ${cust.name}`;
      if (stage.stage === 1) noteText = `[Chờ duyệt] Khách vừa đặt đơn online, đang chờ Quản lý duyệt`;
      if (stage.stage === 2) noteText = `[Đã duyệt] Quản lý đã duyệt đơn, chuyển kho sẵn sàng lấy hàng`;
      if (stage.stage === 3) noteText = `[Đang gom hàng] Nhân viên kho đang gom hàng trên kệ theo wave`;
      if (stage.stage === 4) noteText = `[Đã đóng gói] Hàng đã gom xong, đóng thùng dán tem tại trạm đóng gói`;
      if (stage.stage === 5) noteText = `[Đã xuất kho] Thủ kho kiểm tra xác nhận, tập kết tại cửa Dock`;
      if (stage.stage === 6) noteText = `[Đang giao] Bàn giao tài xế ${driver.name} (${driver.plate}) giao tận nơi`;
      if (stage.stage === 7) noteText = `[Hoàn thành] Giao thành công tận tay khách, đã thu tiền COD`;

      // 3.1. Insert vào sfwms_order (Bảng orders)
      await ordClient.query(`
        INSERT INTO orders (
          "id", "customerId", "customerName", "customerPhone", "customerAddress",
          "status", "totalAmount", "shippingFee", "discount", "shippingLat", "shippingLng",
          "deliveryMethod", "paymentMethod", "note", "assignedWarehouseId", "assignedWarehouseName", "assignedWarehouseCode",
          "assignedDriverId", "assignedDriverName", "assignedDriverPhone", "assignedDriverPlate",
          "isPaid", "codCollectedAmount", "codSettledStatus", "podPhotoUrl", "podSignature",
          "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $27)
      `, [
        orderId, crypto.randomUUID(), cust.name, cust.phone, cust.address,
        stage.orderStatus, totalAmount + 22000, 22000, 0, cust.lat, cust.lng,
        'home', 'cod', noteText, 'WH-006', 'Kho Gò Vấp (HCM Northwest)', 'WH-006',
        assignedDriverId, assignedDriverName, assignedDriverPhone, assignedDriverPlate,
        isDelivered, isDelivered ? totalAmount + 22000 : 0, isDelivered ? 'SETTLED' : 'UNSETTLED',
        podPhotoUrl, podSignature,
        createdDate
      ]);

      // Insert order items
      for (const it of orderItems) {
        await ordClient.query(`
          INSERT INTO order_items ("id", "orderId", "productId", "sku", "productName", "price", "quantity")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [it.id, orderId, it.productId, it.sku, it.productName, it.price, it.quantity]);
      }

      // 3.2. Insert vào sfwms_outbound (Bảng outbound_orders) - Liên kết chặt chẽ 1-1
      const outboundNote = `[ORDER_ID:${orderId}] ${noteText}`;
      await outClient.query(`
        INSERT INTO outbound_orders (
          id, order_code, status, requester_name, destination, customer_phone,
          total_items, total_quantity, warehouse_code, latitude, longitude,
          notes, confirmed_by, confirmed_at,
          assigned_driver_id, assigned_driver_name, assigned_driver_phone, assigned_driver_plate,
          pod_photo_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
      `, [
        crypto.randomUUID(), orderCode, stage.outboundStatus, cust.name, cust.address, cust.phone,
        numItems, totalQty, 'WH-006', cust.lat, cust.lng,
        outboundNote, confirmedBy, confirmedAt,
        assignedDriverId, assignedDriverName, assignedDriverPhone, assignedDriverPlate,
        podPhotoUrl, createdDate
      ]);

      // Insert outbound order items (kèm vị trí kệ slot_id & lô FEFO chuẩn)
      const outbOrderId = (await outClient.query('SELECT id FROM outbound_orders WHERE order_code = $1', [orderCode])).rows[0].id;
      for (let itemIdx = 0; itemIdx < orderItems.length; itemIdx++) {
        const it = orderItems[itemIdx];
        const skuClean = (it.sku || '').toUpperCase();
        let matchedLot = lots.find(l => {
          const pId = (l.product_id || '').toUpperCase();
          const lCode = (l.lot_code || '').toUpperCase();
          return pId === skuClean || lCode.includes(skuClean);
        }) || lots[(orderIndex * 3 + itemIdx) % lots.length];

        await outClient.query(`
          INSERT INTO outbound_order_items (
            id, outbound_order_id, sku, product_name, requested_quantity, picked_quantity, status,
            lot_id, lot_code, slot_id, expiry_date, risk_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          crypto.randomUUID(), outbOrderId, it.sku, it.productName, it.quantity, it.pickedQuantity, it.status,
          matchedLot ? matchedLot.id : null,
          matchedLot ? matchedLot.lot_code : null,
          matchedLot ? matchedLot.location : 'cld-shelf-1-slot-1',
          matchedLot ? matchedLot.expiry_date : null,
          matchedLot ? (matchedLot.risk_score || 0) : 0
        ]);
      }

      console.log(`   + Đơn #${orderIndex} [${orderCode} | ECOMM-${orderId.slice(0, 8).toUpperCase()}]: ${stage.orderStatus} -> ${cust.name} (${numItems} món)`);
    }
  }

  const finalOrdCount = (await ordClient.query('SELECT COUNT(*) FROM orders')).rows[0].count;
  const finalOutCount = (await outClient.query('SELECT COUNT(*) FROM outbound_orders')).rows[0].count;

  console.log('\n========================================================================');
  console.log(`✅ HOÀN TẤT SEED TOÀN DIỆN:`);
  console.log(`   - Tổng số đơn TMĐT (sfwms_order): ${finalOrdCount} đơn`);
  console.log(`   - Tổng số phiếu xuất kho (sfwms_outbound): ${finalOutCount} phiếu`);
  console.log(`   - Chuỗi trạng thái 7 bước chuẩn:`);
  console.log(`     1. PENDING (3 đơn) -> Chờ quản lý duyệt`);
  console.log(`     2. PROCESSING (3 đơn) -> Quản lý đã duyệt, sẵn sàng gom`);
  console.log(`     3. PICKING (3 đơn) -> Nhân viên đang gom hàng`);
  console.log(`     4. PACKED (3 đơn) -> Đã đóng gói xong`);
  console.log(`     5. CONFIRMED / READY_FOR_DELIVERY (3 đơn) -> Đã duyệt xuất kho`);
  console.log(`     6. SHIPPED / DELIVERING (3 đơn) -> Đang giao hàng`);
  console.log(`     7. COMPLETED / DELIVERED (3 đơn) -> Đã giao thành công`);
  console.log('========================================================================');

  await prodClient.end();
  await ordClient.end();
  await outClient.end();
  await invClient.end();
}

main().catch(err => {
  console.error('❌ Lỗi khi reseed:', err);
  process.exit(1);
});

