const assert = require('assert');

async function testSupplierCrud() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN FULL CRUD SUPPLIER-SERVICE');
  console.log('====================================================');

  // Step 1: Login Admin to get JWT token
  console.log('\n👉 [1/5] ĐĂNG NHẬP ADMIN ĐỂ LẤY JWT TOKEN...');
  const loginRes = await fetch('http://localhost:3012/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@sfwms.vn',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.accessToken || loginData.token;
  assert(token, 'Phải nhận được JWT token từ auth service');
  console.log('   ✅ Đăng nhập Admin thành công:', loginData.user?.name, `(Role: ${loginData.user?.role})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Step 2: Create a new supplier
  console.log('\n👉 [2/5] TEST CREATE: TẠO MỚI NHÀ CUNG CẤP THỰC PHẨM...');
  const createRes = await fetch('http://localhost:3011/inventory/suppliers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: 'SUP-999',
      name: 'Công ty Cổ phần Thủy Hải Sản Minh Phú (Cà Mau)',
      shortName: 'Minh Phú Seafood',
      contact: 'Lê Minh Chuẩn (Giám đốc Bán hàng)',
      phone: '02903838383',
      email: 'sales@minhphu.com.vn',
      taxCode: '2000392819',
      address: 'Khu công nghiệp Phường 8, TP. Cà Mau, Tỉnh Cà Mau',
      category: 'THIT_CA_TUOI',
      paymentTerms: 'Công nợ 30 ngày (Net 30)',
      rating: 4.9,
      leadTimeDays: 2,
      certifications: 'BAP 4 sao, ASC, GlobalGAP, HACCP',
      notes: 'Tôm sú và tôm thẻ chân trắng đông lạnh IQF, bảo quản kho đông sâu -20°C.',
      status: 'ACTIVE'
    })
  });
  assert.strictEqual(createRes.status, 201, `Create supplier phải trả về 201 Created (got ${createRes.status})`);
  const createdSupplier = await createRes.json();
  assert.strictEqual(createdSupplier.code, 'SUP-999');
  assert.strictEqual(createdSupplier.shortName, 'Minh Phú Seafood');
  console.log(`   ✅ Tạo NCC thành công: [${createdSupplier.code}] ${createdSupplier.shortName} (ID: ${createdSupplier.id})`);

  // Step 3: Test Read, Search & Stats
  console.log('\n👉 [3/5] TEST READ: TÌM KIẾM & XEM CHI TIẾT KÈM THỐNG KÊ LÔ KHO...');
  const searchRes = await fetch('http://localhost:3011/inventory/suppliers?search=Minh%20Ph%C3%BA');
  const searchData = await searchRes.json();
  assert(Array.isArray(searchData) && searchData.length >= 1, 'Tìm kiếm theo tên phải thấy NCC vừa tạo');
  console.log(`   ✅ Tìm kiếm "Minh Phú": Tìm thấy ${searchData.length} kết quả`);

  const detailRes = await fetch(`http://localhost:3011/inventory/suppliers/${createdSupplier.id}`);
  const detailData = await detailRes.json();
  assert.strictEqual(detailData.id, createdSupplier.id);
  assert(detailData.stats !== undefined, 'Hồ sơ chi tiết phải kèm thống kê số lô hàng');
  console.log(`   ✅ Xem chi tiết NCC thành công: ${detailData.name} - Stats: ${JSON.stringify(detailData.stats)}`);

  // Step 4: Test Update
  console.log('\n👉 [4/5] TEST UPDATE: CẬP NHẬT ĐIỀU KHOẢN & ĐÁNH GIÁ CHẤT LƯỢNG...');
  const updateRes = await fetch(`http://localhost:3011/inventory/suppliers/${createdSupplier.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      shortName: 'Minh Phú Corp',
      paymentTerms: 'Công nợ 45 ngày (Net 45)',
      rating: 5.0,
      leadTimeDays: 1,
      status: 'ACTIVE'
    })
  });
  assert(updateRes.ok, `Update supplier phải thành công (got ${updateRes.status})`);
  const updatedData = await updateRes.json();
  assert.strictEqual(updatedData.shortName, 'Minh Phú Corp');
  assert.strictEqual(Number(updatedData.rating), 5.0);
  console.log(`   ✅ Cập nhật thành công: Tên mới: ${updatedData.shortName}, Rating: ${updatedData.rating}★, Điều khoản: ${updatedData.paymentTerms}`);

  // Step 5: Test Delete
  console.log('\n👉 [5/5] TEST DELETE: XÓA NHÀ CUNG CẤP THỬ NGHIỆM...');
  const deleteRes = await fetch(`http://localhost:3011/inventory/suppliers/${createdSupplier.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert(deleteRes.ok, `Delete supplier phải thành công (got ${deleteRes.status})`);
  const deleteResult = await deleteRes.json();
  console.log(`   ✅ Kết quả xóa: ${deleteResult.message}`);

  // Verify deletion
  const verifyRes = await fetch(`http://localhost:3011/inventory/suppliers/${createdSupplier.id}`);
  assert.strictEqual(verifyRes.status, 404, 'NCC vừa xóa không thể tìm thấy nữa (phải trả về 404)');
  console.log('   ✅ Đã kiểm tra lại: NCC đã được xóa sạch hoàn toàn khỏi Database!');

  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ 5/5 TEST CRUD SUPPLIER-SERVICE ĐỀU ĐẠT CHUẨN 100%!');
  console.log('====================================================');
}

testSupplierCrud().catch(err => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
