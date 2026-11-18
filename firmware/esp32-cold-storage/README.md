# 🧊 Hệ Thống IoT Giám Sát Kho Lạnh & Pick-to-Light (WH-006)

Tài liệu hướng dẫn lắp ráp mạch thực tế và nạp code cho Vi điều khiển **ESP32** điều khiển mô hình thực tế Kho Lạnh CityMart (WH-006 - Gò Vấp).

---

## 📋 1. Danh sách linh kiện phần cứng (Xem ảnh thực tế)
1. **01 Bo mạch ESP32** (NodeMCU-32S / ESP32 DEVKIT V1 Type-C).
2. **02 Test board (Breadboard)**.
3. **01 Màn hình OLED 0.96 inch SSD1306 (I2C 4 chân)**.
4. **01 Cảm biến Nhiệt độ & Độ ẩm SHT30 (Vỏ trắng I2C 4 dây)**.
5. **04 Module Còi Buzzer (3 chân: VCC, GND, I/O)**.
6. **04 Module Nút bấm cơ bản (3 chân: VCC, GND, OUT/S)**: Đỏ, Xanh Dương, Vàng, Đen.
7. **04 Module Đèn LED SMD RGB (4 chân: -, R, G, B)**.
8. **Dây cắm cắm testboard (Jumper Wires Đực - Đực và Đực - Cái)**.
9. **01 Cáp USB Type-C** kết nối máy tính.

---

## 🔌 2. Bảng sơ đồ nối dây chi tiết (GPIO Pinout)

### A. Bus I2C dùng chung (OLED 0.96" + Cảm biến SHT30)
| Thiết bị | Chân thiết bị | Màu dây SHT30 | Nối vào ESP32 | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **OLED 0.96"** | `GND` | - | **GND** | Nối vào thanh âm (-) Breadboard |
| **OLED 0.96"** | `VCC` | - | **3V3** | Nối vào thanh dương (+) 3.3V Breadboard |
| **OLED 0.96"** | `SCL` | - | **GPIO 22** | Chân xung clock I2C |
| **OLED 0.96"** | `SDA` | - | **GPIO 21** | Chân truyền nhận dữ liệu I2C |
| **Cảm biến SHT30** | `VCC` | **Đỏ** | **3V3** | Cấp nguồn 3.3V |
| **Cảm biến SHT30** | `GND` | **Đen** | **GND** | Mass |
| **Cảm biến SHT30** | `SCL` | **Vàng** | **GPIO 22** | Cắm chung hàng/cột với SCL OLED |
| **Cảm biến SHT30** | `SDA` | **Trắng / Xanh** | **GPIO 21** | Cắm chung hàng/cột với SDA OLED |

---

### B. Cửa phòng lạnh (Check-in Cửa & Chuông báo tổng)
| Thiết bị | Chân thiết bị | Nối vào ESP32 | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Còi Cửa (Buzzer 1)** | `I/O` (hoặc `S`) | **GPIO 23** | Còi hú báo động vượt nhiệt & tiếng bíp cửa |
| **Còi Cửa (Buzzer 1)** | `VCC` / `GND` | **5V (VIN)** / **GND** | Nguồn còi |
| **Nút Cửa (Nút Đen)** | `OUT` (hoặc `S`) | **GPIO 32** | Nút Master Check-in & Tắt chuông báo 20s |
| **Nút Cửa (Nút Đen)** | `VCC` / `GND` | **3V3** / **GND** | Nguồn nút bấm |
| **Đèn LED Cửa** | Chân `R` (Đỏ) | **GPIO 4** | Đèn trạng thái cửa |
| **Đèn LED Cửa** | Chân `-` (GND) | **GND** | Cực âm LED |

---

