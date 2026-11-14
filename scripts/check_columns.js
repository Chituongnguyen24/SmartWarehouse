const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

async function main() {
  await client.connect();
  await client.query(`
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  `);
  console.log('Altered users table successfully: email and password_hash are now nullable.');

  const res = await client.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name IN ('email', 'phone', 'code', 'password_hash')
  `);
  console.table(res.rows);
  await client.end();
}
main().catch(console.error);
