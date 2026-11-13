const { Client } = require('pg');

async function syncDb(dbName) {
  console.log(`\n=== SYNCING ADDRESSES FOR DB: ${dbName} ===`);
  const client = new Client({
    connectionString: `postgresql://postgres:postgres@localhost:5432/${dbName}`
  });

  try {
    await client.connect();

    // 1. Tìm user Lê Công Chung
    const chungRes = await client.query(
      "SELECT id, name, email, phone FROM users WHERE email = 'lecongchung@sfwms.vn' OR phone = '0377019958' LIMIT 1"
    );

    if (chungRes.rows.length > 0) {
      const chungUser = chungRes.rows[0];
      console.log(`Found user Lê Công Chung: ID=${chungUser.id}, Email=${chungUser.email}, Phone=${chungUser.phone}`);

      // Xóa địa chỉ cũ nếu có và thêm lại địa chỉ chuẩn
      await client.query('DELETE FROM addresses WHERE user_id = $1', [chungUser.id]);
      await client.query(
        'INSERT INTO addresses (id, user_id, "streetAddress", latitude, longitude, is_default, created_at) VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, NOW())',
        [chungUser.id, '618/51/18 Quang Trung, Phường Thông Tây Hội, Thành phố Hồ Chí Minh', 10.8407, 106.6578]
      );
      console.log(`-> Added default address for Lê Công Chung in ${dbName}`);
    } else {
      console.log(`User Lê Công Chung not found in ${dbName}`);
    }

    // 2. Tìm user customer@sfwms.vn
    const custRes = await client.query(
      "SELECT id, name, email, phone FROM users WHERE email = 'customer@sfwms.vn' OR phone = '0909999999' LIMIT 1"
    );
    if (custRes.rows.length > 0) {
      const custUser = custRes.rows[0];
      await client.query('DELETE FROM addresses WHERE user_id = $1', [custUser.id]);
      await client.query(
        'INSERT INTO addresses (id, user_id, "streetAddress", latitude, longitude, is_default, created_at) VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, NOW())',
        [custUser.id, '456 Lê Văn Thọ, Phường 11, Quận Gò Vấp, TP.HCM', 10.8465, 106.6622]
      );
      console.log(`-> Added default address for customer@sfwms.vn in ${dbName}`);
    }

    // 3. Tìm user admin@sfwms.vn
    const adminRes = await client.query(
      "SELECT id, name, email, phone FROM users WHERE email = 'admin@sfwms.vn' LIMIT 1"
    );
    if (adminRes.rows.length > 0) {
      const adminUser = adminRes.rows[0];
      await client.query('DELETE FROM addresses WHERE user_id = $1', [adminUser.id]);
      await client.query(
        'INSERT INTO addresses (id, user_id, "streetAddress", latitude, longitude, is_default, created_at) VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, NOW())',
        [adminUser.id, '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 10.7769, 106.7009]
      );
      console.log(`-> Added default address for admin@sfwms.vn in ${dbName}`);
    }

    await client.end();
  } catch (err) {
    console.error(`Error in ${dbName}:`, err.message);
  }
}

async function main() {
  await syncDb('postgres');
  await syncDb('sfwms_auth');
  console.log('\nDone synchronizing all databases!');
}

main();

