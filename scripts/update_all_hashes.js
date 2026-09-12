const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await c.connect();
  const hash = bcrypt.hashSync('password123', 10);
  await c.query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Successfully updated all users in sfwms_auth with valid hash:', hash);

  const testUser = await c.query("SELECT email, role, name, password_hash FROM users WHERE email = 'truck@sfwms.vn'");
  console.log('Sample user:', testUser.rows[0]);
  console.log('Compare test:', bcrypt.compareSync('password123', testUser.rows[0].password_hash));

  await c.end();
}

main().catch(console.error);
