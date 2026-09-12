const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function fix() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_auth'
  });

  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  console.log('Columns in users table:', cols.rows.map(c => c.column_name));

  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash for password123:', hash);

  await client.query(`UPDATE users SET password_hash = $1`, [hash]);
  console.log('Successfully updated password_hash for all users!');

  const users = await client.query(`SELECT id, email, name, role, warehouse_code FROM users ORDER BY email ASC`);
  console.log('Users in DB:');
  console.table(users.rows);

  await client.end();
}

fix().catch(console.error);
