const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate Lots for ALL 16 warehouses
const ALL_WAREHOUSES = [
  'WH-001', 'WH-002', 'WH-003', 'WH-004', 'WH-005', 'WH-006', 'WH-007', 'WH-008',
  'WH-009', 'WH-010', 'WH-011', 'WH-012', 'WH-013', 'WH-014', 'WH-015', 'WH-016'
];

async function run() {
  console.log('Fetching existing products...');
  
  // 1. Connect to Product DB to get all products
  const prodClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_product'
  });
  await prodClient.connect();
  const resProducts = await prodClient.query('SELECT id, sku, storage_type FROM products');
  const products = resProducts.rows;
  await prodClient.end();
  console.log(`Found ${products.length} products.`);

  const lots = [];
  
  // Distribute stock
  // For each product, pick a random number of warehouses (e.g. 4 to 10 out of 16)
  // This guarantees that many warehouses won't have the product, simulating out-of-stock scenarios.
  products.forEach(p => {
    // Shuffle the warehouses array
    const shuffledWh = [...ALL_WAREHOUSES].sort(() => 0.5 - Math.random());
    const numWarehouses = randomInt(4, 10);
    const selectedWhs = shuffledWh.slice(0, numWarehouses);

    selectedWhs.forEach(wh => {
      // 1 to 3 lots per warehouse for this product
      const numLots = randomInt(1, 3);
      for (let i = 0; i < numLots; i++) {
        lots.push({
          id: generateUUID(),
          lotCode: `LOT-${p.sku}-${wh}-${generateUUID().substring(0,8)}`,
          productId: p.id,
          supplierId: '11111111-1111-1111-1111-111111111111',
          importDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + randomInt(5, 100) * 86400000).toISOString(),
          quantity: randomInt(100, 5000),
          remainingQty: randomInt(10, 4999),
          zone: p.storage_type || 'DRY',
          location: `${(p.storage_type || 'DRY').toLowerCase()}-shelf-${randomInt(1, 50)}`,
          warehouseCode: wh,
          riskScore: randomInt(0, 80), // keep it mostly normal
          status: 'NORMAL',
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        });
      }
    });
  });

  // 2. Insert into Inventory DB
  const invClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_inventory'
  });
  await invClient.connect();
  console.log('Connected to Inventory DB');

  // Clear existing lots so we don't duplicate or have bad data
  console.log('Clearing old lots...');
  await invClient.query('DELETE FROM lots');
  console.log('Old lots cleared.');

  console.log(`Generating ${lots.length} new lots across 16 warehouses...`);

  if (lots.length > 0) {
    const BATCH_SIZE = 3000; 
    for (let i = 0; i < lots.length; i += BATCH_SIZE) {
      const batchLots = lots.slice(i, i + BATCH_SIZE);
      let invQuery = `INSERT INTO lots (id, lot_code, product_id, supplier_id, import_date, expiry_date, quantity, remaining_qty, zone, location, warehouse_code, risk_score, status, created_by, created_at) VALUES `;
      const invValues = [];
      let invCounter = 1;
      for (const l of batchLots) {
        invQuery += `($${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}, $${invCounter++}),`;
        invValues.push(l.id, l.lotCode, l.productId, l.supplierId, l.importDate, l.expiryDate, l.quantity, l.remainingQty, l.zone, l.location, l.warehouseCode, l.riskScore, l.status, l.createdBy, l.createdAt);
      }
      invQuery = invQuery.slice(0, -1);
      await invClient.query(invQuery, invValues);
      console.log(`Inserted batch of ${batchLots.length} lots (${i + batchLots.length}/${lots.length})...`);
    }
  }
  
  await invClient.end();
  console.log('Done redistributing stock!');
}

run().catch(console.error);
