const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });
  await client.connect();

  const email = 'manager_q12@coop.vn';
  const pass = await bcrypt.hash('123456', 10);
  
  // check if exists
  const res = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (res.rowCount > 0) {
    await client.query('UPDATE users SET role = $1, warehouse_code = $2 WHERE email = $3', ['WAREHOUSE_MANAGER', 'WH-001', email]);
    console.log('Updated existing manager account.');
  } else {
    const id = crypto.randomUUID();
    await client.query(`
      INSERT INTO users (id, name, email, password_hash, role, warehouse_code, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, 'Quản Lý Kho Q12', email, pass, 'WAREHOUSE_MANAGER', 'WH-001', new Date().toISOString()]);
    console.log('Created new manager account.');
  }

  await client.end();
}
run().catch(console.error);
