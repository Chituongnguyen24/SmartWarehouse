const { Client } = require('pg');
(async () => {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' });
  await client.connect();
  const sql = `
    INSERT INTO "users" (id, email, password_hash, name, role, warehouse_code) 
    VALUES 
      ('550e8400-e29b-41d4-a716-446655440001', 'whm1@sfwms.vn', '$2b$10$6d9dVOIe.FsyCdb5bWMNM.wrwVzGgKDWI.MH7U9Y15xNXXDW8LO0W', 'Quản lý Kho 001', 'WAREHOUSE_MANAGER', 'WH-001'),
      ('550e8400-e29b-41d4-a716-446655440005', 'whm5@sfwms.vn', '$2b$10$6d9dVOIe.FsyCdb5bWMNM.wrwVzGgKDWI.MH7U9Y15xNXXDW8LO0W', 'Quản lý Kho 005', 'WAREHOUSE_MANAGER', 'WH-005')
    ON CONFLICT (email) DO UPDATE SET warehouse_code = EXCLUDED.warehouse_code, password_hash = EXCLUDED.password_hash;
  `;
  try {
    await client.query(sql);
    console.log('Inserted whm1 and whm5 into postgres DB');
  } catch (err) { console.error(err) }
  await client.end();
})();
