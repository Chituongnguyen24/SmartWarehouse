const { Client } = require('pg');

async function check() {
  const c = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'sfwms_inventory', port: 5432 });
  await c.connect();
  const res = await c.query("SELECT * FROM lots WHERE product_id = 'ac7cd300-719a-4742-8c8e-e20fce8affee' OR product_id = 'CT-11260277'");
  console.log('Lots found in inventory-service:', res.rows.length);
  await c.end();
}

check().catch(console.error);

