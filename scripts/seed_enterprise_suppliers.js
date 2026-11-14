const { Client } = require('pg');

const SUPPLIERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'SUP-001',
    name: 'Công ty Cổ phần Nông nghiệp Công nghệ cao Đà Lạt (Dalat Organic Farms)',
    short_name: 'Dalat Farms',
    contact: 'Nguyễn Văn Thịnh (Giám đốc Phân phối)',
    phone: '0901234567',
    email: 'procurement@dalatorganic.vn',
    tax_code: '5801234567',
    address: 'Số 12 Hùng Vương, Phường 10, TP. Đà Lạt, Lâm Đồng',
    category: 'RAU_CU_QUA',
    payment_terms: 'Công nợ 15 ngày (Net 15)',
    rating: 4.9,
    lead_time_days: 1,
    certifications: 'VietGAP, GlobalGAP, Organic USDA',
    notes: 'Xe tải thùng lạnh 2-4°C, cam kết giao hàng lúc 04:00 sáng hàng ngày để đảm bảo độ tươi mới.',
    status: 'ACTIVE'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SUP-002',
    name: 'Công ty Cổ phần Việt Nam Kỹ Nghệ Súc Sản (VISSAN)',
    short_name: 'Vissan Meat',
    contact: 'Trần Quang Khải (Phụ trách Kênh B2B)',
    phone: '0283844438',
    email: 'sales.b2b@vissan.com.vn',
    tax_code: '0300142823',
    address: '420 Nơ Trang Long, Phường 13, Quận Bình Thạnh, TP.HCM',
    category: 'THIT_CA_TUOI',
    payment_terms: 'Công nợ 30 ngày (Net 30)',
    rating: 4.8,
    lead_time_days: 1,
    certifications: 'ISO 22000, HACCP, Kiểm dịch Thú Y Cục ATTP',
    notes: 'Cung cấp thịt heo, thịt bò tươi đạt chuẩn làm mát 0-2°C và thịt chế biến đông lạnh.',
    status: 'ACTIVE'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    code: 'SUP-003',
    name: 'Công ty Cổ phần Hàng Tiêu Dùng Masan (Masan Consumer)',
    short_name: 'Masan Consumer',
    contact: 'Lê Hoàng Nam (Trưởng nhóm Key Account)',
    phone: '0283827411',
    email: 'supplychain@masangroup.com',
    tax_code: '0302017440',
    address: 'Tòa nhà MPlaza Saigon, 39 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
    category: 'KHO_GIA_VI',
    payment_terms: 'Công nợ 30 ngày (Net 30)',
    rating: 4.7,
    lead_time_days: 2,
    certifications: 'FSSC 22000, ISO 9001:2015',
    notes: 'Nhà sản xuất nước mắm Nam Ngư, Chinsu, Mì Omachi, Kokomi, Tương ớt Chinsu, Xúc xích Ponnie.',
    status: 'ACTIVE'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    code: 'SUP-004',
    name: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
    short_name: 'Vinamilk',
    contact: 'Phan Thanh Hùng (Điều phối Chuỗi Cung Ứng)',
    phone: '02854155555',
    email: 'vinamilk@vinamilk.com.vn',
    tax_code: '0300588569',
    address: 'Số 10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM',
    category: 'SUA_BO_TRUNG',
    payment_terms: 'Công nợ 30 ngày (Net 30)',
    rating: 5.0,
    lead_time_days: 2,
    certifications: 'FSSC 22000, Organic EU, BRC Global Standard',
    notes: 'Cung cấp sữa tươi 100% tiệt trùng và thanh trùng, sữa chua SuSu, Probi, phô mai Vinamilk.',
    status: 'ACTIVE'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    code: 'SUP-005',
    name: 'Công ty Cổ phần Chăn Nuôi C.P. Việt Nam (Chi nhánh Đồng Nai)',
    short_name: 'C.P. Vietnam',
    contact: 'Somchai Prasert (Giám đốc Điều vận Thực phẩm)',
    phone: '02513836251',
    email: 'cpfoods@cp.com.vn',
    tax_code: '3600224423',
    address: 'Khu Công Nghiệp Biên Hòa 2, TP. Biên Hòa, Tỉnh Đồng Nai',
    category: 'THIT_CA_TUOI',
    payment_terms: 'Công nợ 15 ngày (Net 15)',
    rating: 4.8,
    lead_time_days: 1,
    certifications: 'VietGAP, ISO 14001, HACCP',
    notes: 'Mô hình 3F (Feed - Farm - Food khép kín), thịt gà tươi đóng khay, trứng gà tươi sạch tiệt trùng.',
    status: 'ACTIVE'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    code: 'SUP-006',
    name: 'Công ty Cổ phần Acecook Việt Nam',
    short_name: 'Acecook',
    contact: 'Vũ Minh Đức (Phụ trách Kênh Siêu Thị & Kho Bãi)',
    phone: '02838154064',
    email: 'sales@acecookvietnam.com',
    tax_code: '0300808687',
    address: 'Lô II-3, Đường số 11, KCN Tân Bình, Phường Tây Thạnh, Quận Tân Phú, TP.HCM',
    category: 'KHO_GIA_VI',
    payment_terms: 'Công nợ 45 ngày (Net 45)',
    rating: 4.9,
    lead_time_days: 2,
    certifications: 'Japanese Standard JFS, ISO 22000',
    notes: 'Cung cấp thùng mì Hảo Hảo Tôm Chua Cay, Phở Đệ Nhất, Miến Phú Hương, Mì ly Modern.',
    status: 'ACTIVE'
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    code: 'SUP-007',
    name: 'Công ty TNHH Thực phẩm San Hà',
    short_name: 'San Hà Food',
    contact: 'Phạm Thị Huệ (Phó Giám đốc Kinh Doanh)',
    phone: '02837508686',
    email: 'sanhafood@sanha.vn',
    tax_code: '0303698710',
    address: '951 Tạ Quang Bửu, Phường 6, Quận 8, TP.HCM',
    category: 'THIT_CA_TUOI',
    payment_terms: 'Công nợ 15 ngày (Net 15)',
    rating: 4.6,
    lead_time_days: 1,
    certifications: 'Chuỗi thực phẩm an toàn TP.HCM, HACCP',
    notes: 'Thịt gà ta thảo mộc, vịt xiêm, cá nước ngọt tươi sống giao hàng 2 ca mỗi ngày.',
    status: 'ACTIVE'
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    code: 'SUP-008',
    name: 'Công ty Cổ phần Sữa Đà Lạt (Dalat Milk - TH Group)',
    short_name: 'Dalat Milk',
    contact: 'Đỗ Thị Mai (Quản lý Kênh Chuỗi)',
    phone: '02633842123',
    email: 'cskh@dalatmilk.vn',
    tax_code: '5800001099',
    address: 'Xã Tu Tra, Huyện Đơn Dương, Tỉnh Lâm Đồng',
    category: 'SUA_BO_TRUNG',
    payment_terms: 'Công nợ 15 ngày (Net 15)',
    rating: 4.9,
    lead_time_days: 1,
    certifications: 'GlobalGAP, HACCP, ISO 22000',
    notes: 'Sữa tươi thanh trùng chất lượng cao nguyên chất, bảo quản 2-4°C, hạn dùng 12-15 ngày.',
    status: 'ACTIVE'
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    code: 'SUP-009',
    name: 'Công ty TNHH CJ Cầu Tre (CJ CheilJedang)',
    short_name: 'CJ Cầu Tre',
    contact: 'Kim Min Woo (Trưởng bộ phận Phân phối)',
    phone: '02838596666',
    email: 'order.cautre@cj.net',
    tax_code: '0300438178',
    address: 'Lô LA-1A đường 29, KCN Hiệp Phước, Huyện Nhà Bè, TP.HCM',
    category: 'DO_DONG_LANH',
    payment_terms: 'Công nợ 30 ngày (Net 30)',
    rating: 4.8,
    lead_time_days: 2,
    certifications: 'HACCP, ISO 22000, FDA Certified',
    notes: 'Thực phẩm đông lạnh cao cấp: Chả giò rế, Mandu Hàn Quốc, Há cảo, Xíu mại, bảo quản -18°C.',
    status: 'ACTIVE'
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    code: 'SUP-010',
    name: 'Công ty Cổ phần Bao Bì & Thùng Carton Toàn Cầu',
    short_name: 'Global Packaging',
    contact: 'Lê Trọng Tín (Phòng Vật tư & Đóng gói)',
    phone: '02837654321',
    email: 'contact@globalpackaging.vn',
    tax_code: '0312456789',
    address: 'Lô 15, Đường CN1, KCN Tân Bình, Quận Tân Phú, TP.HCM',
    category: 'DONG_GOI_BAO_BI',
    payment_terms: 'Công nợ 30 ngày (Net 30)',
    rating: 4.7,
    lead_time_days: 3,
    certifications: 'FSC Certified, ISO 9001:2015',
    notes: 'Cung ứng thùng carton 5 lớp chống ẩm cho kho mát, túi chân không thực phẩm, tem nhãn mã vạch.',
    status: 'ACTIVE'
  }
];

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_inventory'
  });

  await client.connect();
  console.log('Connected to sfwms_inventory.');

  for (const s of SUPPLIERS) {
    const check = await client.query('SELECT id FROM suppliers WHERE id = $1 OR code = $2', [s.id, s.code]);
    if (check.rows.length > 0) {
      await client.query(`
        UPDATE suppliers 
        SET code = $2, name = $3, short_name = $4, contact = $5, phone = $6, email = $7, tax_code = $8,
            address = $9, category = $10, payment_terms = $11, rating = $12, lead_time_days = $13,
            certifications = $14, notes = $15, status = $16, updated_at = NOW()
        WHERE id = $1
      `, [
        s.id, s.code, s.name, s.short_name, s.contact, s.phone, s.email, s.tax_code,
        s.address, s.category, s.payment_terms, s.rating, s.lead_time_days,
        s.certifications, s.notes, s.status
      ]);
      console.log(`Updated supplier: [${s.code}] ${s.short_name}`);
    } else {
      await client.query(`
        INSERT INTO suppliers (
          id, code, name, short_name, contact, phone, email, tax_code,
          address, category, payment_terms, rating, lead_time_days,
          certifications, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      `, [
        s.id, s.code, s.name, s.short_name, s.contact, s.phone, s.email, s.tax_code,
        s.address, s.category, s.payment_terms, s.rating, s.lead_time_days,
        s.certifications, s.notes, s.status
      ]);
      console.log(`Inserted supplier: [${s.code}] ${s.short_name}`);
    }
  }

  const count = await client.query('SELECT COUNT(*) FROM suppliers');
  console.log(`Total suppliers in sfwms_inventory: ${count.rows[0].count}`);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

