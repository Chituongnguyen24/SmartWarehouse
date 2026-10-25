/**
 * 🏢 CITYMART SFWMS - HỆ THỐNG ĐIỀU HÀNH IOT TOÀN BỘ KHO GÒ VẤP (WH-006)
 * Giám sát & Điều phối 8 Kệ hàng thông minh (IoT Smart Shelf Fleet Controller)
 * 
 * Chạy lệnh: node simulators/wokwi-pick-to-light/govap-warehouse-fleet.js
 */

const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://broker.emqx.io:1883';
const WAREHOUSE_CODE = 'GV';
const TOPIC_COMMAND = `citymart/warehouse/GV/picking/command`;
const TOPIC_COMMAND_WH006 = `citymart/warehouse/WH-006/picking/command`;
const TOPIC_EVENT = `citymart/warehouse/GV/picking/event`;
const TOPIC_EVENT_WH006 = `citymart/warehouse/WH-006/picking/event`;

console.clear();
console.log('========================================================================================');
console.log('🏢 CITYMART SFWMS - BỘ ĐIỀU PHỐI IOT TOÀN BỘ KHO GÒ VẤP (350 QUANG TRUNG)');
console.log(`📡 Đang kết nối mạng IoT MQTT: ${BROKER_URL}...`);
console.log('========================================================================================');

// Sơ đồ thực tế toàn bộ 26 Kệ Hàng của Kho Gò Vấp (WH-006)
const GOVAP_SHELVES = [
  // 1. ZONE LẠNH (0°C đến 4°C - 8 Kệ: A1 đến A8)
  { code: 'A1', name: 'Kệ A1', zone: 'COLD (0-4°C)', category: 'Thịt tươi sống CP & Gia cầm', status: 'STANDBY', currentTask: null },
  { code: 'A2', name: 'Kệ A2', zone: 'COLD (0-4°C)', category: 'Sữa tươi Đà Lạt Milk & Bơ sữa', status: 'STANDBY', currentTask: null },
  { code: 'A3', name: 'Kệ A3', zone: 'COLD (0-4°C)', category: 'Rau củ quả sạch VietGAP Đà Lạt', status: 'STANDBY', currentTask: null },
  { code: 'A4', name: 'Kệ A4', zone: 'COLD (0-4°C)', category: 'Trái cây nhập khẩu (Táo, Kiwi)', status: 'STANDBY', currentTask: null },
  { code: 'A5', name: 'Kệ A5', zone: 'COLD (0-4°C)', category: 'Trứng gà Ba Huân & Sữa chua', status: 'STANDBY', currentTask: null },
  { code: 'A6', name: 'Kệ A6', zone: 'COLD (0-4°C)', category: 'Thủy sản mát sơ chế sẵn', status: 'STANDBY', currentTask: null },
  { code: 'A7', name: 'Kệ A7', zone: 'COLD (0-4°C)', category: 'Xúc xích Đức & Giò chả Vissan', status: 'STANDBY', currentTask: null },
  { code: 'A8', name: 'Kệ A8', zone: 'COLD (0-4°C)', category: 'Rau mầm & Nấm đùi gà tươi', status: 'STANDBY', currentTask: null },

  // 2. ZONE ĐÔNG LẠNH (-22°C đến -16°C - 8 Kệ: B1 đến B8)
  { code: 'B1', name: 'Kệ B1', zone: 'FROZEN (-18°C)', category: 'Thịt bò Úc & Heo đông lạnh', status: 'STANDBY', currentTask: null },
  { code: 'B2', name: 'Kệ B2', zone: 'FROZEN (-18°C)', category: 'Tôm sú, Cá hồi Na Uy, Mực', status: 'STANDBY', currentTask: null },
  { code: 'B3', name: 'Kệ B3', zone: 'FROZEN (-18°C)', category: 'Há cảo Cầu Tre, Viên thả lẩu', status: 'STANDBY', currentTask: null },
  { code: 'B4', name: 'Kệ B4', zone: 'FROZEN (-18°C)', category: 'Dẻ sườn bò Mỹ Black Angus', status: 'STANDBY', currentTask: null },
  { code: 'B5', name: 'Kệ B5', zone: 'FROZEN (-18°C)', category: 'Sò điệp Nhật, Cua tuyết', status: 'STANDBY', currentTask: null },
  { code: 'B6', name: 'Kệ B6', zone: 'FROZEN (-18°C)', category: 'Pizza phô mai, Khoai tây chiên', status: 'STANDBY', currentTask: null },
  { code: 'B7', name: 'Kệ B7', zone: 'FROZEN (-18°C)', category: 'Đùi gà Mỹ đông lạnh', status: 'STANDBY', currentTask: null },
  { code: 'B8', name: 'Kệ B8', zone: 'FROZEN (-18°C)', category: 'Kem Haagen-Dazs & Cornetto', status: 'STANDBY', currentTask: null },

  // 3. ZONE KHÔ (18°C đến 28°C - 10 Kệ: C1 đến C10)
  { code: 'C1', name: 'Kệ C1', zone: 'DRY (+25°C)', category: 'Gạo ST25, Gạo thơm Hạt Ngọc', status: 'STANDBY', currentTask: null },
  { code: 'C2', name: 'Kệ C2', zone: 'DRY (+25°C)', category: 'Mì Hảo Hảo, Bún phở ăn liền', status: 'STANDBY', currentTask: null },
  { code: 'C3', name: 'Kệ C3', zone: 'DRY (+25°C)', category: 'Dầu ăn Simply, Nước mắm cá cơm', status: 'STANDBY', currentTask: null },
  { code: 'C4', name: 'Kệ C4', zone: 'DRY (+25°C)', category: 'Gia vị Knorr, Tiêu sọ, Bột canh', status: 'STANDBY', currentTask: null },
  { code: 'C5', name: 'Kệ C5', zone: 'DRY (+25°C)', category: 'Cá mòi đóng hộp, Thịt heo hộp', status: 'STANDBY', currentTask: null },
  { code: 'C6', name: 'Kệ C6', zone: 'DRY (+25°C)', category: 'Sữa đặc Ông Thọ, Ngũ cốc hạt', status: 'STANDBY', currentTask: null },
  { code: 'C7', name: 'Kệ C7', zone: 'DRY (+25°C)', category: 'Cà phê G7, Trà Lipton túi lọc', status: 'STANDBY', currentTask: null },
  { code: 'C8', name: 'Kệ C8', zone: 'DRY (+25°C)', category: 'Bánh ChocoPie, Snack Oishi', status: 'STANDBY', currentTask: null },
  { code: 'C9', name: 'Kệ C9', zone: 'DRY (+25°C)', category: 'Nước ngọt Coca-Cola, Nước suối', status: 'STANDBY', currentTask: null },
  { code: 'C10', name: 'Kệ C10', zone: 'DRY (+25°C)', category: 'Đồ gia dụng, Giấy ăn & Nước lau', status: 'STANDBY', currentTask: null },
];

