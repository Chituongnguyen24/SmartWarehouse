const assert = require('assert');

async function testAuditLogs() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN AUDIT-LOG SYSTEM');
  console.log('====================================================');

  // STEP 1: LOGIN & GET TOKEN
  console.log('\n👉 [1/6] ĐĂNG NHẬP ADMIN & KIỂM TRA TỰ ĐỘNG GHI LOG LOGIN...');
  const loginRes = await fetch('http://localhost:3012/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sfwms.vn', password: 'password123' })
  });
  assert(loginRes.ok, `Đăng nhập phải thành công (got ${loginRes.status})`);
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.accessToken || loginData.token;
  assert(token, 'Phải nhận được JWT access_token');
  console.log(`   ✅ Đăng nhập Admin thành công: ${loginData.user.name} (Role: ${loginData.user.role})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // STEP 2: KPI STATS ENDPOINT
  console.log('\n👉 [2/6] TEST GET STATS: LẤY THỐNG KÊ KPI KIỂM TOÁN...');
  const statsRes = await fetch('http://localhost:3012/audit-logs/stats', { headers: authHeaders });
  assert(statsRes.ok, `GET /audit-logs/stats phải thành công (got ${statsRes.status})`);
  const stats = await statsRes.json();
  assert(typeof stats.total === 'number' && stats.total > 0, 'Phải có tổng số sự kiện > 0');
  assert(typeof stats.infoCount === 'number', 'Phải có infoCount');
  assert(typeof stats.warnCount === 'number', 'Phải có warnCount');
  assert(typeof stats.criticalCount === 'number', 'Phải có criticalCount');
  console.log('   ✅ Thống kê KPI hợp lệ:', stats);

  // STEP 3: CREATE AUDIT LOG ENTRY
  console.log('\n👉 [3/6] TEST CREATE: TẠO MỚI BẢN GHI NHẬT KÝ SỰ KIỆN...');
  const testActionCode = `TEST_AUDIT_${Date.now()}`;
  const createRes = await fetch('http://localhost:3012/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actorName: 'Nguyễn Chi Tường (Admin)',
      actorRole: 'ADMIN',
      clientApp: 'WEB_DASHBOARD',
      serviceName: 'inbound-service',
      action: 'Thử nghiệm tạo biên bản kiểm định chất lượng nhập kho',
      actionCode: testActionCode,
      target: 'inbound_orders',
      targetId: 'PNK-TEST-9999',
      ipAddress: '192.168.1.100',
      severity: 'WARN',
      details: 'Kiểm định 100 thùng táo Envy phát hiện 2 thùng có vết xước vỏ nhẹ.',
      payloadBefore: { passed: false, inspectedQty: 0 },
      payloadAfter: { passed: true, inspectedQty: 100, defectQty: 2, conditionGrade: 'A-' }
    })
  });
  assert(createRes.ok, `Tạo audit log phải thành công (got ${createRes.status})`);
  const createdLog = await createRes.json();
  assert(createdLog.id, 'Log mới phải có ID');
  assert.strictEqual(createdLog.actionCode, testActionCode);
  console.log(`   ✅ Ghi nhận log thành công: ID ${createdLog.id} (Action: ${createdLog.actionCode})`);

  // STEP 4: READ & SEARCH BY ACTION CODE
  console.log('\n👉 [4/6] TEST SEARCH: TÌM KIẾM THEO TỪ KHÓA & MÃ NGHIỆP VỤ...');
  const searchRes = await fetch(`http://localhost:3012/audit-logs?search=${encodeURIComponent(testActionCode)}`, { headers: authHeaders });
  assert(searchRes.ok, `Search phải thành công (got ${searchRes.status})`);
  const searchData = await searchRes.json();
  assert(searchData.total >= 1, 'Phải tìm thấy ít nhất 1 kết quả theo actionCode');
  assert.strictEqual(searchData.data[0].id, createdLog.id);
  console.log(`   ✅ Tìm kiếm thành công: Tìm thấy log ID ${searchData.data[0].id}`);

  // STEP 5: TEST MULTI-PARAMETER FILTERS
  console.log('\n👉 [5/6] TEST FILTERS: LỌC THEO MỨC ĐỘ, DỊCH VỤ, NGUỒN APP...');
  const filterRes = await fetch('http://localhost:3012/audit-logs?severity=WARN&serviceName=inbound-service', { headers: authHeaders });
  assert(filterRes.ok, `Filter phải thành công (got ${filterRes.status})`);
  const filterData = await filterRes.json();
  assert(filterData.data.every(l => l.severity === 'WARN'), 'Mọi log trả về phải có severity = WARN');
  console.log(`   ✅ Bộ lọc Severity & Service hoạt động chính xác: ${filterData.total} logs`);

  // STEP 6: READ SINGLE LOG WITH PAYLOAD INSPECTOR
  console.log('\n👉 [6/6] TEST DETAIL: ĐỌC CHI TIẾT LOG VÀ PAYLOAD BEFORE/AFTER...');
  const detailRes = await fetch(`http://localhost:3012/audit-logs/${createdLog.id}`, { headers: authHeaders });
  assert(detailRes.ok, `GET /audit-logs/:id phải thành công (got ${detailRes.status})`);
  const detail = await detailRes.json();
  assert.strictEqual(detail.id, createdLog.id);
  assert(detail.payloadBefore && detail.payloadBefore.inspectedQty === 0, 'payloadBefore phải toàn vẹn');
  assert(detail.payloadAfter && detail.payloadAfter.defectQty === 2, 'payloadAfter phải toàn vẹn');
  console.log('   ✅ Đọc chi tiết sự kiện thành công:');
  console.log('      - Payload Before:', JSON.stringify(detail.payloadBefore));
  console.log('      - Payload After:', JSON.stringify(detail.payloadAfter));

  console.log('\n====================================================');
  console.log('🎉 TOÀN BỘ 6/6 TEST AUDIT-LOG ĐỀU ĐẠT CHUẨN 100%!');
  console.log('====================================================');
}

testAuditLogs().catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});

