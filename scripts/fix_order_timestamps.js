const { Client } = require('pg');

async function fixTimestamps() {
  const ordClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/sfwms_order' });
  const obClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/sfwms_outbound' });

  await ordClient.connect();
  await obClient.connect();

  console.log('--- Fixing timestamps in sfwms_order ---');

  await ordClient.query(`
    UPDATE orders
    SET "createdAt" = '2026-11-11 08:00:00'::timestamp + (random() * interval '3 hours')
    WHERE id NOT IN (
      '07f7746d-ba00-469c-83d9-105094b84e0c',
      '3163ab0e-d7e7-49d9-bb4c-a111a9386d9a',
      '98318e93-c40d-4076-a0f1-da0f4c330f80',
      '506861f0-43f6-42ee-8e4d-720aebffb5cb'
    );
  `);

  await ordClient.query(`
    UPDATE orders
    SET "createdAt" = NOW()
    WHERE id = '07f7746d-ba00-469c-83d9-105094b84e0c';
  `);
  await ordClient.query(`
    UPDATE orders
    SET "createdAt" = NOW() - interval '2 minutes'
    WHERE id = '3163ab0e-d7e7-49d9-bb4c-a111a9386d9a';
  `);
  await ordClient.query(`
    UPDATE orders
    SET "createdAt" = NOW() - interval '4 minutes'
    WHERE id = '98318e93-c40d-4076-a0f1-da0f4c330f80';
  `);

  console.log('--- Fixing timestamps in sfwms_outbound ---');
  await obClient.query(`
    UPDATE outbound_orders
    SET created_at = '2026-11-11 08:00:00'::timestamp + (random() * interval '3 hours')
    WHERE order_code NOT LIKE 'ECOMM-%';
  `);

  await obClient.query(`
    UPDATE outbound_orders
    SET created_at = NOW()
    WHERE order_code = 'ECOMM-07F7746D';
  `);
  await obClient.query(`
    UPDATE outbound_orders
    SET created_at = NOW() - interval '2 minutes'
    WHERE order_code = 'ECOMM-3163AB0E';
  `);
  await obClient.query(`
    UPDATE outbound_orders
    SET created_at = NOW() - interval '4 minutes'
    WHERE order_code = 'ECOMM-98318E93';
  `);

  const topOrd = await ordClient.query(`
    SELECT id, status, "customerName", "createdAt"
    FROM orders
    ORDER BY "createdAt" DESC
    LIMIT 6;
  `);
  console.log('Top orders in sfwms_order:');
  console.table(topOrd.rows);

  const topOb = await obClient.query(`
    SELECT order_code, status, requester_name, created_at
    FROM outbound_orders
    ORDER BY created_at DESC
    LIMIT 6;
  `);
  console.log('Top orders in sfwms_outbound:');
  console.table(topOb.rows);

  await ordClient.end();
  await obClient.end();
}

fixTimestamps().catch(console.error);
