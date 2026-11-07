const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fix() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Fix null password_hash
    const hash = await bcrypt.hash('password123', 10);
    const resHash = await client.query(
      "UPDATE users SET password_hash = $1 WHERE password_hash IS NULL OR password_hash = ''",
      [hash]
    );
    console.log('Fixed password_hash rows:', resHash.rowCount);

    // 2. Fix null email
    const resEmail = await client.query(
      "UPDATE users SET email = CONCAT('user_', SUBSTRING(id::text, 1, 8), '@sfwms.vn') WHERE email IS NULL OR email = ''"
    );
    console.log('Fixed email rows:', resEmail.rowCount);

    // 3. Ensure staff@sfwms.vn and thuy accounts exist with password123
    const staffEmails = ['staff@sfwms.vn', 'staff.thuy@sfwms.vn', 'staff.thuy.gv@sfwms.vn', 'thuy@sfwms.vn', 'thuy.@sfwms.vn'];
    for (const em of staffEmails) {
      const check = await client.query("SELECT id FROM users WHERE email = $1", [em]);
      if (check.rows.length === 0) {
        await client.query(
          "INSERT INTO users (id, name, email, password_hash, role, warehouse_code, status) VALUES (gen_random_uuid(), 'Phạm Thị Thúy (Trực Kho)', $1, $2, 'WAREHOUSE_STAFF', 'WH-006', 'ACTIVE')",
          [em, hash]
        );
        console.log('Created user:', em);
      } else {
        await client.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, em]);
        console.log('Updated user password:', em);
      }
    }

    // 4. Verify no non-nullable columns have nulls
    const resVerify = await client.query("SELECT COUNT(*) FROM users WHERE email IS NULL OR password_hash IS NULL OR name IS NULL");
    console.log('Remaining invalid rows:', resVerify.rows[0].count);
  } catch (err) {
    console.error('Error fixing users:', err);
  } finally {
    await client.end();
  }
}

fix();
