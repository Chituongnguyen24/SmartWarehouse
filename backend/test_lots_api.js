async function test() {
  const loginRes = await fetch('http://localhost:3012/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager_q12@coop.vn', password: '123456' })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  
  const lotsRes = await fetch('http://localhost:3011/inventory/lots', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const lots = await lotsRes.json();
  console.log(lots.slice(0, 2));
}
test();
