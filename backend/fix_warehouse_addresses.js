const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_warehouse'
  });
  await client.connect();

  const res = await client.query('SELECT id, address FROM warehouses');
  
  for (const row of res.rows) {
    let newAddress = row.address;
    
    // Fix remaining districts to be Ward + Province (Thành phố Hồ Chí Minh)
    newAddress = newAddress.replace(', Bình Tân, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    newAddress = newAddress.replace('An Lạc,', 'Phường An Lạc,');
    
    newAddress = newAddress.replace(', Hóc Môn, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    newAddress = newAddress.replace('Bà Điểm,', 'Xã Bà Điểm,');
    
    newAddress = newAddress.replace(', Nhà Bè, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    newAddress = newAddress.replace('Phú Xuân,', 'Xã Phú Xuân,');
    
    newAddress = newAddress.replace(', Phú Nhuận, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    newAddress = newAddress.replace(', Quận 8, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    
    newAddress = newAddress.replace(', Củ Chi, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    newAddress = newAddress.replace('Tân Thông Hội,', 'Xã Tân Thông Hội,');
    
    newAddress = newAddress.replace(', Quận 10, TP. Hồ Chí Minh', ', Thành phố Hồ Chí Minh');
    
    if (newAddress !== row.address) {
      await client.query('UPDATE warehouses SET address = $1 WHERE id = $2', [newAddress, row.id]);
    }
  }

  console.log('Fixed warehouse addresses in DB.');
  await client.end();
}

run().catch(console.error);
