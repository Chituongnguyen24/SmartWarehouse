/**
 * UTILITY SCRIPT: CHỈNH SỬA & ĐIỀU CHỈNH HẠN SỬ DỤNG LÔ HÀNG (LOT DATES ADJUSTER)
 * Phục vụ báo cáo khóa luận: Dễ dàng thay đổi ngày hết hạn của bất kỳ lô hàng nào
 * 
 * Cách dùng:
 * 1. Xem danh sách lô hàng và số ngày còn lại:
 *    node scripts/adjust_lot_dates.js --list
 * 
 * 2. Biến một lô hàng thành cận hạn (ví dụ còn 3 ngày) để kích hoạt FEFO:
 *    node scripts/adjust_lot_dates.js --set-near <mã_lô> [số_ngày_còn_lại=3]
 * 
 * 3. Biến một lô hàng thành hết hạn để demo xuất hủy:
 *    node scripts/adjust_lot_dates.js --set-expired <mã_lô>
 * 
 * 4. Dịch chuyển toàn bộ hạn dùng của tất cả lô hàng thêm N ngày (khi qua ngày mới):
 *    node scripts/adjust_lot_dates.js --shift 30
 */

const { Client } = require('pg');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'sfwms_inventory'
};

async function main() {
  const args = process.argv.slice(2);
  const client = new Client(DB_CONFIG);
  await client.connect();

  const now = new Date();

  if (args.includes('--list') || args.length === 0) {
    const res = await client.query(`
      SELECT lot_code, warehouse_code, zone, location, expiry_date, status, risk_score, remaining_qty
      FROM lots
      ORDER BY expiry_date ASC
      LIMIT 30;
    `);

    console.log('\n========================================================================================');
    console.log('📋 DANH SÁCH LÔ HÀNG GẦN HẾT HẠN NHẤT TRONG HỆ THỐNG');
    console.log('========================================================================================');
    console.log('MÃ LÔ'.padEnd(42), 'KHO'.padEnd(10), 'VỊ TRÍ'.padEnd(24), 'HẠN DÙNG'.padEnd(14), 'CÒN (NGÀY)'.padEnd(14), 'TRẠNG THÁI');
    console.log(''.padEnd(115, '-'));

    res.rows.forEach(r => {
      const exp = new Date(r.expiry_date);
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expStr = exp.toLocaleDateString('vi-VN');
      const statusStr = daysLeft <= 0 ? '❌ HẾT HẠN (EXP)' : daysLeft <= 7 ? '⚠️ CẬN DATE (FEFO)' : daysLeft <= 45 ? '⚡ CẬN DATE (T12)' : '✅ BÌNH THƯỜNG';
      console.log(
        r.lot_code.padEnd(42),
        r.warehouse_code.padEnd(10),
        r.location.padEnd(24),
        expStr.padEnd(14),
        String(daysLeft).padEnd(14),
        statusStr
      );
    });
    console.log('========================================================================================\n');
  } else if (args.includes('--set-near')) {
    const targetIdx = args.indexOf('--set-near');
    const lotCode = args[targetIdx + 1];
    const days = parseInt(args[targetIdx + 2] || '3', 10);

    if (!lotCode) {
      console.error('❌ Lỗi: Cần truyền mã lô! Ví dụ: node scripts/adjust_lot_dates.js --set-near LOT-EM-17767-WH006-20261110-L1 3');
      process.exit(1);
    }

    const newExp = new Date(Date.now() + days * 86400000);
    const updateRes = await client.query(`
      UPDATE lots 
      SET expiry_date = $1, status = 'AT_RISK', risk_score = 85
      WHERE lot_code = $2
      RETURNING lot_code, expiry_date, status;
    `, [newExp.toISOString(), lotCode]);

    if (updateRes.rowCount > 0) {
      console.log(`✅ Đã cập nhật lô ${lotCode} thành CẬN HẠN: Còn ${days} ngày (Hạn: ${newExp.toLocaleDateString('vi-VN')})!`);
    } else {
      console.error(`❌ Không tìm thấy lô có mã: ${lotCode}`);
    }
  } else if (args.includes('--set-expired')) {
    const targetIdx = args.indexOf('--set-expired');
    const lotCode = args[targetIdx + 1];

    if (!lotCode) {
      console.error('❌ Lỗi: Cần truyền mã lô! Ví dụ: node scripts/adjust_lot_dates.js --set-expired LOT-EM-17767-WH006-20261110-L1');
      process.exit(1);
    }

    const newExp = new Date(Date.now() - 3 * 86400000); // Đã hết hạn 3 ngày trước
    const updateRes = await client.query(`
      UPDATE lots 
      SET expiry_date = $1, status = 'EXPIRED', risk_score = 95
      WHERE lot_code = $2
      RETURNING lot_code, expiry_date, status;
    `, [newExp.toISOString(), lotCode]);

    if (updateRes.rowCount > 0) {
      console.log(`✅ Đã cập nhật lô ${lotCode} thành HẾT HẠN: Quá hạn 3 ngày (Hạn: ${newExp.toLocaleDateString('vi-VN')})!`);
    } else {
      console.error(`❌ Không tìm thấy lô có mã: ${lotCode}`);
    }
  } else if (args.includes('--shift')) {
    const targetIdx = args.indexOf('--shift');
    const shiftDays = parseInt(args[targetIdx + 1] || '0', 10);

    if (shiftDays === 0) {
      console.error('❌ Cần chỉ định số ngày dịch chuyển (VD: --shift 15 hoặc --shift -10)');
      process.exit(1);
    }

    console.log(`⏳ Đang dịch chuyển toàn bộ hạn sử dụng ${shiftDays > 0 ? '+' : ''}${shiftDays} ngày...`);
    await client.query(`
      UPDATE lots
      SET expiry_date = expiry_date + ($1 || ' days')::INTERVAL;
    `, [shiftDays]);

    console.log(`✅ Toàn bộ lô hàng đã được dịch chuyển thành công ${shiftDays} ngày!`);
  }

  await client.end();
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
