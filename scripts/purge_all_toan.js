const { Client } = require('pg');

async function findAndDestroy() {
  const dbs = ['postgres', 'sfwms_order', 'sfwms_orders', 'sfwms_outbound', 'sfwms_transport', 'sfwms_delivery'];
  for (const db of dbs) {
    const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: db });
    try {
      await client.connect();
      console.log(`Connected to ${db}`);

      // List all tables
      const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
      for (const row of tablesRes.rows) {
        const table = row.table_name;
        try {
          // Check columns
          const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
          const cols = colsRes.rows.map(c => c.column_name);

          // Find rows with Toan or ECOMM or 45 Tô Ký
          const textCols = cols.filter(c => !c.includes('id') && !c.includes('date') && !c.includes('at'));
          if (textCols.length > 0) {
            const whereClauses = textCols.map(c => `"${c}"::text ILIKE '%Toàn%' OR "${c}"::text ILIKE '%C16167EF%' OR "${c}"::text ILIKE '%Tô Ký%'`).join(' OR ');
            const found = await client.query(`SELECT * FROM "${table}" WHERE ${whereClauses}`);
            if (found.rows.length > 0) {
              console.log(`🎯 FOUND ${found.rows.length} rows in ${db}.${table}! Deleting...`);
              if (table === 'outbound_orders') {
                await client.query(`DELETE FROM outbound_order_items WHERE outbound_order_id IN (SELECT id FROM outbound_orders WHERE ${whereClauses})`);
              }
              await client.query(`DELETE FROM "${table}" WHERE ${whereClauses}`);
              console.log(`💥 DELETED from ${db}.${table}`);
            }
          }
        } catch (e) {
          // ignore
        }
      }
      await client.end();
    } catch (e) {
      // db might not exist
    }
  }

  // Also clear Redis
  try {
    const Redis = require('ioredis');
    const redis = new Redis({ host: 'localhost', port: 6379 });
    await redis.flushall();
    console.log('🧹 Flushed all Redis keys!');
    redis.disconnect();
  } catch (e) {}

  console.log('🚀 CLEANUP COMPLETED!');
}

findAndDestroy();
