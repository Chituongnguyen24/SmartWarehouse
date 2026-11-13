const { Client } = require('pg');
const Redis = require('ioredis');

async function migrateSkus() {
  const prodClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  const orderClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_order', password: 'postgres', port: 5432 });
  const inbClient = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_inbound', password: 'postgres', port: 5432 });

  await prodClient.connect();
  await orderClient.connect();
  await inbClient.connect();

  console.log('Connected to databases.');

  // Fetch all products ordered by created_at, then id
  const { rows: products } = await prodClient.query('SELECT id, sku, name, created_at FROM products ORDER BY created_at ASC, id ASC');
  console.log('Total products to migrate:', products.length);

  // Since unique constraint exists, temporary prefix to avoid collision
  await prodClient.query('BEGIN');
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prodClient.query('UPDATE products SET sku = $1 WHERE id = $2', [`TEMP-${p.id}`, p.id]);
  }

  const skuMap = new Map(); // id -> { oldSku, newSku, name }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const seq = String(i + 1).padStart(4, '0');
    // Month 11, Year 26 (Format CT-11260001, CT-11260002, ...)
    const newSku = `CT-1126${seq}`;
    skuMap.set(p.id, { oldSku: p.sku, newSku, name: p.name });

    await prodClient.query('UPDATE products SET sku = $1 WHERE id = $2', [newSku, p.id]);
  }
  await prodClient.query('COMMIT');
  console.log('Successfully updated all products to new SKU format CT-1126xxxx!');

  // Update sfwms_order
  let updatedOrders = 0;
  for (const [id, info] of skuMap.entries()) {
    const res = await orderClient.query(
      'UPDATE order_items SET sku = $1 WHERE "productId" = $2 OR sku = $3',
      [info.newSku, id, info.oldSku]
    );
    updatedOrders += res.rowCount;
  }
  console.log('Updated order_items in sfwms_order:', updatedOrders);

  // Update sfwms_inbound
  let updatedInbounds = 0;
  for (const [id, info] of skuMap.entries()) {
    const res = await inbClient.query(
      'UPDATE inbound_order_items SET sku = $1 WHERE sku = $2 OR product_name = $3',
      [info.newSku, info.oldSku, info.name]
    );
    updatedInbounds += res.rowCount;
  }
  console.log('Updated inbound_order_items in sfwms_inbound:', updatedInbounds);

  await prodClient.end();
  await orderClient.end();
  await inbClient.end();

  // Clear Redis Cache
  try {
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const keys = await redis.keys('cache:product:*');
    const catKeys = await redis.keys('cache:categories:*');
    const all = [...keys, ...catKeys];
    if (all.length > 0) {
      await redis.del(...all);
      console.log('Cleared', all.length, 'Redis cache keys.');
    }
    redis.disconnect();
  } catch (err) {
    console.warn('Redis clear skipped:', err.message);
  }

  console.log('Migration finished successfully!');
}

migrateSkus().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