function printDashboard() {
  console.clear();
  console.log('===================================================================================================');
  console.log('🏢 CITYMART SFWMS - TRUNG TÂM GIÁM SÁT IOT TOÀN BỘ 8 KỆ HÀNG KHO GÒ VẤP (WH-006)');
  console.log('📍 Địa chỉ: 350 Quang Trung, P.10, Gò Vấp | Broker: broker.emqx.io:1883');
  console.log('===================================================================================================');
  console.log('| MÃ KỆ     | TÊN KỆ               | PHÂN VÙNG (ZONE) | TRẠNG THÁI IOT        | PHẦN CỨNG DEMO     |');
  console.log('|-----------|----------------------|------------------|-----------------------|--------------------|');

  GOVAP_SHELVES.forEach((s) => {
    let statusText = '⚪ STANDBY (Tắt đèn)';
    if (s.status === 'LOCATING') statusText = '🔔 ĐANG NHÁY ĐÈN + CÒI';
    if (s.status === 'CHECKED_IN') statusText = '🟢 ĐÃ ĐẾN - SÁNG ĐỨNG';
    if (s.status === 'DONE') statusText = '✅ ĐÃ LẤY XONG (Tắt)';

    const demoText = s.isHardwareDemoNode ? `⭐ ${s.hardwarePin} (Wokwi/Thật)` : `   ${s.hardwarePin} (Mô phỏng)`;

    console.log(
      `| ${s.code.padEnd(9)} | ${s.name.padEnd(20)} | ${s.zone.padEnd(16)} | ${statusText.padEnd(21)} | ${demoText.padEnd(18)} |`
    );
  });

  console.log('===================================================================================================');
  console.log('💡 HƯỚNG DẪN TƯƠNG TÁC THỜI GIAN THỰC:');
  console.log(' 1. Nhân viên mở Staff App trên Điện thoại -> Bấm "Tìm kệ" tại bất kỳ món hàng nào.');
  console.log(' 2. Kệ tương ứng trên bảng này sẽ chuyển sang [🔔 ĐANG NHÁY ĐÈN + CÒI] và phát tín hiệu!');
  console.log(' 3. Nếu là Kệ A1 (GV_CL-A) -> Đèn LED trên Wokwi/ESP32 thật sẽ chớp tắt và kêu còi thật!');
  console.log(' 4. Nhân viên ấn nút Check-in -> Trạng thái đổi thành [🟢 ĐÃ ĐẾN - SÁNG ĐỨNG].');
  console.log(' 5. Nhân viên quét mã Barcode xong -> Đèn tự động tắt!');
  console.log('===================================================================================================\n');
}

