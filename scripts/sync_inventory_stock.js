const { Client } = require('pg');
const Redis = require('ioredis');

async function syncAllStock() {
  const pClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  const iClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_inventory', password: 'postgres', port: 5432 });
  await pClient.connect();
  await iClient.connect();

  console.log('Connected to sfwms_product and sfwms_inventory.');

  // Sum active lots
  const { rows: stockRows } = await iClient.query(
    'SELECT product_id, SUM(remaining_qty)::int as total_qty FROM lots WHERE remaining_qty > 0 GROUP BY product_id'
  );
  const stockMap = new Map();
  for (const r of stockRows) {
    stockMap.set(r.product_id, Number(r.total_qty));
  }

  const { rows: prods } = await pClient.query('SELECT id, sku, name FROM products');
  let updatedCount = 0;
  let zeroCount = 0;

  for (const p of prods) {
    const qty = stockMap.get(p.id) || stockMap.get(p.sku) || 0;
    await pClient.query('UPDATE products SET stock = $1 WHERE id = $2', [qty, p.id]);
    updatedCount++;
    if (qty === 0) zeroCount++;
  }

  console.log(`Successfully synced stock for ${updatedCount} products. Out of stock (0): ${zeroCount}`);

  await pClient.end();
  await iClient.end();

  // Clear Redis Cache
  try {
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const keys = await redis.keys('cache:product:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Invalidated ${keys.length} product cache keys.`);
    }
    redis.disconnect();
  } catch (err) {
    console.warn('Redis clear skipped:', err.message);
  }
}

syncAllStock().catch(err => {
  console.error('Stock sync failed:', err);
  process.exit(1);
});

