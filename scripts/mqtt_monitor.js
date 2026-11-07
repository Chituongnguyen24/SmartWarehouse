/**
 * 📡 CITYMART SMART WAREHOUSE - LIVE MQTT REAL-TIME MONITOR
 * Lắng nghe tất cả các lệnh điều khiển, sự kiện và telemetry cảm biến
 * Chạy lệnh: npm run mqtt:monitor
 */
const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://broker.emqx.io:1883';
const TOPIC_FILTER = 'citymart/warehouse/#';

console.clear();
console.log('======================================================================');
console.log('🛒 CITYMART SMART WAREHOUSE - LIVE MQTT TRAFFIC MONITOR');
console.log(`📡 Kết nối tới Broker: ${BROKER_URL}`);
console.log(`🎯 Lắng nghe toàn bộ topic: ${TOPIC_FILTER}`);
console.log('======================================================================\n');

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('🟢 [CONNECTED] Đã kết nối thành công tới MQTT Broker Cloud!');
  console.log('⏳ Đang chờ thông điệp từ Staff App / Web Dashboard / ESP32...\n');

  client.subscribe(TOPIC_FILTER, (err) => {
    if (err) console.error('❌ Lỗi subscribe:', err);
  });
});

client.on('message', (topic, message) => {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const rawPayload = message.toString();
  
  let formattedPayload = rawPayload;
  try {
    const json = JSON.parse(rawPayload);
    formattedPayload = JSON.stringify(json, null, 2);
  } catch (e) {}

  // Phân loại sự kiện
  if (topic.includes('command')) {
    console.log(`\n📢 [${timestamp}] [LỆNH ĐIỀU KHIỂN - COMMAND]`);
    console.log(`👉 Topic: \x1b[36m${topic}\x1b[0m`);
    console.log(`📦 Nội dung:\n\x1b[33m${formattedPayload}\x1b[0m`);
  } else if (topic.includes('event')) {
    console.log(`\n🔔 [${timestamp}] [SỰ KIỆN TỪ MẠCH - HARDWARE EVENT]`);
    console.log(`👉 Topic: \x1b[32m${topic}\x1b[0m`);
    console.log(`📦 Nội dung:\n\x1b[35m${formattedPayload}\x1b[0m`);
  } else if (topic.includes('telemetry')) {
    console.log(`\n🌡️ [${timestamp}] [DỮ LIỆU CẢM BIẾN - TELEMETRY]`);
    console.log(`👉 Topic: \x1b[34m${topic}\x1b[0m`);
    console.log(`📊 Dữ liệu: \x1b[37m${rawPayload}\x1b[0m`);
  } else {
    console.log(`\n📬 [${timestamp}] Topic: ${topic} => ${rawPayload}`);
  }
});

client.on('error', (err) => {
  console.error('❌ [MQTT ERROR]:', err.message);
});

