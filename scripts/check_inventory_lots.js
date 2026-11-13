const { Client } = require('pg');

async function checkInventoryLots() {
  const c = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'sfwms_inventory', port: 5432 });
  await c.connect();
  const res = await c.query("SELECT * FROM lots WHERE lot_code = 'LOT-2026-001' OR product_id = 'CT-11260277'");
  console.log('Matching lots in sfwms_inventory:');
  console.log(JSON.stringify(res.rows, null, 2));

  const recentLots = await c.query('SELECT id, lot_code, product_id, quantity, remaining_qty, location, warehouse_code, created_at FROM lots ORDER BY created_at DESC LIMIT 5');
  console.log('Most recent 5 lots in sfwms_inventory:');
  console.log(JSON.stringify(recentLots.rows, null, 2));

  await c.end();
}

checkInventoryLots().catch(console.error);

