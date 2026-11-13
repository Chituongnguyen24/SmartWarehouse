const { Client } = require('pg');

async function checkNoLotProducts() {
  const pClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  const iClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_inventory', password: 'postgres', port: 5432 });
  await pClient.connect();
  await iClient.connect();

  const { rows: lots } = await iClient.query('SELECT product_id, SUM(remaining_qty)::int as total FROM lots GROUP BY product_id');
  const lotMap = new Map();
  for (const l of lots) {
    lotMap.set(l.product_id, Number(l.total));
  }

  const { rows: prods } = await pClient.query('SELECT id, sku, name, stock FROM products');
  const noLotProducts = [];
  for (const p of prods) {
    const total = lotMap.get(p.id) || lotMap.get(p.sku) || 0;
    if (total === 0) {
      noLotProducts.push({ id: p.id, sku: p.sku, name: p.name, currentDbStock: p.stock });
    }
  }

  console.log('Total products with 0 lots:', noLotProducts.length);
  console.table(noLotProducts);

  await pClient.end();
  await iClient.end();
}

checkNoLotProducts().catch(console.error);

