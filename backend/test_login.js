const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function run() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'sfwms_auth'});
  await c.connect();
  const res = await c.query("SELECT * FROM users WHERE email='manager_q12@coop.vn'");
  const user = res.rows[0];
  console.log('User found:', !!user);
  if (user) {
    const isMatch = await bcrypt.compare('123456', user.password_hash);
    console.log('Password match:', isMatch);
  }
  await c.end();
}
run();
