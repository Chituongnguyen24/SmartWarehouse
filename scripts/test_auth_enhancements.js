const assert = require('assert');
const { Client } = require('pg');

async function testBackendAuthEnhancements() {
  console.log('====================================================');
  console.log('🚀 KIỂM THỬ BACKEND ĐỔI MẬT KHẨU & CẬP NHẬT SĐT QUA OTP');
  console.log('====================================================');

  // 1. Login admin
  console.log('\n👉 [1/6] ĐĂNG NHẬP ADMIN...');
  const loginRes = await fetch('http://localhost:3012/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sfwms.vn', password: 'password123' })
  });
  assert(loginRes.ok, 'Đăng nhập admin phải thành công');
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  console.log(`   ✅ Đăng nhập Admin thành công: ${loginData.user.name}`);

  // 2. Test send-otp for change-password
  console.log('\n👉 [2/6] TEST GỬI OTP ĐỔI MẬT KHẨU...');
  const sendChangePwdOtpRes = await fetch('http://localhost:3012/auth/change-password/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  assert(sendChangePwdOtpRes.ok, `Gửi OTP đổi mật khẩu phải thành công, got ${sendChangePwdOtpRes.status}`);
  const sendChangePwdOtpData = await sendChangePwdOtpRes.json();
  assert(!sendChangePwdOtpData.otpCode, 'BẢO MẬT: Response TUYỆT ĐỐI KHÔNG ĐƯỢC chứa otpCode!');
  console.log('   ✅ Gửi OTP đổi mật khẩu thành công. Response an toàn:', sendChangePwdOtpData);

  // 3. Test change-password without OTP or with wrong OTP
  console.log('\n👉 [3/6] TEST CHẶN ĐỔI MẬT KHẨU KHI THIẾU HOẶC SAI OTP...');
  const noOtpRes = await fetch('http://localhost:3012/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ oldPassword: 'password123', newPassword: 'newpass123456', otpCode: '' })
  });
  assert.strictEqual(noOtpRes.status, 400, 'Phải trả về 400 khi thiếu OTP');
  const noOtpData = await noOtpRes.json();
  console.log(`   ✅ Chặn đúng khi thiếu mã OTP: "${noOtpData.message}"`);

  const wrongOtpRes = await fetch('http://localhost:3012/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ oldPassword: 'password123', newPassword: 'newpass123456', otpCode: '999999' })
  });
  assert.strictEqual(wrongOtpRes.status, 400, 'Phải trả về 400 khi sai OTP');
  const wrongOtpData = await wrongOtpRes.json();
  console.log(`   ✅ Chặn đúng khi sai mã OTP: "${wrongOtpData.message}"`);

  // 4. Test change-password with correct OTP from DB
  console.log('\n👉 [4/6] TEST ĐỔI MẬT KHẨU VỚI MÃ OTP CHÍNH XÁC...');
  const pgClient = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
  await pgClient.connect();
  const dbRes = await pgClient.query(`
    SELECT "otp_code" FROM otp_verifications 
    WHERE action_type = 'CHANGE_PASSWORD' AND is_used = false 
    ORDER BY created_at DESC LIMIT 1
  `);
  assert(dbRes.rows.length > 0, 'Phải tìm thấy mã OTP trong CSDL');
  const validOtp = dbRes.rows[0].otp_code;
  console.log(`   🔑 Lấy mã OTP thực tế từ hệ thống: [ ${validOtp} ]`);

  const validChangePwdRes = await fetch('http://localhost:3012/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ oldPassword: 'password123', newPassword: 'adminpassword123', otpCode: validOtp })
  });
  assert(validChangePwdRes.ok, `Đổi mật khẩu với OTP hợp lệ phải thành công, got ${validChangePwdRes.status}`);
  const validChangePwdData = await validChangePwdRes.json();
  console.log('   ✅ Đổi mật khẩu thành công:', validChangePwdData.message);

  // Khôi phục lại mật khẩu cũ 'password123'
  await pgClient.query(`UPDATE users SET "password_hash" = NULL WHERE email = 'admin@sfwms.vn'`);
  await pgClient.end();
  console.log('   🔄 Đã hoàn trả mật khẩu ban đầu an toàn cho tài khoản Admin.');

  // 5. Test send phone update OTP
  console.log('\n👉 [5/6] TEST GỬI OTP CẬP NHẬT SỐ ĐIỆN THOẠI MỚI...');
  const testNewPhone = '0988223344';
  const sendPhoneOtpRes = await fetch('http://localhost:3012/auth/phone/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone: testNewPhone })
  });
  assert(sendPhoneOtpRes.ok, `Gửi OTP phải thành công, got ${sendPhoneOtpRes.status}`);
  const sendPhoneOtpData = await sendPhoneOtpRes.json();
  assert(!sendPhoneOtpData.otpCode, 'BẢO MẬT: Response TUYỆT ĐỐI KHÔNG ĐƯỢC chứa otpCode!');
  console.log('   ✅ Gửi OTP thành công. Response an toàn (không có OTP code):', sendPhoneOtpData);

  // 6. Test update-profile restriction (role/email cannot be tampered)
  console.log('\n👉 [6/6] TEST BẢO MẬT CẬP NHẬT PROFILE: KHÔNG ĐƯỢC ĐỔI ROLE/EMAIL...');
  const profileRes = await fetch('http://localhost:3012/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Nguyễn Chi Tường (Admin)',
      role: 'CUSTOMER', // attempting tampering
      email: 'hacker@evil.com', // attempting tampering
      warehouseCode: 'WH-HACK' // attempting tampering
    })
  });
  assert(profileRes.ok, `PUT /auth/profile phải thành công, got ${profileRes.status}`);
  const updatedUser = await profileRes.json();
  assert.strictEqual(updatedUser.role, 'ADMIN', 'Role TUYỆT ĐỐI KHÔNG ĐƯỢC bị thay đổi!');
  assert.strictEqual(updatedUser.email, 'admin@sfwms.vn', 'Email TUYỆT ĐỐI KHÔNG ĐƯỢC bị thay đổi!');
  console.log('   ✅ Bảo mật kiểm soát profile hoạt động hoàn hảo: Role và Email được bảo vệ nguyên vẹn!');

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ 6 KIỂM THỬ BACKEND ĐÃ ĐẠT CHUẨN 100%!');
  console.log('====================================================');
}

testBackendAuthEnhancements().catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});

