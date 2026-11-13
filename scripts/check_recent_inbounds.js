const { Client } = require('pg');

async function checkRecentInbounds() {
  const c = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'sfwms_inbound', port: 5432 });
  await c.connect();
  const res = await c.query('SELECT * FROM inbound_orders ORDER BY created_at DESC LIMIT 3');
  console.log('Inbound orders:');
  console.log(JSON.stringify(res.rows, null, 2));

  const items = await c.query('SELECT * FROM inbound_order_items ORDER BY created_at DESC LIMIT 5');
  console.log('Inbound items:');
  console.log(JSON.stringify(items.rows, null, 2));

  await c.end();
}

checkRecentInbounds().catch(console.error);

