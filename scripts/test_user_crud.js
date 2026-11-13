const assert = require('assert');

const BASE_URL = 'http://localhost:3012';

async function main() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN FULL CRUD USER-SERVICE');
  console.log('====================================================\n');

  // STEP 1: AUTHENTICATION
  console.log('👉 [1/6] ĐĂNG NHẬP ADMIN ĐỂ LẤY JWT TOKEN...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sfwms.vn', password: 'password123' })
  });
  assert.ok(loginRes.status === 200 || loginRes.status === 201, `Đăng nhập thất bại (HTTP ${loginRes.status})`);
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  assert.ok(token, 'Không lấy được access_token!');
  console.log('   ✅ Đăng nhập Admin thành công:', loginData.user.name, `(Role: ${loginData.user.role})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // STEP 2: CREATE (POST /users)
  console.log('\n👉 [2/6] TEST CREATE: TẠO MỚI NHÂN VIÊN VÀ KHÁCH HÀNG...');
  const testStaffEmail = `staff.test.${Date.now()}@sfwms.vn`;
  const createStaffRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Nguyễn Văn Test Nhân Viên',
      email: testStaffEmail,
      phone: '0912345678',
      role: 'WAREHOUSE_STAFF',
      warehouseCode: 'WH-006',
      assignedZone: 'Khu Khô C & Soạn Hàng',
      shift: 'CA_SANG',
      department: 'Bộ Phận Vận Hành & Soạn Hàng Kho',
      passwordHash: 'password123'
    })
  });
  assert.strictEqual(createStaffRes.status, 201, `Tạo nhân viên thất bại: HTTP ${createStaffRes.status}`);
  const createdStaff = await createStaffRes.json();
  assert.ok(createdStaff.id, 'Thiếu ID nhân viên!');
  assert.strictEqual(createdStaff.name, 'Nguyễn Văn Test Nhân Viên');
  assert.strictEqual(createdStaff.role, 'WAREHOUSE_STAFF');
  console.log('   ✅ Đã tạo thành công nhân viên kho:', createdStaff.code, createdStaff.name, `(ID: ${createdStaff.id})`);

  // Test Customer with ONLY Phone (No Email)
  console.log('   Testing: Khách hàng mua lẻ chỉ có SĐT (không có email)...');
  const testPhoneOnly = `099${Math.floor(1000000 + Math.random() * 9000000)}`;
  const createCustomerRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Khách Hàng Mua Lẻ Không Email',
      phone: testPhoneOnly,
      role: 'CUSTOMER',
      warehouseCode: 'TOAN_HE_THONG',
      department: 'Khách Hàng Mua Lẻ (E-Commerce Web)'
    })
  });
  assert.strictEqual(createCustomerRes.status, 201, `Tạo khách hàng chỉ có SĐT thất bại: HTTP ${createCustomerRes.status}`);
  const createdCustomer = await createCustomerRes.json();
  assert.strictEqual(createdCustomer.email, null, 'Email của khách hàng mua lẻ phải là null!');
  assert.strictEqual(createdCustomer.phone, testPhoneOnly);
  console.log('   ✅ Tạo khách lẻ thành công:', createdCustomer.code, createdCustomer.name, `(SĐT: ${createdCustomer.phone}, Email: ${createdCustomer.email})`);

  // STEP 3: READ (GET /users & Filters)
  console.log('\n👉 [3/6] TEST READ: LẤY DANH SÁCH & BỘ LỌC ĐA CHIỀU...');
  // Read all
  const readAllRes = await fetch(`${BASE_URL}/users`, { headers: authHeaders });
  assert.strictEqual(readAllRes.status, 200);
  const allUsers = await readAllRes.json();
  console.log(`   ✅ Tổng người dùng trong hệ thống: ${allUsers.length}`);

  // Filter by role WAREHOUSE_STAFF
  const filterStaffRes = await fetch(`${BASE_URL}/users?role=WAREHOUSE_STAFF`, { headers: authHeaders });
  const staffList = await filterStaffRes.json();
  assert.ok(staffList.every(u => u.role === 'WAREHOUSE_STAFF'), 'Lọc theo role không chuẩn!');
  console.log(`   ✅ Lọc Role WAREHOUSE_STAFF: ${staffList.length} nhân sự`);

  // Filter by search
  const searchRes = await fetch(`${BASE_URL}/users?search=${encodeURIComponent('Test Nhân Viên')}`, { headers: authHeaders });
  const searchResults = await searchRes.json();
  assert.ok(searchResults.length >= 1, 'Không tìm thấy nhân viên vừa tạo!');
  console.log(`   ✅ Tìm kiếm theo tên "Test Nhân Viên": Tìm thấy ${searchResults.length} kết quả`);

  // Read single by ID
  const singleRes = await fetch(`${BASE_URL}/users/${createdStaff.id}`, { headers: authHeaders });
  assert.strictEqual(singleRes.status, 200);
  const singleStaff = await singleRes.json();
  assert.strictEqual(singleStaff.id, createdStaff.id);
  console.log(`   ✅ Đọc chi tiết ID ${singleStaff.id}: ${singleStaff.name} (Kho: ${singleStaff.warehouseCode})`);

  // STEP 4: UPDATE (PUT /users/:id)
  console.log('\n👉 [4/6] TEST UPDATE: CẬP NHẬT HỒ SƠ & THÔNG TIN DOANH NGHIỆP...');
  const updateRes = await fetch(`${BASE_URL}/users/${createdStaff.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Nguyễn Văn Test (Đã Cập Nhật Ca)',
      phone: '0988776655',
      shift: 'CA_DEM',
      assignedZone: 'Khu Đông Lạnh B (-18°C ~ 0°C)',
      status: 'ON_LEAVE'
    })
  });
  assert.strictEqual(updateRes.status, 200, `Update thất bại: HTTP ${updateRes.status}`);
  const updatedStaff = await updateRes.json();
  assert.strictEqual(updatedStaff.name, 'Nguyễn Văn Test (Đã Cập Nhật Ca)');
  assert.strictEqual(updatedStaff.shift, 'CA_DEM');
  assert.strictEqual(updatedStaff.status, 'ON_LEAVE');
  assert.strictEqual(updatedStaff.phone, '0988776655');
  console.log('   ✅ Đã cập nhật thông tin thành công:', updatedStaff.name, `(Ca: ${updatedStaff.shift}, Trạng thái: ${updatedStaff.status})`);

  // STEP 5: TOGGLE LOCK & RESET PASSWORD
  console.log('\n👉 [5/6] TEST KHÓA/MỞ KHÓA & RESET MẬT KHẨU...');
  // Toggle Lock
  const lockRes = await fetch(`${BASE_URL}/users/${createdStaff.id}/toggle-lock`, {
    method: 'PATCH',
    headers: authHeaders
  });
  assert.strictEqual(lockRes.status, 200);
  const lockData = await lockRes.json();
  console.log('   ✅ Đã chuyển trạng thái khóa:', lockData.message, `(isLocked: ${lockData.isLocked})`);

  // Reset Password (Custom Password)
  const resetRes = await fetch(`${BASE_URL}/users/${createdStaff.id}/reset-password`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ password: 'PasswordCustom@2026' })
  });
  assert.strictEqual(resetRes.status, 200);
  const resetData = await resetRes.json();
  assert.strictEqual(resetData.newPassword, 'PasswordCustom@2026');
  console.log('   ✅ Đặt lại mật khẩu thành công:', resetData.newPassword);

  // STEP 6: DELETE (DELETE /users/:id)
  console.log('\n👉 [6/6] TEST DELETE: XÓA DỮ LIỆU THỬ NGHIỆM...');
  const deleteStaffRes = await fetch(`${BASE_URL}/users/${createdStaff.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert.strictEqual(deleteStaffRes.status, 200);
  console.log('   ✅ Đã xóa tài khoản nhân viên thử nghiệm:', createdStaff.id);

  const deleteCustRes = await fetch(`${BASE_URL}/users/${createdCustomer.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert.strictEqual(deleteCustRes.status, 200);
  console.log('   ✅ Đã xóa tài khoản khách hàng thử nghiệm:', createdCustomer.id);

  // Verify deletion
  const verifyRes = await fetch(`${BASE_URL}/users/${createdStaff.id}`, { headers: authHeaders });
  const rawText = await verifyRes.text();
  assert.ok(!rawText || rawText === 'null' || verifyRes.status === 404, 'Người dùng vẫn còn tồn tại sau khi xóa!');
  console.log('   ✅ Xác nhận tài khoản đã được dọn sạch hoàn toàn khỏi Database!');

  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ 6/6 TEST CRUD USER-SERVICE ĐỀU ĐẠT CHUẨN 100%!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
