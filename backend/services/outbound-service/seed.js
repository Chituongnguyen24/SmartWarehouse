const http = require('http');

async function fetchApi(url, method, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const { URL } = require('url');
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch(e) {
          resolve(chunks);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const mockOrders = [
  {
    orderCode: `SEED-${Date.now()}-1`,
    requestedBy: 'USR-SEED',
    requesterName: 'Nguyễn Văn A',
    destination: 'Quận 1, TP HCM',
    warehouseId: '5a0dc311-18ab-40fd-a7c5-7a3d7ad7402c',
    warehouseCode: 'WH-010',
    latitude: 10.7769,
    longitude: 106.7009,
    items: [{ sku: 'MILK-DALAT-1L', productName: 'Sữa Đà Lạt', requestedQuantity: 15 }]
  },
  {
    orderCode: `SEED-${Date.now()}-2`,
    requestedBy: 'USR-SEED',
    requesterName: 'Trần Thị B',
    destination: 'Quận 3, TP HCM',
    warehouseId: '5a0dc311-18ab-40fd-a7c5-7a3d7ad7402c',
    warehouseCode: 'WH-010',
    latitude: 10.7924,
    longitude: 106.6853,
    items: [{ sku: 'BEEF-STEAK-US', productName: 'Thịt bò US', requestedQuantity: 10 }]
  },
  {
    orderCode: `SEED-${Date.now()}-3`,
    requestedBy: 'USR-SEED',
    requesterName: 'Lê C',
    destination: 'Bình Thạnh, TP HCM',
    warehouseId: '5a0dc311-18ab-40fd-a7c5-7a3d7ad7402c',
    warehouseCode: 'WH-010',
    latitude: 10.8033,
    longitude: 106.7027,
    items: [{ sku: 'MILK-DALAT-1L', productName: 'Sữa Đà Lạt', requestedQuantity: 20 }]
  },
  {
    orderCode: `SEED-${Date.now()}-4`,
    requestedBy: 'USR-SEED',
    requesterName: 'Phạm D',
    destination: 'Phú Nhuận, TP HCM',
    warehouseId: '5a0dc311-18ab-40fd-a7c5-7a3d7ad7402c',
    warehouseCode: 'WH-010',
    latitude: 10.7967,
    longitude: 106.6771,
    items: [{ sku: '277d1f08-c547-4519-b23d-8811379f8a9c', productName: 'Gạo ST25', requestedQuantity: 5 }]
  }
];

async function seed() {
  for (let i = 0; i < mockOrders.length; i++) {
    const o = mockOrders[i];
    console.log(`Creating order ${o.orderCode}...`);
    const created = await fetchApi('http://localhost:3007/outbound-orders', 'POST', o);
    const id = created.id;
    console.log(`Created ID: ${id}`);
    
    console.log(`Advancing to PACKED...`);
    await fetchApi(`http://localhost:3007/outbound-orders/${id}/confirm-picking`, 'PUT', { status: 'PACKED' });
    
    console.log(`Advancing to CONFIRMED...`);
    await fetchApi(`http://localhost:3007/outbound-orders/${id}/confirm`, 'PUT', { confirmedBy: 'SYSTEM_SEED' });
    
    console.log(`Done order ${o.orderCode}\n`);
  }
}

seed().catch(console.error);
