const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

const DRIVERS = [
  {
    phone: '0377019958',
    email: 'lecongchung@sfwms.vn',
    name: 'Lê Công Chung',
    code: 'ADMIN-CHUNG',
    licensePlate: '51-A1 999.99',
    vehicleType: 'Xe Giao Hàng & Giám Sát Quản Trị',
    warehouseCode: 'WH-006',
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 5.0,
    completedTasksToday: 15,
    totalEarningsToday: 550000
  },
  {
    phone: '0977112233',
    email: 'driver.tri@sfwms.vn',
    name: 'Võ Minh Trí',
    code: 'NV-GV05',
    licensePlate: '59-V1 888.99',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.95,
    completedTasksToday: 12,
    totalEarningsToday: 420000
  },
  {
    phone: '0909888111',
    email: 'hung.nguyen@sfwms.vn',
    name: 'Nguyễn Văn Hùng',
    code: 'NV-GV06',
    licensePlate: '59-G2 688.39',
    vehicleType: 'Xe Máy Giao Siêu Tốc',
    warehouseCode: 'WH-006',
    currentTemp: 2.8,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.90,
    completedTasksToday: 10,
    totalEarningsToday: 350000
  },
  {
    phone: '0933445566',
    email: 'bao.tran@sfwms.vn',
    name: 'Trần Quốc Bảo',
    code: 'NV-GV07',
    licensePlate: '59-P1 456.78',
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    currentTemp: 3.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.85,
    completedTasksToday: 8,
    totalEarningsToday: 280000
  },
  {
    phone: '0966332211',
    email: 'tung.le@sfwms.vn',
    name: 'Lê Thanh Tùng',
    code: 'NV-GV09',
    licensePlate: '59-X1 999.11',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    currentTemp: 3.1,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.90,
    completedTasksToday: 9,
    totalEarningsToday: 320000
  },
  {
    phone: '0988112244',
    email: 'long.bui@sfwms.vn',
    name: 'Bùi Hoàng Long',
    code: 'NV-BT01',
    licensePlate: '59-S2 555.66',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-002',
    currentTemp: 2.9,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 11,
    totalEarningsToday: 380000
  },
  {
    phone: '0977223344',
    email: 'huy.truong@sfwms.vn',
    name: 'Trương Gia Huy',
    code: 'NV-TB01',
    licensePlate: '59-H1 333.22',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-003',
    currentTemp: 2.7,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 10,
    totalEarningsToday: 350000
  },
  {
    phone: '0944778899',
    email: 'truck@sfwms.vn',
    name: 'Đặng Hoàng Phúc',
    code: 'NV-TK01',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000
  },
  {
    phone: '0918776655',
    email: 'van@sfwms.vn',
    name: 'Phan Hữu Nam',
    code: 'NV-VAN01',
    licensePlate: '51D-456.78',
    vehicleType: 'Xe Bán Tải 1.5 Tấn',
    warehouseCode: 'WH-006',
    currentTemp: 2.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.92,
    completedTasksToday: 8,
    totalEarningsToday: 520000
  }
];

async function run() {
  await client.connect();
  console.log('Connected to sfwms_auth PostgreSQL.');

  // 1. Alter table users to add driver columns if not exists
  const alterQueries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS license_plate VARCHAR(50);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS current_temp FLOAT DEFAULT 3.2;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS target_temp_min FLOAT DEFAULT 0.0;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS target_temp_max FLOAT DEFAULT 4.0;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings_today INT DEFAULT 0;'
  ];

  for (const q of alterQueries) {
    await client.query(q);
  }
  console.log('Checked/Added driver columns to users table.');

  // 2. Update/Upsert drivers
  for (const d of DRIVERS) {
    const res = await client.query(
      `UPDATE users 
       SET license_plate = $1, 
           vehicle_type = $2, 
           current_temp = $3, 
           target_temp_min = $4, 
           target_temp_max = $5, 
           total_earnings_today = $6,
           rating = $7,
           tasks_completed = $8,
           phone = COALESCE(phone, $11),
           code = COALESCE(code, $9),
           warehouse_code = COALESCE(warehouse_code, $10)
       WHERE phone = $11 OR email = $12 OR code = $9
       RETURNING id, name, email, phone, license_plate, vehicle_type;`,
      [
        d.licensePlate,
        d.vehicleType,
        d.currentTemp,
        d.targetTempMin,
        d.targetTempMax,
        d.totalEarningsToday,
        d.rating,
        d.completedTasksToday,
        d.code,
        d.warehouseCode,
        d.phone,
        d.email
      ]
    );

    if (res.rowCount > 0) {
      console.log(`Updated driver: ${res.rows[0].name} (${res.rows[0].license_plate} - ${res.rows[0].vehicle_type})`);
    } else {
      console.log(`Driver not found to update: ${d.name} (${d.phone})`);
    }
  }

  await client.end();
  console.log('Migration and driver update completed.');
}

run().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
