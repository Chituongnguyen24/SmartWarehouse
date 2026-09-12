const { Client } = require('pg');

async function dropToanOrder() {
  const dbs = ['sfwms_outbound', 'sfwms_order', 'sfwms_inventory'];
  for (const db of dbs) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: db,
    });

    try {
      await client.connect();
      console.log(`Connected to database: ${db}`);

      if (db === 'sfwms_outbound') {
        // Delete items first if foreign key exists
        const delItems = await client.query(
          `DELETE FROM outbound_order_items WHERE outbound_order_id IN (
            SELECT id FROM outbound_orders WHERE requester_name ILIKE '%Toàn%' OR destination ILIKE '%Tô Ký%' OR requested_by ILIKE '%Toàn%'
          )`
        );
        console.log(`Deleted outbound_order_items: ${delItems.rowCount}`);

        const delOrders = await client.query(
          `DELETE FROM outbound_orders WHERE requester_name ILIKE '%Toàn%' OR destination ILIKE '%Tô Ký%' OR requested_by ILIKE '%Toàn%'`
        );
        console.log(`Deleted outbound_orders: ${delOrders.rowCount}`);

        try {
          const delOutbox = await client.query(
            `DELETE FROM outbox_events WHERE payload::text ILIKE '%Toàn%' OR payload::text ILIKE '%Tô Ký%'`
          );
          console.log(`Deleted outbox_events: ${delOutbox.rowCount}`);
        } catch (e) {
          console.warn('Outbox events delete:', e.message);
        }
      }

      if (db === 'sfwms_order') {
        try {
          const delOrderItems = await client.query(
            `DELETE FROM order_items WHERE order_id IN (
              SELECT id FROM orders WHERE customer_name ILIKE '%Toàn%' OR shipping_address ILIKE '%Tô Ký%'
            )`
          );
          console.log(`Deleted order_items: ${delOrderItems.rowCount}`);
        } catch (e) {}

        const delOrders = await client.query(
          `DELETE FROM orders WHERE customer_name ILIKE '%Toàn%' OR shipping_address ILIKE '%Tô Ký%'`
        );
        console.log(`Deleted customer orders: ${delOrders.rowCount}`);
      }

      await client.end();
    } catch (err) {
      console.error(`Error on database ${db}:`, err.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }

  // Also clear Redis locks/caches if any
  try {
    const Redis = require('ioredis');
    const redis = new Redis({ host: 'localhost', port: 6379 });
    const keys = await redis.keys('*');
    for (const k of keys) {
      if (k.includes('lock') || k.includes('lots') || k.includes('order')) {
        await redis.del(k);
      }
    }
    console.log('Cleared Redis temporary caches & locks.');
    redis.disconnect();
  } catch (e) {
    console.warn('Redis clear warning:', e.message);
  }

  console.log('✅ Hoàn tất xóa sạch đơn hàng của Nguyễn Văn Toàn!');
}

dropToanOrder();
