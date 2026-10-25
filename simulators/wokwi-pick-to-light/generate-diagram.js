const fs = require('fs');
const path = require('path');

// =========================================================================
// THIẾT KẾ PHÒNG KHO LẠNH (COLD ROOM NODE) - KHO GÒ VẤP (WH-006 / GV)
// - Ngoài cửa: 1 Loa lớn (Master Door Horn Buzzer) + OLED + ESP32 + DHT22 + Nút cửa
// - Tại mỗi kệ (A1, A2, A3): 1 Loa chip nhỏ + 1 Đèn NeoPixel RGB + 1 Nút bấm
// =========================================================================

const COLD_SHELVES = [
  { id: 'a1', code: 'A1', label: 'Ke A1 (Thit CP)', left: -200, pinBtn: 'esp:14', pinBz: 'esp:23' },
  { id: 'a2', code: 'A2', label: 'Ke A2 (Sua Da Lat Milk)', left: 30, pinBtn: 'esp:27', pinBz: 'esp:19' },
  { id: 'a3', code: 'A3', label: 'Ke A3 (Rau VietGAP)', left: 260, pinBtn: 'esp:12', pinBz: 'esp:18' },
];

const parts = [
  // Bo điều khiển Trung tâm Phòng Lạnh ESP32
  { type: 'board-esp32-devkit-c-v4', id: 'esp', top: 160, left: -40, attrs: {} },
  
  // Màn hình OLED giám sát cửa Phòng Lạnh (SSD1306)
  { type: 'board-ssd1306', id: 'oled', top: 160, left: 180, attrs: { i2cAddress: '0x3c' } },
  
  // LOA LỚN NGOÀI CỬA PHÒNG (Master Door Horn Siren - Chân 32)
  { type: 'wokwi-buzzer', id: 'bz_door', top: 160, left: -140, attrs: { hasLocalSound: 'true', label: 'LOA LON CUA PHONG' } },
  
  // Nút Check-in tổng tại cửa phòng
  { type: 'wokwi-pushbutton', id: 'btn_master', top: 160, left: -240, attrs: { color: 'green', label: 'CHECK-IN CUA PHONG' } },
  
  // Cảm biến Nhiệt độ & Độ ẩm DHT22 đo môi trường Phòng Lạnh (chuẩn 2.5°C, 72%)
  { type: 'wokwi-dht22', id: 'dht', top: 160, left: 300, attrs: { temperature: '2.5', humidity: '72' } },
];

// Thêm 3 Kệ hàng Pick-to-Light: Mỗi kệ gồm 1 Loa nhỏ + 1 Đèn LED RGB + 1 Nút bấm
COLD_SHELVES.forEach((s) => {
  // 1. Loa nhỏ tại kệ (Local Shelf Beeper)
  parts.push({
    type: 'wokwi-buzzer',
    id: `bz_${s.id}`,
    top: -50,
    left: s.left - 45,
    attrs: { hasLocalSound: 'true', label: `Loa ${s.code}` }
  });

  // 2. Đèn LED NeoPixel RGB
  parts.push({
    type: 'wokwi-neopixel',
    id: `np_${s.id}`,
    top: -50,
    left: s.left + 25,
    attrs: { label: s.label }
  });

  // 3. Nút bấm xác nhận tại kệ
  parts.push({
    type: 'wokwi-pushbutton',
    id: `btn_${s.id}`,
    top: -55,
    left: s.left + 95,
    attrs: { color: 'green', label: `Check-in ${s.code}` }
  });
});

const connections = [
  // OLED I2C (Chân 21 SDA, Chân 22 SCL)
  ['esp:GND.1', 'oled:GND', 'black', ['v0']],
  ['esp:3V3', 'oled:VCC', 'red', ['v0']],
  ['esp:22', 'oled:SCL', 'yellow', ['v0']],
  ['esp:21', 'oled:SDA', 'blue', ['v0']],

  // LOA LỚN NGOÀI CỬA PHÒNG (Chân GPIO 32)
  ['esp:GND.1', 'bz_door:2', 'black', ['v0']],
  ['esp:32', 'bz_door:1', 'magenta', ['v0']],

  // Nút Master cửa phòng (Chân GPIO 33)
  ['esp:GND.1', 'btn_master:2.l', 'black', ['v0']],
  ['esp:33', 'btn_master:1.l', 'purple', ['v0']],

  // Cảm biến DHT22 Phòng Lạnh (Chân GPIO 5)
  ['dht:VCC', 'esp:3V3', 'red', ['v0']],
  ['dht:GND', 'esp:GND.2', 'black', ['v0']],
  ['dht:SDA', 'esp:5', 'gold', ['v0']],

  // Chuỗi dải đèn NeoPixel (Chân GPIO 13 điều khiển nối tiếp)
  ['esp:13', 'np_a1:DIN', 'green', ['v0']],
  ['np_a1:DOUT', 'np_a2:DIN', 'green', ['v0']],
  ['np_a2:DOUT', 'np_a3:DIN', 'green', ['v0']],

  // Nguồn cho 3 NeoPixel
  ['np_a1:VDD', 'esp:3V3', 'red', ['v0']],
  ['np_a1:VSS', 'esp:GND.2', 'black', ['v0']],
  ['np_a2:VDD', 'esp:3V3', 'red', ['v0']],
  ['np_a2:VSS', 'esp:GND.2', 'black', ['v0']],
  ['np_a3:VDD', 'esp:3V3', 'red', ['v0']],
  ['np_a3:VSS', 'esp:GND.2', 'black', ['v0']],

  // 3 Nút bấm tại 3 Kệ nối trực tiếp GPIO
  // Kệ A1: GPIO 14
  ['esp:14', 'btn_a1:1.l', 'orange', ['v0']],
  ['esp:GND.1', 'btn_a1:2.l', 'black', ['v0']],

  // Kệ A2: GPIO 27
  ['esp:27', 'btn_a2:1.l', 'orange', ['v0']],
  ['esp:GND.1', 'btn_a2:2.l', 'black', ['v0']],

  // Kệ A3: GPIO 12
  ['esp:12', 'btn_a3:1.l', 'orange', ['v0']],
  ['esp:GND.1', 'btn_a3:2.l', 'black', ['v0']],

  // 3 LOA NHỎ TẠI 3 KỆ HÀNG:
  // Loa nhỏ Kệ A1: GPIO 23
  ['esp:23', 'bz_a1:1', 'cyan', ['v0']],
  ['esp:GND.1', 'bz_a1:2', 'black', ['v0']],

  // Loa nhỏ Kệ A2: GPIO 19
  ['esp:19', 'bz_a2:1', 'cyan', ['v0']],
  ['esp:GND.1', 'bz_a2:2', 'black', ['v0']],

  // Loa nhỏ Kệ A3: GPIO 18
  ['esp:18', 'bz_a3:1', 'cyan', ['v0']],
  ['esp:GND.1', 'bz_a3:2', 'black', ['v0']],
];

const diagram = {
  version: 1,
  author: 'CityMart Kho Lanh - 1 Loa Lon Cua + 3 Loa Nho Tai Ke (WH-006)',
  editor: 'wokwi',
  parts,
  connections,
  dependencies: {}
};

fs.writeFileSync(
  path.join(__dirname, 'diagram.json'),
  JSON.stringify(diagram, null, 2)
);

console.log('✅ Đã tạo thành công diagram.json: 1 Loa lớn cửa phòng + 3 Loa nhỏ tại từng kệ!');
