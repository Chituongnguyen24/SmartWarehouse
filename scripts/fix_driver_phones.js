const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'sfwms_auth'
});

const UPDATES = [
  { code: 'NV-GV06', phone: '0909888111' },
  { code: 'NV-GV07', phone: '0933445566' },
  { code: 'NV-GV09', phone: '0966332211' },
  { code: 'NV-BT01', phone: '0988112244' },
  { code: 'NV-TB01', phone: '0977223344' },
  { code: 'NV-TK01', phone: '0944778899' },
  { code: 'NV-VAN01', phone: '0918776655' }
];

async function fix() {
  await client.connect();
  for (const u of UPDATES) {
    await client.query('UPDATE users SET phone = $1 WHERE code = $2', [u.phone, u.code]);
    console.log(`Set phone ${u.phone} for ${u.code}`);
  }
  await client.end();
}

fix();

