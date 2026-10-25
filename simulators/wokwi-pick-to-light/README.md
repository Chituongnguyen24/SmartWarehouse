# 📟 CityMart SmartWarehouse - Smart Shelf Locator IoT (Wokwi Simulation)

Mô phỏng phần cứng IoT **Định vị Kệ Hàng Thông Minh (Smart Shelf Finding & Check-in)** phục vụ quy trình lấy hàng thực tế trong kho:
1. **Tìm kiếm:** Nhân viên bấm "Tìm vị trí" trên App $\rightarrow$ Kệ tương ứng **Kêu còi tít tít & Nháy đèn liên tục** để nhân viên nhận diện từ xa.
2. **Check-in:** Nhân viên tới nơi $\rightarrow$ Ấn **Nút xác nhận trên kệ** $\rightarrow$ Còi tắt, đèn chuyển sang **Sáng đứng** để nhân viên soi nhặt hàng.
3. **Quét Barcode & Tự động tắt:** Nhân viên quét mã sản phẩm $\rightarrow$ Khi quét đủ số lượng, **Đèn LED của kệ TỰ ĐỘNG TẮT**, hoàn tất chu trình!

---

## 🌟 Các linh kiện trên Wokwi
1. **ESP32 DevKit v4** (Vi điều khiển kết nối WiFi & MQTT Broker).
2. **Màn hình OLED SSD1306 (128x64 I2C)**: Hiển thị trạng thái tìm kệ, hướng dẫn check-in và quét barcode.
3. **3 Đèn LED đại diện cho 3 ô kệ hàng**:
   * 🟢 **LED Kệ A1-01 (Pin 25)**: Sữa tươi Đà Lạt Milk
   * 🟡 **LED Kệ A1-02 (Pin 26)**: Cà chua Beef Đà Lạt
   * 🔵 **LED Kệ A2-01 (Pin 27)**: Thịt bò Úc đông lạnh
4. **Nút bấm `[NUT TOI NOI (CHECK-IN)]` (Pin 18)**: Nhân viên ấn để xác nhận đã có mặt tại kệ.
5. **Còi Buzzer (Pin 14)**: Kêu tít tít theo nhịp nháy đèn để thu hút sự chú ý.

---

## 🚀 Hướng dẫn chạy thử trên Wokwi

### Bước 1: Mở dự án ESP32 mới trên Wokwi
1. Mở: **[https://wokwi.com/projects/new/esp32](https://wokwi.com/projects/new/esp32)**.

### Bước 2: Dán mã nguồn & Sơ đồ mạch
1. **Tab `diagram.json`**: Dán toàn bộ nội dung từ file [`diagram.json`](file:///e:/HOCTAP/Khoa%20luan%20tot%20nghiep/develop/SmartWarehouse/simulators/wokwi-pick-to-light/diagram.json).
2. **Tab `sketch.ino`**: Dán toàn bộ nội dung từ file [`sketch.ino`](file:///e:/HOCTAP/Khoa%20luan%20tot%20nghiep/develop/SmartWarehouse/simulators/wokwi-pick-to-light/sketch.ino).
3. **Tab `Library Manager` (hoặc `libraries.txt`)**: Đảm bảo có 4 thư viện:
   ```
   PubSubClient
   ArduinoJson
   Adafruit SSD1306
   Adafruit GFX Library
   ```
4. Bấm **Play (▶️ Start Simulation)** màu xanh trên Wokwi. Màn hình OLED hiện `STANDBY`.

---

## 🧪 Chạy kịch bản tương tác từ Terminal

Mở terminal tại máy tính và chạy:

```powershell
node simulators/wokwi-pick-to-light/test-ptl-mqtt.js
```

### ✨ Kịch bản tương tác thực tế bạn sẽ thấy:
1. **App phát lệnh tìm món 1:** Kệ `A1-01` (Sữa tươi).
   * Trên Wokwi: **Đèn xanh nháy liên tục + Còi kêu tít tít**.
   * OLED hiện: `TIM KE [1/3]: A1-01 - Nhan nut khi toi noi!`.
2. **Nhân viên tới nơi:** Bạn click vào nút `[NUT TOI NOI (CHECK-IN)]` trên Wokwi.
   * Còi tắt ngay lập tức.
   * **Đèn chuyển sang SÁNG ĐỨNG**.
   * Terminal báo: *"Nhân viên đã đến đúng kệ và ấn nút Check-in"*.
3. **Quét Barcode:** Terminal mô phỏng quét mã barcode sản phẩm `893601234001`.
4. **Tự động tắt:** Khi quét xong, **ĐÈN LED TỰ ĐỘNG TẮT**, còi kêu 2 tiếng bíp báo xong kệ!
5. Sau 2 giây, hệ thống tự động phát lệnh tìm kệ tiếp theo `A1-02`!
