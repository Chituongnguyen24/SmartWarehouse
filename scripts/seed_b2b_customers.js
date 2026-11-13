const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

const B2B_CUSTOMERS = [
  {
    code: 'B2B-001',
    name: 'Siêu thị WinMart+ (Chi nhánh Gò Vấp)',
    companyName: 'Công ty Cổ phần Dịch vụ Thương mại Tổng hợp WinCommerce',
    email: 'winmart.govap@wincommerce.masangroup.com',
    phone: '0903112233',
    taxCode: '0301412589',
    b2bType: 'SIEU_THI',
    creditLimit: 200000000,
    debtBalance: 45200000,
    discountRate: 12,
    billingAddress: '350 Lê Đức Thọ, Phường 6, Quận Gò Vấp, TP.HCM',
  },
  {
    code: 'B2B-002',
    name: 'Chuỗi Nhà Hàng Golden Gate (Kichi-Kichi Phan Văn Trị)',
    companyName: 'Công ty Cổ phần Thương mại Dịch vụ Cổng Vàng (Golden Gate Group)',
    email: 'procurement.fnb@ggg.com.vn',
    phone: '0908445566',
    taxCode: '0102721191',
    b2bType: 'NHA_HANG',
    creditLimit: 150000000,
    debtBalance: 28500000,
    discountRate: 15,
    billingAddress: '516 Phan Văn Trị, Phường 7, Quận Gò Vấp, TP.HCM',
  },
  {
    code: 'B2B-003',
    name: 'Bách Hóa Xanh (Cửa Hàng 189 Lê Quang Định - Bình Thạnh)',
    companyName: 'Công ty Cổ phần Thương mại Bách Hóa Xanh (MWG)',
    email: 'bhx.lequangdinh@bachhoaxanh.com',
    phone: '0913778899',
    taxCode: '0310471746',
    b2bType: 'SIEU_THI',
    creditLimit: 300000000,
    debtBalance: 112000000,
    discountRate: 10,
    billingAddress: '189 Lê Quang Định, Phường 7, Quận Bình Thạnh, TP.HCM',
  },
  {
    code: 'B2B-004',
    name: 'Khách Sạn Rex Hotel Sài Gòn (Bộ Phận Bếp Âu - Á)',
    companyName: 'Khách Sạn Quốc Tế Rex Saigon - Saigontourist Group',
    email: 'chef.procurement@rexhotelvietnam.com',
    phone: '0909556677',
    taxCode: '0300627710',
    b2bType: 'KHACH_SAN',
    creditLimit: 100000000,
    debtBalance: 15000000,
    discountRate: 8,
    billingAddress: '141 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
  },
  {
    code: 'B2B-005',
    name: 'Trường Quốc Tế Renaissance Saigon (Bếp Ăn Học Đường)',
    companyName: 'Công ty Cổ phần Giáo dục Quốc tế Renaissance',
    email: 'canteen.purchasing@renaissance.edu.vn',
    phone: '0938223344',
    taxCode: '0304918234',
    b2bType: 'BEP_AN',
    creditLimit: 80000000,
    debtBalance: 0,
    discountRate: 7,
    billingAddress: '74 Nguyễn Thị Thập, Phường Bình Thuận, Quận 7, TP.HCM',
  },
  {
    code: 'B2B-006',
    name: 'Chuỗi Cà Phê & Bakery The Coffee House (Central Kitchen)',
    companyName: 'Công ty Cổ phần Seedcom F&B (The Coffee House)',
    email: 'kitchen.supply@thecoffeehouse.vn',
    phone: '0902998877',
    taxCode: '0312867160',
    b2bType: 'NHA_HANG',
    creditLimit: 120000000,
    debtBalance: 36000000,
    discountRate: 14,
    billingAddress: '12 Võ Văn Kiệt, Phường Nguyễn Thái Bình, Quận 1, TP.HCM',
  },
  {
    code: 'B2B-007',
    name: 'Đại Lý Nông Sản Thực Phẩm Tươi Sống Chợ Đầu Mối Thủ Đức',
    companyName: 'Công ty TNHH Phân Phối Nông Sản Toàn Thắng Sài Gòn',
    email: 'toanthang.agri@gmail.com',
    phone: '0977665544',
    taxCode: '0315891234',
    b2bType: 'DAILY',
    creditLimit: 500000000,
    debtBalance: 240000000,
    discountRate: 18,
    billingAddress: 'Sạp A12, Chợ Đầu Mối Nông Sản Thủ Đức, TP. Thủ Đức',
  },
  {
    code: 'B2B-008',
    name: 'Công Ty CP Suất Ăn Hàng Không Tân Sơn Nhất (SASCO F&B)',
    companyName: 'Công ty Cổ phần Dịch vụ Hàng không Sân bay Tân Sơn Nhất',
    email: 'procurement.catering@sasco.com.vn',
    phone: '0901889900',
    taxCode: '0301123456',
    b2bType: 'BEP_AN',
    creditLimit: 400000000,
    debtBalance: 85000000,
    discountRate: 12,
    billingAddress: 'Sân bay Quốc tế Tân Sơn Nhất, Phường 2, Quận Tân Bình, TP.HCM',
  }
];

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database: postgres');

  // Add columns if they do not exist
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_code VARCHAR;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS b2b_type VARCHAR DEFAULT 'DAILY';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_limit BIGINT DEFAULT 50000000;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS debt_balance BIGINT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_rate FLOAT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address VARCHAR;
  `);
  console.log('Verified B2B columns in users table.');

  for (const b of B2B_CUSTOMERS) {
    const existing = await client.query('SELECT id FROM users WHERE code = $1 OR email = $2', [b.code, b.email]);
    if (existing.rows.length > 0) {
      await client.query(`
        UPDATE users
        SET name = $1,
            company_name = $2,
            phone = $3,
            tax_code = $4,
            b2b_type = $5,
            credit_limit = $6,
            debt_balance = $7,
            discount_rate = $8,
            billing_address = $9,
            role = 'CUSTOMER',
            status = 'ACTIVE'
        WHERE id = $10
      `, [
        b.name,
        b.companyName,
        b.phone,
        b.taxCode,
        b.b2bType,
        b.creditLimit,
        b.debtBalance,
        b.discountRate,
        b.billingAddress,
        existing.rows[0].id
      ]);
      console.log(`Updated B2B partner: ${b.code} - ${b.name}`);
    } else {
      await client.query(`
        INSERT INTO users (
          id, name, company_name, email, password_hash, role, phone, code,
          tax_code, b2b_type, credit_limit, debt_balance, discount_rate, billing_address, status
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ek5q79G/y/5qg9eG.',
          'CUSTOMER', $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE'
        )
      `, [
        b.name,
        b.companyName,
        b.email,
        b.phone,
        b.code,
        b.taxCode,
        b.b2bType,
        b.creditLimit,
        b.debtBalance,
        b.discountRate,
        b.billingAddress
      ]);
      console.log(`Inserted B2B partner: ${b.code} - ${b.name}`);
    }
  }

  const res = await client.query("SELECT code, name, b2b_type, discount_rate, credit_limit, debt_balance FROM users WHERE role = 'CUSTOMER' ORDER BY code ASC");
  console.log('Current B2B customers in DB:');
  console.table(res.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
