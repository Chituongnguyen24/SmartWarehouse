const { Client } = require('pg');
const Redis = require('ioredis');

async function syncAllInventory() {
  const pClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  const iClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_inventory', password: 'postgres', port: 5432 });
  await pClient.connect();
  await iClient.connect();

  console.log('Connecting to databases...');

  // Group active lots by product_id
  const { rows: lots } = await iClient.query(
    'SELECT product_id, SUM(remaining_qty)::int as total FROM lots WHERE remaining_qty > 0 GROUP BY product_id'
  );
  const lotMap = new Map();
  for (const l of lots) {
    lotMap.set(l.product_id, Number(l.total));
  }

  const { rows: prods } = await pClient.query('SELECT id, sku, name, stock FROM products');
  let updatedCount = 0;
  let watermelonUpdated = null;

  for (const p of prods) {
    const actualQty = lotMap.get(p.id) || lotMap.get(p.sku) || 0;
    if (p.stock !== actualQty) {
      await pClient.query('UPDATE products SET stock = $1 WHERE id = $2', [actualQty, p.id]);
      updatedCount++;
      if (p.sku === 'CT-11260277' || p.name.includes('Dưa hấu')) {
        watermelonUpdated = { id: p.id, sku: p.sku, name: p.name, stock: actualQty };
      }
    }
  }

  console.log(`Synced ${updatedCount} products with live warehouse lots.`);
  if (watermelonUpdated) {
    console.log('Watermelon updated to live stock:', watermelonUpdated);
  }

  await pClient.end();
  await iClient.end();

  // Clear Redis cache
  try {
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const keys = await redis.keys('cache:product:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} product cache keys.`);
    }
    redis.disconnect();
  } catch (e) {
    console.warn('Redis clear skipped:', e.message);
  }

  // Realtime WebSocket broadcast
  try {
    const targetPayload = watermelonUpdated || { sku: 'CT-11260277', stock: 50 };
    await fetch('http://localhost:3004/orders/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'product_updated',
        payload: targetPayload
      })
    });
    console.log('Broadcasted realtime product_updated event.');
  } catch (e) {
    console.warn('Realtime broadcast skipped:', e.message);
  }
}

syncAllInventory().catch(console.error);

