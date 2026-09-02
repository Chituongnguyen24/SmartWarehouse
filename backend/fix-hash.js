const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await client.connect();
  const sql = `UPDATE users SET password_hash = '$2b$10$U82kCnrOejCmwCvmVVqkmOOuSrrfgulOFEk3Db5lHdTOlL4rmyS1m' WHERE email IN ('whm1@sfwms.vn', 'whm5@sfwms.vn')`;
  await client.query(sql);
  console.log('Password reset to password123 (matching admin hash)');
  await client.end();
})();
