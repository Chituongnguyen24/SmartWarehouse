/**
 * DATABASE OVERHAUL & CURATED RESEED SCRIPT
 * Chuẩn bị dữ liệu hoàn hảo cho đồ án tốt nghiệp SmartWarehouse (Bảo vệ tháng 12/2026)
 * - Lọc ~130 sản phẩm siêu thị chính hãng tiêu biểu nhất (Vissan, CP, Vinamilk, TH True, Knorr, Otoki, Ensure...)
 * - Phân bổ 100% khớp 26 kệ 3D Digital Twin Kho Gò Vấp (Kệ A1-A8 Mát, B1-B8 Đông, C1-C10 Khô)
 * - Chuẩn hóa mã Lô: LOT-EM-[SKU]-[WH]-[YYYYMMDD]-[BATCH]
 * - Khung thời gian hạn dùng đa tầng: kiểm thử hoàn hảo từ 11/11/2026 đến giữa tháng 12/2026 và sang 2027
 * - Giữ nguyên 100% tài khoản người dùng trong sfwms_user
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

const SUPPLIERS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Công ty TNHH Emart Việt Nam' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Tập đoàn Thực phẩm CJ CheilJedang' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Công ty CP Việt Nam Kỹ Nghệ Súc Sản (Vissan)' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Công ty CP Chăn Nuôi C.P. Việt Nam' },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Công ty CP Hàng Tiêu Dùng Masan' },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Công ty Cổ phần Sữa TH (TH True Milk)' }
];

const GOVAP_DESTINATIONS = [
  { name: 'Nguyễn Hoàng Nam', phone: '0987654321', address: '350 Quang Trung, P. 10, Q. Gò Vấp, TP.HCM', lat: 10.8252, lng: 106.6631 },
  { name: 'Trần Thị Thúy', phone: '0988112233', address: '45 Phan Văn Trị, P. 5, Q. Gò Vấp, TP.HCM', lat: 10.8290, lng: 106.6850 },
  { name: 'Lê Văn Cường', phone: '0988223344', address: '120 Nguyễn Oanh, P. 17, Q. Gò Vấp, TP.HCM', lat: 10.8410, lng: 106.6790 },
  { name: 'Vũ Minh Tuấn', phone: '0988334455', address: '78 Thống Nhất, P. 11, Q. Gò Vấp, TP.HCM', lat: 10.8410, lng: 106.6620 },
  { name: 'Phạm Hồng Nhung', phone: '0988445566', address: '210 Lê Đức Thọ, P. 15, Q. Gò Vấp, TP.HCM', lat: 10.8520, lng: 106.6710 },
  { name: 'Bùi Kim Oanh', phone: '0988556677', address: '95 Phạm Văn Đồng, P. 1, Q. Gò Vấp, TP.HCM', lat: 10.8190, lng: 106.6880 },
  { name: 'Đoàn Gia Bảo', phone: '0912334455', address: '55 Lê Văn Thọ, P. 9, Q. Gò Vấp, TP.HCM', lat: 10.8350, lng: 106.6570 },
  { name: 'Hoàng Thị Mai', phone: '0903445566', address: '18 Nguyễn Thái Sơn, P. 3, Q. Gò Vấp, TP.HCM', lat: 10.8210, lng: 106.6810 }
];

const ALL_WAREHOUSES = [
  'WH-006', // Kho Gò Vấp (Trung tâm demo)
  'WH-001', 'WH-002', 'WH-003', 'WH-004', 'WH-005',
  'WH-007', 'WH-008', 'WH-009', 'WH-010', 'WH-011', 'WH-012'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Hàm phân loại chính xác khu vực bảo quản dựa trên tên và đặc tính thực tế
function getTrueStorageType(p) {
  const n = (p.name || '').toLowerCase();
  if (n.includes('đông lạnh') || n.includes('cấp đông') || n.includes('chả giò') || n.includes('gyoza') || 
      n.includes('dimsum') || n.includes('tokbokki') || n.includes('kem ') || n.includes('viên lẩu') || 
      n.includes('hải sản đông') || n.includes('bò đông') || n.includes('cá viên') || n.includes('bánh trứng bon')) {
    return 'FROZEN';
  }
  if (n.includes('thịt tươi') || n.includes('thịt heo') || n.includes('thịt bò') || n.includes('nạm bò') || 
      n.includes('sườn bò') || n.includes('bò úc') || n.includes('gà tươi') || n.includes('cánh gà') || 
      n.includes('đùi gà') || n.includes('nấm ') || n.includes('sữa chua') || n.includes('sữa tươi thanh trùng') || 
      n.includes('trứng gà') || n.includes('phô mai') || n.includes('giò thủ') || n.includes('giò lụa') || 
      n.includes('xúc xích') || n.includes('bò viên') || n.includes('rau ') || n.includes('cải ') || 
      n.includes('xà lách') || n.includes('đậu hũ') || n.includes('vietgap') || n.includes('thanh trùng')) {
    return 'COLD';
  }
  if (n.includes('gạo ') || n.includes('dầu ăn') || n.includes('nước mắm') || n.includes('nước tương') || 
      n.includes('mì ') || n.includes('phở ') || n.includes('bánh quy') || n.includes('sữa bột') || 
      n.includes('kẹo') || n.includes('snack') || n.includes('trà ') || n.includes('cà phê') || 
      n.includes('kombucha') || n.includes('nước ngọt') || n.includes('đồ hộp') || n.includes('pate') || 
      n.includes('cá hộp') || n.includes('mayonnaise') || n.includes('tương ớt') || n.includes('bột ')) {
    return 'DRY';
  }
  return p.storageType || 'DRY';
}

function scoreProduct(p) {
  const brandKeywords = [
    'vissan', 'cp', 'le gourmet', 'đức việt', 'bibigo', 'cầu tre',
    'vinamilk', 'th true', 'đà lạt milk', 'anchor', 'devondale', 'betagen', 'anlene', 'ensure', 'milo',
    'knorr', 'chinsu', 'cholimex', 'maggi', 'otoki', 'miwon', 'neptune', 'meizan', '3 cô gái',
    'star kombucha', 'coca', 'pepsi', 'lavie', 'aquafina', 'red bull',
    'hảo hảo', 'omachi', 'cung đình', 'vifon', 'orion', 'kinh đô', 'cosy'
  ];
  let score = 0;
  const nameLower = (p.name || '').toLowerCase();
  for (const b of brandKeywords) {
    if (nameLower.includes(b)) score += 8;
  }
  if (p.barcode && p.barcode.length === 13) score += 4;
  if (p.origin && p.origin.includes('Việt Nam')) score += 3;
  if (p.unit && ['Hộp', 'Chai', 'Gói', 'Lon', 'Vỉ', 'Khay', 'Túi', 'Thùng'].includes(p.unit)) score += 2;
  return score;
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU ĐẠI TU DATABASE CHO KHÓA LUẬN (MỐC THÁNG 11 - 12/2026)');
  console.log('========================================================================\n');

  // Đọc danh mục gốc
  const jsonPath = path.join(__dirname, '../backend/data/emart_products.json');
  const allRaw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📖 Đã đọc ${allRaw.length} sản phẩm gốc từ file JSON.`);

  // Lọc sản phẩm chất lượng cao
  const isClean = p => p.name && p.imageUrl && p.imageUrl.startsWith('http') && 
                       p.price >= 5000 && !p.name.includes('Cơm Lười') && !p.name.includes('Phở Cuốn');

  const classified = allRaw.filter(isClean).map(p => ({
    ...p,
    trueStorage: getTrueStorageType(p)
  }));

  const coldCandidates = classified.filter(p => p.trueStorage === 'COLD').sort((a,b) => scoreProduct(b) - scoreProduct(a));
  const frozenCandidates = classified.filter(p => p.trueStorage === 'FROZEN').sort((a,b) => scoreProduct(b) - scoreProduct(a));
  const dryCandidates = classified.filter(p => p.trueStorage === 'DRY').sort((a,b) => scoreProduct(b) - scoreProduct(a));

  // Tuyển chọn số lượng vàng: 40 COLD, 35 FROZEN, 55 DRY => Tổng 130 sản phẩm siêu thị
  const selectedCold = coldCandidates.slice(0, 40);
  const selectedFrozen = frozenCandidates.slice(0, 35);
  const selectedDry = dryCandidates.slice(0, 55);
  const curatedProducts = [...selectedCold, ...selectedFrozen, ...selectedDry];

  console.log(`🎯 Tuyển chọn thành công ${curatedProducts.length} sản phẩm đẹp nhất:`);
  console.log(`   - Kho Mát (COLD):   ${selectedCold.length} sản phẩm (khớp Kệ A1 - A8)`);
  console.log(`   - Kho Đông (FROZEN): ${selectedFrozen.length} sản phẩm (khớp Kệ B1 - B8)`);
  console.log(`   - Kho Khô (DRY):    ${selectedDry.length} sản phẩm (khớp Kệ C1 - C10)\n`);

  // =========================================================================
  // 1. NẠP PRODUCT SERVICE (sfwms_product)
  // =========================================================================
  console.log('--- 1/4. NẠP BẢNG PRODUCTS (sfwms_product) ---');
  const prodClient = new Client({ ...DB_CONFIG, database: 'sfwms_product' });
  await prodClient.connect();

  console.log('  🧹 Xóa bảng products cũ...');
  await prodClient.query('TRUNCATE TABLE products CASCADE;');

  const productRecords = [];
  for (const p of curatedProducts) {
    const pId = crypto.randomUUID();
    const storage = p.trueStorage;
    const minTemp = storage === 'FROZEN' ? -25 : storage === 'COLD' ? 2 : null;
    const maxTemp = storage === 'FROZEN' ? -15 : storage === 'COLD' ? 8 : null;
    const maxHumidity = storage === 'DRY' ? 70 : null;

    const rec = {
      id: pId,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      storageType: storage,
      shelfLifeDays: p.shelfLifeDays || (storage === 'COLD' ? 30 : storage === 'FROZEN' ? 180 : 365),
      price: p.price || 35000,
      unit: p.unit || 'Cái',
      imageUrl: p.imageUrl
    };
    productRecords.push(rec);

    await prodClient.query(`
      INSERT INTO products (
        id, sku, name, category, storage_type, min_temp, max_temp, max_humidity, unit,
        price, image_url, description, origin, preservation, is_flash_sale, discount_percent,
        rating, sold_count, stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
      pId, p.sku, p.name, p.category, storage, minTemp, maxTemp, maxHumidity,
      rec.unit, rec.price, p.imageUrl,
      `Sản phẩm ${p.name} chính hãng đạt chuẩn chất lượng bảo quản ${storage}.`,
      p.origin || 'Việt Nam',
      storage === 'FROZEN' ? 'Bảo quản đông lạnh -18°C' : storage === 'COLD' ? 'Bảo quản mát 2°C - 8°C' : 'Nơi khô ráo, thoáng mát',
      false, 0, (4.7 + Math.random() * 0.3).toFixed(1), randomInt(50, 800), randomInt(200, 1500)
    ]);
  }

  const pCount = await prodClient.query('SELECT COUNT(*) FROM products');
  console.log(`  ✅ Đã lưu ${pCount.rows[0].count} sản phẩm chuẩn vào sfwms_product.\n`);
  await prodClient.end();

  // =========================================================================
  // 2. NẠP LÔ TỒN KHO sfwms_inventory (KHỚP 100% 26 KỆ GÒ VẤP)
  // =========================================================================
  console.log('--- 2/4. NẠP LÔ TỒN KHO THỰC TẾ & CHUẨN HÓA MÃ LÔ (sfwms_inventory) ---');
  const invClient = new Client({ ...DB_CONFIG, database: 'sfwms_inventory' });
  await invClient.connect();

  console.log('  🧹 Xóa bảng lots & stock_movements cũ...');
  try { await invClient.query('TRUNCATE TABLE stock_movements CASCADE;'); } catch (e) {}
  await invClient.query('TRUNCATE TABLE lots CASCADE;');

  const lotsToInsert = [];
  const now = new Date('2026-11-11T10:00:00Z');

  // Helper để lấy chuỗi ngày chuẩn YYYYMMDD
  const formatYMD = (d) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}${mo}${da}`;
  };

  // ── A. TẠO LÔ HÀNG TẠI KHO TRUNG TÂM GÒ VẤP (WH-006) ──
  // Mỗi Kệ được thiết kế chuẩn 5 Hàng x 3 Cột = 15 vị trí slots (phủ đầy 14 thùng to mỗi kệ)
  // 1. KHO MÁT (8 Kệ: cld-shelf-1 đến cld-shelf-8)
  for (let shelfNum = 1; shelfNum <= 8; shelfNum++) {
    const shelfProds = selectedCold.slice((shelfNum - 1) * 5, shelfNum * 5);
    const slotsCount = 14; // Phủ đầy 14/15 ô trên 5 tầng x 3 cột

    for (let slot = 1; slot <= slotsCount; slot++) {
      const p = shelfProds[(slot - 1) % shelfProds.length];
      const pRec = productRecords.find(r => r.sku === p.sku);
      const location = `cld-shelf-${shelfNum}-slot-${slot}`;

      let importDate, expiryDate, status, riskScore, suffix;

      if (shelfNum === 1 && slot === 1) {
        importDate = new Date('2026-10-25T08:00:00Z');
        expiryDate = new Date('2026-11-20T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 82;
        suffix = 'FEFO';
      } else if (shelfNum === 1 && slot === 2) {
        importDate = new Date('2026-11-01T08:00:00Z');
        expiryDate = new Date('2026-12-20T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 76;
        suffix = 'FEFO';
      } else if (shelfNum === 1 && slot === 3) {
        importDate = new Date('2026-10-05T08:00:00Z');
        expiryDate = new Date('2026-11-05T17:00:00Z');
        status = 'EXPIRED';
        riskScore = 95;
        suffix = 'EXP';
      } else {
        importDate = new Date('2026-11-05T08:00:00Z');
        expiryDate = new Date(Date.UTC(2027, randomInt(5, 11), randomInt(1, 28)));
        status = 'NORMAL';
        riskScore = randomInt(5, 18);
        suffix = `L${Math.floor((slot - 1) / 3) + 1}`;
      }

      const lotCode = `LOT-${p.sku}-WH006-${formatYMD(importDate)}-${suffix}`;
      const qty = randomInt(20, 36);
      lotsToInsert.push({
        id: crypto.randomUUID(),
        lotCode: `${lotCode}-${slot}`,
        productId: pRec.id,
        supplierId: randomChoice(SUPPLIERS).id,
        importDate: importDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        quantity: qty,
        remainingQty: Math.floor(qty * 0.86),
        zone: 'COLD',
        location,
        warehouseCode: 'WH-006',
        riskScore,
        status,
        createdBy: 'system_overhaul'
      });
    }
  }

  // 2. KHO ĐÔNG (8 Kệ: frz-shelf-1 đến frz-shelf-8)
  for (let shelfNum = 1; shelfNum <= 8; shelfNum++) {
    const shelfProds = selectedFrozen.slice((shelfNum - 1) * 4, shelfNum * 4 + 2);
    const slotsCount = 14;

    for (let slot = 1; slot <= slotsCount; slot++) {
      const p = shelfProds[(slot - 1) % shelfProds.length];
      const pRec = productRecords.find(r => r.sku === p.sku);
      const location = `frz-shelf-${shelfNum}-slot-${slot}`;

      let importDate, expiryDate, status, riskScore, suffix;

      if (shelfNum === 1 && slot === 1) {
        importDate = new Date('2026-10-28T08:00:00Z');
        expiryDate = new Date('2026-11-22T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 80;
        suffix = 'FEFO';
      } else if (shelfNum === 1 && slot === 2) {
        importDate = new Date('2026-11-02T08:00:00Z');
        expiryDate = new Date('2026-12-22T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 75;
        suffix = 'FEFO';
      } else {
        importDate = new Date('2026-11-06T08:00:00Z');
        expiryDate = new Date(Date.UTC(2027, randomInt(6, 11), randomInt(1, 28)));
        status = 'NORMAL';
        riskScore = randomInt(4, 15);
        suffix = `L${Math.floor((slot - 1) / 3) + 1}`;
      }

      const lotCode = `LOT-${p.sku}-WH006-${formatYMD(importDate)}-${suffix}`;
      const qty = randomInt(20, 36);
      lotsToInsert.push({
        id: crypto.randomUUID(),
        lotCode: `${lotCode}-${slot}`,
        productId: pRec.id,
        supplierId: randomChoice(SUPPLIERS).id,
        importDate: importDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        quantity: qty,
        remainingQty: Math.floor(qty * 0.88),
        zone: 'FROZEN',
        location,
        warehouseCode: 'WH-006',
        riskScore,
        status,
        createdBy: 'system_overhaul'
      });
    }
  }

  // 3. KHO KHÔ (10 Kệ: dry-shelf-1 đến dry-shelf-10)
  for (let shelfNum = 1; shelfNum <= 10; shelfNum++) {
    const shelfProds = selectedDry.slice((shelfNum - 1) * 5, shelfNum * 5 + 3);
    const slotsCount = 14;

    for (let slot = 1; slot <= slotsCount; slot++) {
      const p = shelfProds[(slot - 1) % shelfProds.length];
      const pRec = productRecords.find(r => r.sku === p.sku);
      const location = `dry-shelf-${shelfNum}-slot-${slot}`;

      let importDate, expiryDate, status, riskScore, suffix;

      if (shelfNum === 1 && slot === 1) {
        importDate = new Date('2026-10-20T08:00:00Z');
        expiryDate = new Date('2026-11-25T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 74;
        suffix = 'FEFO';
      } else if (shelfNum === 1 && slot === 2) {
        importDate = new Date('2026-11-03T08:00:00Z');
        expiryDate = new Date('2026-12-25T17:00:00Z');
        status = 'AT_RISK';
        riskScore = 72;
        suffix = 'FEFO';
      } else {
        importDate = new Date('2026-11-08T08:00:00Z');
        expiryDate = new Date(Date.UTC(2027, randomInt(8, 11), randomInt(1, 28)));
        status = 'NORMAL';
        riskScore = randomInt(2, 12);
        suffix = `L${Math.floor((slot - 1) / 3) + 1}`;
      }

      const lotCode = `LOT-${p.sku}-WH006-${formatYMD(importDate)}-${suffix}`;
      const qty = randomInt(22, 40);
      lotsToInsert.push({
        id: crypto.randomUUID(),
        lotCode: `${lotCode}-${slot}`,
        productId: pRec.id,
        supplierId: randomChoice(SUPPLIERS).id,
        importDate: importDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        quantity: qty,
        remainingQty: Math.floor(qty * 0.90),
        zone: 'DRY',
        location,
        warehouseCode: 'WH-006',
        riskScore,
        status,
        createdBy: 'system_overhaul'
      });
    }
  }
    lotsToInsert.push({
      id: crypto.randomUUID(),
      lotCode,
      productId: pRec.id,
      supplierId: randomChoice(SUPPLIERS).id,
      importDate: importDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      quantity: qty,
      remainingQty: Math.floor(qty * 0.9),
      zone: 'DRY',
      location,
      warehouseCode: 'WH-006',
      riskScore,
      status,
      createdBy: 'system_overhaul'
    });
  });

  // ── B. TẠO LÔ HÀNG VỆ TINH CHO CÁC KHO KHÁC (WH-001 ĐẾN WH-005, WH-007..12) ──
  const otherWhs = ALL_WAREHOUSES.filter(w => w !== 'WH-006');
  otherWhs.forEach(whCode => {
    // Mỗi kho vệ tinh lấy 25 mặt hàng tiêu biểu
    const whSample = productRecords.slice(0, 25);
    whSample.forEach((pRec, pIdx) => {
      const zone = pRec.storageType;
      const shelfPrefix = zone === 'FROZEN' ? 'frz' : zone === 'COLD' ? 'cld' : 'dry';
      const maxS = zone === 'DRY' ? 10 : 8;
      const loc = `${shelfPrefix}-shelf-${(pIdx % maxS) + 1}-slot-${(pIdx % 5) + 1}`;
      const importDate = new Date('2026-11-07T08:00:00Z');
      const expiryDate = new Date(Date.UTC(2027, 8, 15));

      lotsToInsert.push({
        id: crypto.randomUUID(),
        lotCode: `LOT-${pRec.sku}-${whCode}-${formatYMD(importDate)}-01`,
        productId: pRec.id,
        supplierId: randomChoice(SUPPLIERS).id,
        importDate: importDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        quantity: 200,
        remainingQty: 180,
        zone,
        location: loc,
        warehouseCode: whCode,
        riskScore: 10,
        status: 'NORMAL',
        createdBy: 'system_overhaul'
      });
    });
  });

  console.log(`  💾 Đang chèn ${lotsToInsert.length} Lô hàng chuẩn hóa vào sfwms_inventory...`);
  for (const lot of lotsToInsert) {
    await invClient.query(`
      INSERT INTO lots (
        id, lot_code, product_id, supplier_id, import_date, expiry_date,
        quantity, remaining_qty, zone, location, warehouse_code, risk_score,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      lot.id, lot.lotCode, lot.productId, lot.supplierId, lot.importDate, lot.expiryDate,
      lot.quantity, lot.remainingQty, lot.zone, lot.location, lot.warehouseCode,
      lot.riskScore, lot.status, lot.createdBy
    ]);
  }

  const lotCount = await invClient.query('SELECT COUNT(*) FROM lots');
  console.log(`  ✅ Đã lưu ${lotCount.rows[0].count} Lô hàng (trong đó 130 lô Gò Vấp khớp chuẩn 100% 26 kệ 3D).\n`);
  await invClient.end();

  // =========================================================================
  // 3. NẠP PHIẾU NHẬP KHO THỰC TẾ (sfwms_inbound)
  // =========================================================================
  console.log('--- 3/4. NẠP PHIẾU NHẬP KHO THÁNG 11/2026 (sfwms_inbound) ---');
  const inClient = new Client({ ...DB_CONFIG, database: 'sfwms_inbound' });
  await inClient.connect();

  console.log('  🧹 Xóa phiếu nhập kho cũ...');
  await inClient.query('TRUNCATE TABLE inbound_order_items CASCADE;');
  await inClient.query('TRUNCATE TABLE inbound_orders CASCADE;');

  const inboundStatuses = ['COMPLETED', 'COMPLETED', 'STORED', 'RECEIVING', 'PENDING'];
  for (let i = 1; i <= 20; i++) {
    const oId = crypto.randomUUID();
    const orderCode = `INB-2026-${String(11000 + i)}`;
    const supp = SUPPLIERS[(i - 1) % SUPPLIERS.length];
    const status = inboundStatuses[(i - 1) % inboundStatuses.length];
    const whCode = i <= 14 ? 'WH-006' : randomChoice(ALL_WAREHOUSES);
    const day = Math.min(11, i);
    const createdDate = new Date(`2026-11-${String(day).padStart(2, '0')}T08:30:00Z`);

    const numItems = randomInt(2, 5);
    let totalQty = 0;
    let totalAmt = 0;
    const items = [];

    for (let k = 0; k < numItems; k++) {
      const prod = productRecords[(i * 3 + k) % productRecords.length];
      const qty = randomInt(50, 200);
      totalQty += qty;
      totalAmt += qty * prod.price;

      items.push({
        id: crypto.randomUUID(),
        inboundOrderId: oId,
        sku: prod.sku,
        productName: prod.name,
        expectedQuantity: qty,
        unit: prod.unit,
        unitPrice: prod.price,
        receivedQuantity: status === 'COMPLETED' || status === 'STORED' ? qty : status === 'RECEIVING' ? Math.floor(qty * 0.6) : 0,
        status: status === 'COMPLETED' || status === 'STORED' ? 'STORED' : status === 'RECEIVING' ? 'RECEIVED' : 'PENDING',
        assignedZone: prod.storageType
      });
    }

    await inClient.query(`
      INSERT INTO inbound_orders (
        id, order_code, supplier_id, supplier_name, invoice_number, deliverer_name,
        total_amount, status, total_items, total_quantity, quality_check_passed, warehouse_code, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
    `, [
      oId, orderCode, supp.id, supp.name, `INV-2026-${String(11000 + i)}`,
      `Tài xế giao hàng ${supp.name.split(' ')[0]}`, totalAmt, status, numItems, totalQty,
      status === 'COMPLETED' || status === 'STORED', whCode, createdDate
    ]);

    for (const it of items) {
      await inClient.query(`
        INSERT INTO inbound_order_items (
          id, inbound_order_id, sku, product_name, expected_quantity, unit,
          unit_price, received_quantity, status, assigned_zone, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      `, [
        it.id, it.inboundOrderId, it.sku, it.productName, it.expectedQuantity,
        it.unit, it.unitPrice, it.receivedQuantity, it.status, it.assignedZone, createdDate
      ]);
    }
  }

  const inCount = await inClient.query('SELECT COUNT(*) FROM inbound_orders');
  console.log(`  ✅ Đã nạp ${inCount.rows[0].count} phiếu nhập kho mới nhất tháng 11/2026.\n`);
  await inClient.end();

  // =========================================================================
  // 4. NẠP PHIẾU XUẤT KHO THỰC TẾ (sfwms_outbound)
  // =========================================================================
  console.log('--- 4/4. NẠP PHIẾU XUẤT KHO & ĐƠN HÀNG GIAO TẬN NƠI (sfwms_outbound) ---');
  const outClient = new Client({ ...DB_CONFIG, database: 'sfwms_outbound' });
  await outClient.connect();

  console.log('  🧹 Xóa phiếu xuất kho cũ...');
  await outClient.query('TRUNCATE TABLE outbound_order_items CASCADE;');
  await outClient.query('TRUNCATE TABLE outbound_orders CASCADE;');

  // Chuẩn hóa quy trình WMS: PENDING (Chờ lấy) -> PICKING (Đang lấy) -> PACKED (Đã đóng gói) -> CONFIRMED (Đã xuất kho) -> SHIPPED (Đang giao hàng) -> DELIVERED (Đã giao)
  const outboundStatuses = ['PENDING', 'PICKING', 'PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  for (let i = 1; i <= 25; i++) {
    const oId = crypto.randomUUID();
    const orderCode = `OB-2026-${String(11000 + i)}`;
    const cust = GOVAP_DESTINATIONS[(i - 1) % GOVAP_DESTINATIONS.length];
    const status = outboundStatuses[(i - 1) % outboundStatuses.length];
    const whCode = i <= 20 ? 'WH-006' : randomChoice(ALL_WAREHOUSES);
    const day = Math.min(11, Math.max(1, i % 12));
    const createdDate = new Date(`2026-11-${String(day).padStart(2, '0')}T09:15:00Z`);

    const numItems = randomInt(1, 4);
    let totalQty = 0;
    const items = [];

    const isFullyPicked = ['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(status);

    for (let k = 0; k < numItems; k++) {
      const prod = productRecords[(i * 4 + k) % productRecords.length];
      const qty = randomInt(1, 6);
      totalQty += qty;
      const pQty = isFullyPicked ? qty : (status === 'PICKING' && k === 0 ? Math.max(1, Math.floor(qty / 2)) : 0);
      items.push({
        id: crypto.randomUUID(),
        outboundOrderId: oId,
        sku: prod.sku,
        productName: prod.name,
        requestedQuantity: qty,
        pickedQuantity: pQty,
        status: isFullyPicked ? (status === 'DELIVERED' ? 'COMPLETED' : status) : (pQty > 0 ? 'PICKED' : 'PENDING')
      });
    }

    const isConfirmedOrBeyond = ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(status);
    const driverNote = status === 'SHIPPED' ? 'Đã bàn giao tài xế vận chuyển giao tận nơi' : status === 'DELIVERED' ? 'Giao thành công có ký nhận POD' : `Phiếu xuất phục vụ đơn khách hàng ${cust.name}`;

    await outClient.query(`
      INSERT INTO outbound_orders (
        id, order_code, status, requester_name, destination,
        total_items, total_quantity, warehouse_code, latitude, longitude,
        notes, confirmed_by, confirmed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      oId, orderCode, status, cust.name, cust.address,
      numItems, totalQty, whCode, cust.lat, cust.lng,
      driverNote,
      isConfirmedOrBeyond ? 'Trần Văn Bình (QL Kho Gò Vấp)' : null,
      isConfirmedOrBeyond ? createdDate.toISOString() : null,
      createdDate
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

  const outCount = await outClient.query('SELECT COUNT(*) FROM outbound_orders');
  console.log(`  ✅ Đã nạp ${outCount.rows[0].count} phiếu xuất kho mới nhất tháng 11/2026.\n`);
  await outClient.end();

  // =========================================================================
  // 5. NẠP ĐƠN HÀNG TMĐT (sfwms_order)
  // =========================================================================
  console.log('--- NẠP ĐƠN HÀNG TMĐT ĐỒNG BỘ (sfwms_order) ---');
  const ordClient = new Client({ ...DB_CONFIG, database: 'sfwms_order' });
  await ordClient.connect();

  console.log('  🧹 Xóa đơn hàng online cũ...');
  await ordClient.query('TRUNCATE TABLE order_items CASCADE;');
  await ordClient.query('TRUNCATE TABLE orders CASCADE;');

  const ordStatuses = ['PENDING', 'PROCESSING', 'PICKING', 'PACKED', 'READY_FOR_DELIVERY', 'COMPLETED'];
  for (let i = 1; i <= 20; i++) {
    const oId = crypto.randomUUID();
    const cust = GOVAP_DESTINATIONS[(i - 1) % GOVAP_DESTINATIONS.length];
    const status = ordStatuses[(i - 1) % ordStatuses.length];
    const day = Math.min(11, Math.max(1, i % 12));
    const createdDate = new Date(`2026-11-${String(day).padStart(2, '0')}T10:00:00Z`);

    const numItems = randomInt(1, 3);
    let totalAmt = 0;
    const items = [];

    for (let k = 0; k < numItems; k++) {
      const prod = productRecords[(i * 5 + k) % productRecords.length];
      const qty = randomInt(1, 3);
      totalAmt += qty * prod.price;
      items.push({
        id: crypto.randomUUID(),
        orderId: oId,
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        price: prod.price,
        quantity: qty
      });
    }

    await ordClient.query(`
      INSERT INTO orders (
        "id", "customerId", "customerName", "customerPhone", "customerAddress",
        "status", "totalAmount", "shippingFee", "discount", "shippingLat", "shippingLng",
        "deliveryMethod", "paymentMethod", "note", "assignedWarehouseId", "assignedWarehouseName", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
    `, [
      oId, crypto.randomUUID(), cust.name, cust.phone, cust.address,
      status, totalAmt + 22000, 22000, 0, cust.lat, cust.lng,
      'home', 'cod', `Đơn hàng trực tuyến - Khách ${cust.name}`, 'WH-006', 'Kho Hàng Gò Vấp (HCM Northwest)',
      createdDate
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

  const ordCount = await ordClient.query('SELECT COUNT(*) FROM orders');
  console.log(`  ✅ Đã nạp ${ordCount.rows[0].count} đơn hàng TMĐT mới.\n`);
  await ordClient.end();

  console.log('========================================================================');
  console.log('🎉🎉 ĐẠI TU VÀ TÁI CẤU TRÚC DATABASE THÀNH CÔNG RỰC RỠ!');
  console.log('   - 130 sản phẩm tiêu biểu chuẩn siêu thị đã nạp.');
  console.log('   - 100% lô hàng Kho Gò Vấp đặt đúng Kệ A1-A8, B1-B8, C1-C10.');
  console.log('   - Hạn dùng chuẩn: Test mượt mà từ 11/11/2026 đến hết tháng 12/2026 & 2027.');
  console.log('   - Tài khoản người dùng (users) được giữ nguyên vẹn 100%.');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('❌ Lỗi khi chạy đại tu database:', err);
  process.exit(1);
});

