const { Client } = require('pg');
const http = require('http');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
};

async function executeSql(dbName, sql) {
  const client = new Client({ ...DB_CONFIG, database: dbName });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function fetchApi(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const { URL } = require('url');
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch(e) {
          resolve(chunks);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const mockLocations = [
  { dest: 'Quận 1, TP HCM', lat: 10.7769, lng: 106.7009 },
  { dest: 'Quận 3, TP HCM', lat: 10.7924, lng: 106.6853 },
  { dest: 'Quận Gò Vấp, TP HCM', lat: 10.8286, lng: 106.6713 },
  { dest: 'Quận 7, TP HCM', lat: 10.7339, lng: 106.7225 },
  { dest: 'Quận Tân Bình, TP HCM', lat: 10.8015, lng: 106.6526 },
  { dest: 'Quận 9, TP HCM', lat: 10.8427, lng: 106.8291 },
  { dest: 'Quận Thủ Đức, TP HCM', lat: 10.8494, lng: 106.7537 },
  { dest: 'Quận Bình Tân, TP HCM', lat: 10.7584, lng: 106.6022 },
  { dest: 'Quận Phú Nhuận, TP HCM', lat: 10.7967, lng: 106.6771 },
  { dest: 'Huyện Bình Chánh, TP HCM', lat: 10.7161, lng: 106.5861 },
];

async function seed() {
  console.log('--- RESETTING DATABASES ---');
  try {
    console.log('Wiping sfwms_outbound...');
    await executeSql('sfwms_outbound', 'TRUNCATE TABLE outbound_order_items CASCADE; TRUNCATE TABLE outbound_orders CASCADE;');
    
    console.log('Wiping sfwms_order...');
    await executeSql('sfwms_order', 'TRUNCATE TABLE order_items CASCADE; TRUNCATE TABLE orders CASCADE;');
  } catch (err) {
    console.log('Error wiping DB (maybe empty already):', err.message);
  }

  console.log('--- SEEDING WAREHOUSE MANAGERS ---');
  // Seeding warehouse managers directly into DB
  try {
    const bcrypt = require('bcryptjs'); // Assuming user-service uses bcryptjs
    const hashedPwd = await bcrypt.hash('password123', 10);
    const sql = `
      INSERT INTO "user" (id, email, password, name, role) 
      VALUES 
      ('mng-001', 'whm1@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 001', 'WAREHOUSE_MANAGER'),
      ('mng-002', 'whm2@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 002', 'WAREHOUSE_MANAGER'),
      ('mng-003', 'whm3@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 003', 'WAREHOUSE_MANAGER'),
      ('mng-004', 'whm4@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 004', 'WAREHOUSE_MANAGER')
      ON CONFLICT (email) DO NOTHING;
    `;
    await executeSql('sfwms_user', sql);
    console.log('Managers seeded.');
  } catch (err) {
    console.log('Could not seed managers directly (maybe bcrypt not found):', err.message);
  }

  console.log('--- SEEDING 10 AUTO-ROUTED ORDERS ---');
  for (let i = 0; i < mockLocations.length; i++) {
    const loc = mockLocations[i];
    const payload = {
      requestedBy: 'SYSTEM-SEED',
      requesterName: `Khách hàng ${i+1}`,
      destination: loc.dest,
      latitude: loc.lat,
      longitude: loc.lng,
      items: [
        { sku: 'MILK-DALAT-1L', productName: 'Sữa Đà Lạt 1L', requestedQuantity: Math.floor(Math.random() * 10) + 1 },
        { sku: 'BEEF-STEAK-US', productName: 'Thịt bò Mỹ', requestedQuantity: Math.floor(Math.random() * 5) + 1 }
      ]
    };

    console.log(`\nCreating Order ${i+1} to ${loc.dest}...`);
    try {
      const created = await fetchApi('http://localhost:3007/outbound-orders', 'POST', payload);
      
      if (!created || !created.id) {
         console.log('Failed to create order', created);
         continue;
      }
      console.log(`Created ID: ${created.id} -> Assigned WH: ${created.warehouseCode}`);

      console.log(`Confirming packing & outbound...`);
      await fetchApi(`http://localhost:3007/outbound-orders/${created.id}/confirm-picking`, 'PUT', { status: 'PACKED' });
      await fetchApi(`http://localhost:3007/outbound-orders/${created.id}/confirm`, 'PUT', { confirmedBy: 'QUAN LY KHO' });
    } catch (e) {
      console.log('Error calling outbound API', e.message);
    }
  }

  console.log('\n--- SEED COMPLETE ---');
}

seed().catch(console.error);
