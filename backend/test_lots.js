const { Client } = require('pg');
async function run() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'sfwms_inventory'});
  await c.connect();
  const res = await c.query("SELECT * FROM lots WHERE warehouse_code='WH-001' LIMIT 5");
  console.log(res.rows);
  await c.end();
}
run();
