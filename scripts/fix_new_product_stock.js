const { Client } = require('pg');
const Redis = require('ioredis');

async function fixNewProductStock() {
  const pClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  await pClient.connect();

  // 1. Alter table column default to 0
  await pClient.query('ALTER TABLE products ALTER COLUMN stock SET DEFAULT 0');
  console.log('ALTER TABLE products: stock default set to 0');

  // 2. Set stock = 0 for any products with SKU CT-11260277 or id ac7cd300-719a-4742-8c8e-e20fce8affee
  const res = await pClient.query(
    "UPDATE products SET stock = 0 WHERE sku = 'CT-11260277' OR id = 'ac7cd300-719a-4742-8c8e-e20fce8affee' RETURNING id, sku, name, stock"
  );
  console.log('Updated product stock:', res.rows);

  const { rows: allProds } = await pClient.query("SELECT id, sku, name, stock FROM products WHERE sku = 'CT-11260277'");
  const updatedProd = allProds[0];

  await pClient.end();

  // 3. Clear Redis Cache
  try {
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const keys = await redis.keys('cache:product:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} product cache keys in Redis.`);
    }
    redis.disconnect();
  } catch (err) {
    console.warn('Redis clear skipped:', err.message);
  }

  // 4. Broadcast realtime update to order-service gateway (<1s)
  if (updatedProd) {
    try {
      await fetch('http://localhost:3004/orders/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'product_updated',
          payload: updatedProd
        })
      });
      console.log('Realtime broadcast sent for', updatedProd.sku);
    } catch (e) {
      console.warn('Broadcast failed:', e.message);
    }
  }
}

fixNewProductStock().catch(console.error);

