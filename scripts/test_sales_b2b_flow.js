const assert = require('assert');

async function testSalesB2BFlow() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ LIÊN THÔNG QUY TRÌNH B2B SALES & FEFO & AUDIT');
  console.log('================================================================');

  // STEP 1: AUTHENTICATE AS ADMIN / SALES
  console.log('\n👉 [1/5] ĐĂNG NHẬP VÀ XÁC THỰC QUYỀN HỆ THỐNG...');
  const loginRes = await fetch('http://localhost:3012/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sfwms.vn', password: 'password123' })
  });
  assert(loginRes.ok, `Đăng nhập thất bại (HTTP ${loginRes.status})`);
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  assert(token, 'Phải nhận được JWT access_token');
  console.log(`   ✅ Đăng nhập thành công: ${loginData.user.name} (Role: ${loginData.user.role})`);

  // STEP 2: FETCH REAL PRODUCTS FROM PRODUCT SERVICE (:3010)
  console.log('\n👉 [2/5] KIỂM TRA DANH MỤC SẢN PHẨM KHẢ DỤNG TỪ PRODUCT SERVICE (:3010)...');
  const prodRes = await fetch('http://localhost:3010/products?limit=100');
  assert(prodRes.ok, `GET /products thất bại (HTTP ${prodRes.status})`);
  const prodData = await prodRes.json();
  const products = Array.isArray(prodData) ? prodData : (prodData.items || prodData.data || []);
  assert(products.length > 0, 'Phải có sản phẩm trong cơ sở dữ liệu');
  console.log(`   ✅ Đã tải ${products.length} sản phẩm thực tế từ Database. Mẫu: "${products[0].name}" (SKU: ${products[0].sku})`);

  // STEP 3: FETCH REAL B2B PARTNERS FROM USER SERVICE (:3012)
  console.log('\n👉 [3/5] KIỂM TRA DANH SÁCH ĐỐI TÁC DOANH NGHIỆP B2B (:3012)...');
  const custRes = await fetch('http://localhost:3012/users/b2b-customers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(custRes.ok, `GET /users/b2b-customers thất bại (HTTP ${custRes.status})`);
  const customers = await custRes.json();
  assert(Array.isArray(customers) && customers.length > 0, 'Phải có danh sách đối tác B2B trong DB');
  console.log(`   ✅ Đã tải ${customers.length} hồ sơ đối tác B2B. Đối tác mẫu: "${customers[0].name}" (Mã: ${customers[0].code}, Chiết khấu: ${customers[0].discountRate}%)`);

  // STEP 4: FETCH FEFO EXPIRY ALERT LOTS FROM INVENTORY SERVICE (:3011)
  console.log('\n👉 [4/5] KIỂM TRA CẢNH BÁO FEFO & HÀNG CẬN HẠN TỪ INVENTORY SERVICE (:3011)...');
  const fefoRes = await fetch('http://localhost:3011/inventory/expiry-alert?days=45');
  assert(fefoRes.ok, `GET /inventory/expiry-alert thất bại (HTTP ${fefoRes.status})`);
  const fefoLots = await fefoRes.json();
  assert(Array.isArray(fefoLots) && fefoLots.length > 0, 'Phải có lô hàng cần theo dõi hạn dùng');
  console.log(`   ✅ Đã tải ${fefoLots.length} lô hàng cận hạn cần xả/đẩy bán. Lô mẫu: "${fefoLots[0].lotCode}" (HSD: ${new Date(fefoLots[0].expiryDate).toLocaleDateString('vi-VN')})`);

  // STEP 5: SIMULATE CREATING B2B ORDER & CROSS-LOGGING AUDIT LOG
  console.log('\n👉 [5/5] TẠO ĐƠN HÀNG XUẤT KHO B2B VÀ LIÊN THÔNG AUDIT LOG...');
  const testOrderCode = `SO-B2B-TEST-${Date.now().toString().slice(-6)}`;
  const targetCust = customers[0];
  const targetProd = products[0];

  const orderPayload = {
    orderCode: testOrderCode,
    type: 'NORMAL',
    warehouseCode: 'WH-006',
    requesterName: targetCust.companyName || targetCust.name,
    customerPhone: targetCust.phone,
    destination: targetCust.billingAddress || '350 Lê Đức Thọ, Gò Vấp, TP.HCM',
    notes: '[B2B - Công Nợ 30 Ngày] Giao xe tải đông lạnh trước 10h',
    totalAmount: 250000,
    items: [
      {
        productId: targetProd.id,
        sku: targetProd.sku,
        productName: targetProd.name,
        requestedQuantity: 10,
        unitPrice: 25000,
        unit: targetProd.unit || 'Gói',
      }
    ]
  };

  const createOrderRes = await fetch('http://localhost:3007/outbound-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  assert(createOrderRes.ok, `POST /outbound-orders thất bại (HTTP ${createOrderRes.status})`);
  const createdOrder = await createOrderRes.json();
  console.log(`   ✅ Tạo thành công đơn hàng xuất kho B2B: ${createdOrder.orderCode || testOrderCode}`);

  // Log audit event to :3012
  const auditRes = await fetch('http://localhost:3012/audit-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'Tạo đơn hàng xuất kho B2B',
      actionCode: 'B2B_SALES_ORDER_CREATED',
      actorName: loginData.user.name,
      actorEmail: loginData.user.email,
      actorRole: loginData.user.role,
      serviceName: 'order-service',
      clientApp: 'WEB_DASHBOARD',
      severity: 'INFO',
      target: 'outbound_orders',
      targetId: testOrderCode,
      details: `Lập đơn hàng B2B #${testOrderCode} cho đối tác ${targetCust.name}, xuất từ kho WH-006`,
      payloadAfter: {
        orderCode: testOrderCode,
        customerName: targetCust.name,
        warehouseCode: 'WH-006',
        finalAmount: 250000,
        itemsCount: 1,
      }
    })
  });
  assert(auditRes.ok, `POST /audit-logs thất bại (HTTP ${auditRes.status})`);
  const auditData = await auditRes.json();
  console.log(`   ✅ Ghi nhận thành công Nhật Ký Kiểm Toán (Audit Log ID: ${auditData.id}, Action: ${auditData.actionCode})`);

  console.log('\n================================================================');
  console.log('🎉 TOÀN BỘ 5 BƯỚC KIỂM THỬ B2B SALES & FEFO & AUDIT ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log('================================================================');
}

testSalesB2BFlow().catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});

