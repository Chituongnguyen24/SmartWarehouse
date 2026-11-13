const { Client } = require('pg');

async function check() {
  const c = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'sfwms_product', port: 5432 });
  await c.connect();
  const res = await c.query("SELECT id, sku, name, stock FROM products WHERE sku = 'CT-11260277'");
  console.log('Stock in sfwms_product:');
  console.table(res.rows);
  await c.end();
}

check().catch(console.error);

