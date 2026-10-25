/**
 * Kịch bản Test Chu trình Tìm Kệ Thông Minh (Smart Shelf Finding & Auto-Off)
 * Chạy lệnh: node simulators/wokwi-pick-to-light/test-ptl-mqtt.js
 */
const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://broker.emqx.io:1883';
const TOPIC_COMMAND = 'citymart/warehouse/WH-006/picking/command';
const TOPIC_COMMAND_GV = 'citymart/warehouse/GV/picking/command';
const TOPIC_EVENT = 'citymart/warehouse/WH-006/picking/event';
const TOPIC_EVENT_GV = 'citymart/warehouse/GV/picking/event';

console.log('======================================================================');
console.log('🛒 CITYMART - KHO GÒ VẤP (WH-006): SMART SHELF LOCATOR & PICKING IoT');
console.log(`📡 Đang kết nối tới MQTT Broker Cloud: ${BROKER_URL}...`);
console.log('======================================================================');

const client = mqtt.connect(BROKER_URL);

const pickingItems = [
  {
    step: 1,
    shelfCode: 'Kệ A1',
    zone: 'Zone Mát (0°C ~ 4°C)',
    productName: 'Thịt heo xay CP 400g',
    qty: 2,
    barcode: '893601234001',
  },
  {
    step: 2,
    shelfCode: 'Kệ A2',
    zone: 'Zone Mát (0°C ~ 4°C)',
    productName: 'Sữa Tươi Đà Lạt Milk 1L',
    qty: 3,
    barcode: '893601234002',
  },
  {
    step: 3,
    shelfCode: 'Kệ A3',
    zone: 'Zone Mát (0°C ~ 4°C)',
    productName: 'Bắp cải thảo VietGAP',
    qty: 1,
    barcode: '893601234003',
  },
];

let currentIndex = 0;

function sendLocateCommand() {
  if (currentIndex >= pickingItems.length) {
    console.log('\n🎉 ==========================================================');
    console.log('🏆 HOÀN TẤT ĐƠN HÀNG! TẤT CẢ SẢN PHẨM ĐÃ ĐƯỢC NHẶT XONG!');
    console.log('==========================================================');

    client.publish(
      TOPIC_COMMAND,
      JSON.stringify({
        action: 'COMPLETE',
      })
    );

    console.log('Nhấn Ctrl + C để kết thúc kịch bản.');
    return;
  }

  const item = pickingItems[currentIndex];
  console.log(`\n======================================================================`);
  console.log(`📍 [MÓN ${item.step}/${pickingItems.length}] Nhân viên ấn "TÌM VỊ TRÍ" trên App cho:`);
  console.log(`   👉 Tên SP:      ${item.productName}`);
  console.log(`   👉 Vị trí kệ:   KỆ ${item.shelfCode}`);
  console.log(`   👉 Số lượng:    ${item.qty} món`);
  console.log(`----------------------------------------------------------------------`);
  console.log(`🔊 [IoT ACTION] Kệ ${item.shelfCode} trên Wokwi đang KÊU CÒI TÍT TÍT & NHÁY ĐÈN liên tục!`);
  console.log(`👉 Hãy dùng chuột click vào [NUT TOI NOI (CHECK-IN)] trên Wokwi...`);

  // Gửi lệnh tìm vị trí kệ
  const locateMsg = JSON.stringify({
    action: 'LOCATE',
    warehouseCode: 'WH-006',
    shelfCode: item.shelfCode,
    productName: item.productName,
    qty: item.qty,
    step: item.step,
    totalSteps: pickingItems.length,
  });

  client.publish(TOPIC_COMMAND, locateMsg);
  client.publish(TOPIC_COMMAND_GV, locateMsg);
}

client.on('connect', () => {
  console.log('✅ Đã kết nối MQTT Broker Cloud thành công!');
  console.log(`📥 Lắng nghe sự kiện check-in từ Wokwi tại: "${TOPIC_EVENT}" và "${TOPIC_EVENT_GV}"`);
  console.log(`🌡️ Lắng nghe dữ liệu Môi Trường (Nhiệt độ & Độ ẩm) tại: "citymart/warehouse/GV/environment/telemetry"\n`);

  client.subscribe([TOPIC_EVENT, TOPIC_EVENT_GV, 'citymart/warehouse/GV/environment/telemetry'], (err) => {
    if (err) {
      console.error('Lỗi subscribe:', err);
      return;
    }
    // Bắt đầu tìm món đầu tiên
    sendLocateCommand();
  });
});

client.on('message', (topic, message) => {
  if (topic === 'citymart/warehouse/GV/environment/telemetry') {
    try {
      const data = JSON.parse(message.toString());
      console.log(`🌡️ [KHO LẠNH TELEMETRY] Nhiệt độ: ${data.temperature}°C | Độ ẩm: ${data.humidity}% | Trạng thái: [${data.status}]`);
      if (data.productStandards) {
        console.log(`   🥩 Thịt CP: ${data.productStandards.A1_Meat_CP} | 🥛 Sữa Đà Lạt: ${data.productStandards.A2_Milk_DaLat} | 🥦 Rau VietGAP: ${data.productStandards.A3_Veggie_VietGAP}`);
      }
    } catch (e) {}
    return;
  }

  if (topic === TOPIC_EVENT || topic === TOPIC_EVENT_GV) {
    try {
      const event = JSON.parse(message.toString());

      if (event.event === 'STAFF_ARRIVED') {
        const item = pickingItems[currentIndex];
        console.log(`\n🛎️  [CHECK-IN THÀNH CÔNG]`);
        console.log(`   Nhân viên đã đến đúng Kệ ${event.shelfCode} và ấn nút xác nhận!`);
        console.log(`   >> Còi chip tự động tắt tiếng.`);
        console.log(`   >> Đèn LED chuyển sang SÁNG ĐỨNG để nhân viên soạn hàng.`);
        console.log(`\n📦 [BẮT ĐẦU QUÉT MÃ SẢN PHẨM]`);

        // Mô phỏng nhân viên quét barcode các sản phẩm
        for (let q = 1; q <= item.qty; q++) {
          console.log(`   [Scanner] Đã quét Barcode (${q}/${item.qty}): ${item.barcode} - Khớp 100%!`);
        }

        console.log(`\n✅ Quét xong ${item.qty} sản phẩm! Gửi tín hiệu hoàn tất...`);

        // Sau 1.5 giây, báo server quét xong -> đèn kệ tự động tắt
        setTimeout(() => {
          console.log(`💡 [IoT ACTION] Đèn LED kệ ${event.shelfCode} TỰ ĐỘNG TẮT!`);

          const doneMsg = JSON.stringify({
            action: 'SCAN_COMPLETED',
            warehouseCode: 'WH-006',
            shelfCode: event.shelfCode,
          });
          client.publish(TOPIC_COMMAND, doneMsg);
          client.publish(TOPIC_COMMAND_GV, doneMsg);

          currentIndex++;
          // Chuyển sang món tiếp theo sau 2 giây
          setTimeout(() => {
            sendLocateCommand();
          }, 2000);
        }, 1500);
      }
    } catch (e) {
      console.error('Lỗi xử lý message:', e);
    }
  }
});
