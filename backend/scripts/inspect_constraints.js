const { Client } = require('pg');

async function inspect() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_auth'
  });

  await client.connect();

  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conname = 'UQ_97672ac88f789774dd47f7c8be3'
  `);
  console.log('Constraint:', res.rows);

  const allUsers = await client.query(`SELECT id, email, name, role, warehouse_code, code FROM users ORDER BY email`);
  console.table(allUsers.rows);

  await client.end();
}

inspect().catch(console.error);
