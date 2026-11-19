const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_outbound'
  });

  await client.connect();

  // Update OB-2026-11005 items
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-1-slot-1', lot_code = 'LOT-MILK-WH6' WHERE id = 'd589a742-5760-48ba-9b8a-25d1e6d05e9a'");
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-2-slot-1', lot_code = 'LOT-CP-250100794-WH-006-20261116-1' WHERE id = '9f6a727f-3025-4553-b363-115fccbc863b'");
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-3-slot-1', lot_code = 'LOT-CP-250104527-WH-006-20261116-1' WHERE id = '1acfc2f2-3ae8-4973-bf58-4412afecbb97'");

  // Update OB-2026-11007 items
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-1-slot-4', lot_code = 'LOT-CP-250101324-WH-006-20261117-1' WHERE id = '74dfaac5-1efc-4f6d-bf26-29ca1761abe8'");
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-2-slot-2', lot_code = 'LOT-CP-250100667-WH-006-20261120-1' WHERE id = 'd7e944d5-2535-45ff-8039-698aa3724f52'");

  // Update OB-2026-11008 items
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-1-slot-1', lot_code = 'LOT-TOMATO-WH6' WHERE id = 'ef8c6c26-c0dd-4bdd-8ebe-14d0022186cf'");
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-2-slot-3', lot_code = 'LOT-CP-250106956-WH-006-20261126-1' WHERE id = 'f0b0dffb-1c25-4a8f-b92e-8b7a4492393c'");
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-3-slot-4', lot_code = 'LOT-CP-250101318-WH-006-20261117-1' WHERE id = '4ffe6d29-cfd9-4520-acd9-e48ec3d565c2'");

  // Update OB-2026-11009 items
  await client.query("UPDATE outbound_order_items SET slot_id = 'cold-shelf-3-slot-1', lot_code = 'LOT-CP-250100893-WH-006-20261117-1' WHERE id = '5ec937ca-af4b-4d08-b06a-1da715badb20'");

  // Update ECOMM-98318E93 to PICKING
  await client.query("UPDATE outbound_orders SET status = 'PICKING' WHERE order_code = 'ECOMM-98318E93'");

  console.log('Outbound order items successfully mapped to A1, A2, A3 shelves!');
  await client.end();
}

main().catch(console.error);
