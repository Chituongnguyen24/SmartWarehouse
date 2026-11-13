const { Client } = require('pg');

async function main() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'sfwms_auth' });
  await c.connect();

  const user = await c.query("SELECT id FROM users WHERE email = 'customer@sfwms.vn'");
  if (user.rows.length > 0) {
    const userId = user.rows[0].id;
    const existing = await c.query('SELECT id FROM addresses WHERE user_id = $1', [userId]);
    if (existing.rows.length === 0) {
      await c.query(`INSERT INTO addresses (id, user_id, "streetAddress", latitude, longitude, is_default, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW())`, [
          userId,
          '456 Lê Văn Thọ, Phường 11, Quận Gò Vấp, TP.HCM',
          10.8465,
          106.6622
        ]);
      console.log('Inserted customer address');
    }
  }

  const res = await c.query('SELECT a.id, u.email, u.phone, a."streetAddress", a.latitude, a.longitude FROM addresses a JOIN users u ON a.user_id = u.id');
  console.table(res.rows);
  await c.end();
}

main().catch(console.error);