function matchShelf(shelfObj, targetShelfRaw) {
  if (!targetShelfRaw) return false;
  const raw = targetShelfRaw.toUpperCase();
  const c = shelfObj.code;
  if (raw.includes(c)) return true;
  if (c === 'GV_CL-A' && (raw.includes('A1') || raw.includes('CL-A'))) return true;
  if (c === 'GV_CL-B' && (raw.includes('A2') || raw.includes('CL-B'))) return true;
  if (c === 'GV_CL-C' && (raw.includes('A3') || raw.includes('CL-C'))) return true;
  if (c === 'GV_FR-A' && (raw.includes('B1') || raw.includes('FR-A'))) return true;
  if (c === 'GV_FR-B' && (raw.includes('B2') || raw.includes('FR-B'))) return true;
  if (c === 'GV_DR-A' && (raw.includes('C1') || raw.includes('DR-A'))) return true;
  if (c === 'GV_DR-B' && (raw.includes('C2') || raw.includes('DR-B'))) return true;
  if (c === 'GV_DR-C' && (raw.includes('C3') || raw.includes('DR-C'))) return true;
  return false;
}

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  printDashboard();
  console.log('✅ Đã kết nối MQTT Broker Cloud! Đang lắng nghe lệnh từ Điện thoại nhân viên...\n');

  // Đăng ký nhận cả 2 topic của Kho Gò Vấp: GV và WH-006
  client.subscribe([TOPIC_COMMAND, TOPIC_COMMAND_WH006, TOPIC_EVENT, TOPIC_EVENT_WH006], (err) => {
    if (err) console.error('Lỗi đăng ký topic MQTT:', err);
  });
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const isCommand = (topic === TOPIC_COMMAND || topic === TOPIC_COMMAND_WH006);
    const isEvent = (topic === TOPIC_EVENT || topic === TOPIC_EVENT_WH006);

    // 1. Nhận lệnh LOCATE từ Điện thoại nhân viên
    if (isCommand && (data.action === 'LOCATE' || data.action === 'FIND')) {
      const targetShelf = data.shelfCode || 'Kệ A1';

      GOVAP_SHELVES.forEach((s) => {
        if (matchShelf(s, targetShelf)) {
          s.status = 'LOCATING';
          s.currentTask = { product: data.productName, qty: data.qty };
        }
      });

      printDashboard();
      console.log(`🔊 [LỆNH MỚI TỪ APP ĐIỆN THOẠI]: Nhân viên đang tìm vị trí KỆ ${targetShelf}`);
      console.log(`   - Sản phẩm: ${data.productName} (SL: ${data.qty})`);
      console.log(`   >> Kệ ${targetShelf} đang kêu tít tít và nháy đèn!\n`);
    }

    // 2. Nhận sự kiện CHECK-IN từ Nút bấm trên Kệ
    if (isEvent && data.event === 'STAFF_ARRIVED') {
      const targetShelf = data.shelfCode || 'Kệ A1';

      GOVAP_SHELVES.forEach((s) => {
        if (matchShelf(s, targetShelf)) {
          s.status = 'CHECKED_IN';
        }
      });

      printDashboard();
      console.log(`🛎️  [CHECK-IN THÀNH CÔNG]: Nhân viên đã tới KỆ ${targetShelf} và ấn nút xác nhận!`);
      console.log(`   >> Còi đã tắt. Đèn LED chuyển sang sáng đứng để nhân viên lấy hàng.`);
      console.log(`   >> App trên điện thoại chuyển sang chế độ Quét Barcode.\n`);
    }

    // 3. Nhận lệnh SCAN_COMPLETED khi quét mã xong
    if (isCommand && data.action === 'SCAN_COMPLETED') {
      const targetShelf = data.shelfCode || 'Kệ A1';

      GOVAP_SHELVES.forEach((s) => {
        if (matchShelf(s, targetShelf)) {
          s.status = 'DONE';
          setTimeout(() => {
            s.status = 'STANDBY';
            printDashboard();
          }, 3000);
        }
      });

      printDashboard();
      console.log(`💡 [QUÉT MÃ XONG]: Đã quét đủ sản phẩm tại KỆ ${targetShelf}!`);
      console.log(`   >> Đèn LED của kệ ${targetShelf} TỰ ĐỘNG TẮT.`);
      console.log(`   >> Kệ chuyển về trạng thái sẵn sàng cho đơn tiếp theo.\n`);
    }

    // 4. Lệnh RESET / COMPLETE
    if (topic === TOPIC_COMMAND && (data.action === 'COMPLETE' || data.action === 'RESET')) {
      GOVAP_SHELVES.forEach((s) => {
        s.status = 'STANDBY';
        s.currentTask = null;
      });
      printDashboard();
      console.log(`🎉 [HOÀN TẤT ĐƠN]: Tất cả các kệ đã trở về trạng thái STANDBY.\n`);
    }
  } catch (e) {
    // Silent
  }
});
