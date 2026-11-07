# 📟 Hướng Dẫn Nạp Code & Kết Nối Mạch ESP32 Pick-to-Light (SmartWarehouse)

Thư mục này chứa toàn bộ mã nguồn firmware dành cho vi điều khiển **ESP32** kết nối trực tiếp với hệ thống CityMart SmartWarehouse.

---

## 📁 Cấu Trúc Thư Mục

1. **`hardware_test.ino`**: Bài test phần cứng độc lập (Offline Smoke Test).
   - Dùng để kiểm tra nhanh màn hình OLED, dải LED, còi báo, cảm biến nhiệt ẩm DHT và các nút bấm.
   - **Không cần WiFi hay MQTT** $\rightarrow$ Giúp xác định ngay xem bạn có cắm nhầm chân GPIO nào không trước khi nạp code chính.
2. **`esp32_pick_to_light.ino`**: Firmware chính thức đầy đủ chức năng:
   - Kết nối WiFi và MQTT Cloud Broker (`broker.emqx.io`).
   - Nhận lệnh định vị nhặt hàng (`LOCATE`), bóp còi tìm kệ (`SMARTKEY_CHIRP`), hoàn tất đơn (`SCAN_COMPLETED`).
   - Gửi dữ liệu nhiệt độ, độ ẩm phòng kho lạnh về hệ thống định kỳ.

---

## 🔌 Sơ Đồ Chân Đấu Nối (Wiring Pinout)

| Linh kiện | Chân trên linh kiện | Chân kết nối ESP32 | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Màn hình OLED 0.96 SSD1306** | VCC / GND | 3V3 / GND | Nguồn 3.3V |
| | SDA | **GPIO 21** | Chân I2C Data |
| | SCL | **GPIO 22** | Chân I2C Clock |
| **Dải LED NeoPixel WS2812B** | DIN (Data In) | **GPIO 13** | Nguồn 5V (VIN) hoặc 3.3V |
| **Cảm biến nhiệt ẩm DHT22 / DHT11** | DATA | **GPIO 5** | Nguồn 3.3V |
| **Còi Buzzer (Còi báo chính)** | Chân (+) | **GPIO 32** | Chân (-) nối GND |
| **Nút Check-in Kệ A1** | 1 chân vào GPIO | **GPIO 14** | Chân còn lại nối GND |
| **Nút Check-in Kệ A2** | 1 chân vào GPIO | **GPIO 27** | Chân còn lại nối GND |
| **Nút Check-in Kệ A3** | 1 chân vào GPIO | **GPIO 12** | Chân còn lại nối GND |
| **Nút Check-in Tổng (Master)** | 1 chân vào GPIO | **GPIO 33** | Chân còn lại nối GND |

---

## 🛠️ Các Bước Cài Đặt Trên Arduino IDE

### 1. Cài Đặt Thư Viện (Library Manager: `Ctrl + Shift + I`):
Cài đặt 5 thư viện sau:
- `PubSubClient` (của Nick O'Leary)
- `ArduinoJson` (của Benoit Blanchon - Version 6.x)
- `Adafruit SSD1306` & `Adafruit GFX Library`
- `Adafruit NeoPixel`
- `DHT sensor library` (của Adafruit)

### 2. Cấu Hình WiFi
Mở file `esp32_pick_to_light.ino`, kéo đến dòng 81-82 và đổi lại tên WiFi và Mật khẩu của bạn:
```cpp
const char* ssid = "TEN_WIFI_NHA_BAN";      // Bắt buộc WiFi 2.4GHz
const char* password = "MAT_KHAU_WIFI";
```
*Broker MQTT mặc định `broker.emqx.io` và Port `1883` giữ nguyên.*

---

## 🧪 Kịch Bản Kiểm Thử Hoàn Chỉnh

1. **Bước 1 (Kiểm tra phần cứng):** Nạp `hardware_test.ino` $\rightarrow$ Thử ấn nút bấm xem còi có kêu và LED có đổi màu không.
2. **Bước 2 (Nạp code chính):** Nạp `esp32_pick_to_light.ino` $\rightarrow$ Mở Serial Monitor 115200 xem thông báo kết nối WiFi & MQTT.
3. **Bước 3 (Test bằng Terminal):** Chạy lệnh:
   ```powershell
   node simulators/wokwi-pick-to-light/test-ptl-mqtt.js
   ```
4. **Bước 4 (Test bằng Staff App):**
   - Khởi động backend: `npm run backend:staff`
   - Khởi động app: `npm run staff-web:start` (hoặc mở trên điện thoại Android)
   - Đăng nhập: `staff@sfwms.vn` / `password123`
   - Vào mục **Lấy hàng (Picking)** $\rightarrow$ Bấm **"Tìm vị trí"** $\rightarrow$ Mạch thật trên bàn sẽ nháy đèn và hú còi chỉ đường!

