const { Client } = require('pg');
const bcrypt = require('bcryptjs');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await client.connect();
  try {
    const hashedPwd = await bcrypt.hash('password123', 10);
    const sql = `
      INSERT INTO "users" (id, email, password_hash, name, role, warehouse_code) 
      VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', 'whm1@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 001', 'WAREHOUSE_MANAGER', 'WH-001'),
        ('550e8400-e29b-41d4-a716-446655440005', 'whm5@sfwms.vn', '${hashedPwd}', 'Quản lý Kho 005', 'WAREHOUSE_MANAGER', 'WH-005')
      ON CONFLICT (email) DO UPDATE SET warehouse_code = EXCLUDED.warehouse_code;
    `;
    await client.query(sql);
    console.log('Created user whm1@sfwms.vn with password123');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