### C. 3 Kệ Hàng Pick-to-Light Trong Phòng Lạnh
| Khu vực | Thiết bị | Chân Module | Nối vào ESP32 | Chức năng |
| :--- | :--- | :--- | :--- | :--- |
| **KỆ A1**<br>*(Thịt tươi CP)* | **Đèn LED A1** | Chân `R` (Đỏ) | **GPIO 25** | Nháy đỏ khi tìm, sáng đứng khi check-in |
| | **Đèn LED A1** | Chân `-` (GND) | **GND** | Cực âm LED |
| | **Nút Bấm A1** | `OUT` (hoặc `S`) | **GPIO 33** | Nút bấm đỏ xác nhận check-in Kệ A1 |
| | **Nút Bấm A1** | `VCC` / `GND` | **3V3** / **GND** | Nguồn nút bấm |
| | **Còi Kệ A1** | `I/O` (hoặc `S`) | **GPIO 19** | Còi bíp xác nhận tại Kệ A1 |
| | **Còi Kệ A1** | `VCC` / `GND` | **5V (VIN)** / **GND** | Nguồn còi |
| **KỆ A2**<br>*(Sữa Đà Lạt)* | **Đèn LED A2** | Chân `B` (Xanh Dương) | **GPIO 26** | Nháy xanh dương khi tìm, sáng đứng khi check-in |
| | **Đèn LED A2** | Chân `-` (GND) | **GND** | Cực âm LED |
| | **Nút Bấm A2** | `OUT` (hoặc `S`) | **GPIO 14** | Nút bấm xanh xác nhận check-in Kệ A2 |
| | **Nút Bấm A2** | `VCC` / `GND` | **3V3** / **GND** | Nguồn nút bấm |
| | **Còi Kệ A2** | `I/O` (hoặc `S`) | **GPIO 18** | Còi bíp xác nhận tại Kệ A2 |
| | **Còi Kệ A2** | `VCC` / `GND` | **5V (VIN)** / **GND** | Nguồn còi |
| **KỆ A3**<br>*(Rau VietGAP)* | **Đèn LED A3** | Chân `G` (Xanh Lá) | **GPIO 27** | Nháy xanh lá khi tìm, sáng đứng khi check-in |
| | **Đèn LED A3** | Chân `-` (GND) | **GND** | Cực âm LED |
| | **Nút Bấm A3** | `OUT` (hoặc `S`) | **GPIO 13** | Nút bấm vàng xác nhận check-in Kệ A3 |
| | **Nút Bấm A3** | `VCC` / `GND` | **3V3** / **GND** | Nguồn nút bấm |
| | **Còi Kệ A3** | `I/O` (hoặc `S`) | **GPIO 5** | Còi bíp xác nhận tại Kệ A3 |
| | **Còi Kệ A3** | `VCC` / `GND` | **5V (VIN)** / **GND** | Nguồn còi |

---

## 🛠️ 3. Quy trình nạp code & chạy thử

### Bước 1: Chuẩn bị Arduino IDE
1. Cài đặt Board ESP32: Vào `Preferences` $\rightarrow$ Thêm URL ESP32 Package:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Cài đặt các thư viện trong **Library Manager**:
   - `Adafruit SSD1306` (chọn Install All dependencies bao gồm Adafruit GFX).
   - `PubSubClient` (của Nick O'Leary).
   - `ArduinoJson` (chọn bản 6.x hoặc 7.x).

### Bước 2: Nạp code chẩn đoán phần cứng trước (`hardware_test.ino`)
1. Mở file [`hardware_test.ino`](./hardware_test.ino).
2. Chọn board: **ESP32 Dev Module** (hoặc NodeMCU-32S), chọn cổng COM của ESP32.
3. Bấm **Upload**.
4. Mở **Serial Monitor** (baudrate `115200`):
   - Màn hình OLED sẽ sáng và hiện nhiệt độ đo từ SHT30.
   - Thử bấm nút Đen, Đỏ, Xanh, Vàng: Còi tương ứng kêu và LED tương ứng sáng!

### Bước 3: Nạp Firmware Hệ thống hoàn chỉnh (`esp32_cold_storage.ino`)
1. Mở file [`esp32_cold_storage.ino`](./esp32_cold_storage.ino).
2. Điền tên WiFi & Mật khẩu WiFi của bạn vào dòng 14-15:
   ```cpp
   const char* WIFI_SSID     = "TÊN_WIFI_CỦA_BẠN";
   const char* WIFI_PASSWORD = "MẬT_KHẨU_WIFI";
   ```
3. Bấm **Upload**. Mạch sẽ tự động kết nối WiFi và MQTT Broker EMQX Cloud!

### Bước 4: Chạy kịch bản tương tác từ Terminal máy tính
Mở Terminal tại thư mục gốc dự án và chạy:
```powershell
node simulators/wokwi-pick-to-light/test-ptl-mqtt.js
```
👉 Bạn sẽ thấy mô hình vật lý phản hồi trực tiếp:
- Đèn Kệ A1 nháy $\rightarrow$ Bạn ấn Nút Đỏ $\rightarrow$ Đèn A1 sáng đứng $\rightarrow$ Hệ thống quét barcode và tự động tắt đèn!

