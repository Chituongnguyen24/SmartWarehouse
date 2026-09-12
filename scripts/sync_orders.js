async function run() {
  const syncRes = await fetch('http://localhost:3007/outbound-orders/sync-lot-locations', { method: 'POST' });
  const syncData = await syncRes.json();
  console.log('SYNC RESULT:', syncData);

  const ordRes = await fetch('http://localhost:3007/outbound-orders');
  const orders = await ordRes.json();
  const ob34 = orders.find(o => o.orderCode === 'OB-20260904-034');
  console.log('OB-20260904-034:', JSON.stringify(ob34, null, 2));
}
run().catch(console.error);
