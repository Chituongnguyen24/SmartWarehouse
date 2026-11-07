/**
 * ======================================================================================
 * HỆ THỐNG IOT PICK-TO-LIGHT & GIÁM SÁT KHO MÁT (SFWMS SMART COLD CHAIN)
 * ======================================================================================
 * File: sketch_nov7a.ino
 * Nền tảng: ESP32 Node (Phòng Kho Lạnh / Kho Mát - Kho Gò Vấp WH-006)
 *
 * PHẦN CỨNG SỬ DỤNG:
 * 1. Cảm biến nhiệt ẩm SHT30 (I2C: SDA=21, SCL=22, Address=0x44)
 * 2. Màn hình OLED SSD1306 128x64 (I2C: SDA=21, SCL=22, Address=0x3C)
 * 3. 3 Kệ hàng Kho Mát (Pick-to-Light 3 Giàn):
 *    - Giàn 1 (Kệ A1): LED=25, BUZZER=18 (Active LOW), NÚT STOP/CONFIRM=27 (Active HIGH)
 *    - Giàn 2 (Kệ A2): LED=26, BUZZER=19 (Active LOW), NÚT STOP/CONFIRM=14 (Active HIGH)
 *    - Giàn 3 (Kệ A3): LED=32, BUZZER=23 (Active LOW), NÚT STOP/CONFIRM=33 (Active HIGH)
 *
 * GIAO THỨC ĐỒNG BỘ:
 * - MQTT Client: broker.emqx.io (Port 1883)
 *   + Subscribe: citymart/warehouse/WH-006/picking/command
 *   + Subscribe: citymart/warehouse/GV/picking/command
 *   + Publish:   citymart/warehouse/WH-006/picking/event
 *   + Publish:   citymart/warehouse/WH-006/zone/COOL/telemetry
 * - HTTP Client: Bắn REST API trực tiếp về máy chủ (:3007) khi ấn nút vật lý
 * - Web Server nội bộ: Truy cập http://<ESP32_IP>/ từ trình duyệt để test nhanh
 * - Serial Monitor (115200): '1', '2', '3' bật kệ, '0' tắt tất cả
 * ======================================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 1. CẤU HÌNH MẠNG WI-FI & MÁY CHỦ SFWMS
// =========================================================================
// 👉 THAY ĐỔI TÊN WI-FI VÀ MẬT KHẨU CỦA BẠN TẠI ĐÂY:
const char* WIFI_SSID       = "ThiNo Coffee";        // Tên Wi-Fi (2.4GHz)
const char* WIFI_PASSWORD   = "thinocoffee";         // Mật khẩu Wi-Fi

// Địa chỉ IP của máy tính chạy Backend SmartWarehouse:
const char* BACKEND_SERVER_IP = "192.168.1.181";
const int   BACKEND_PORT      = 3007;

// MQTT Broker (Khớp chuẩn 100% với outbound-service của Backend):
const char* MQTT_BROKER       = "broker.emqx.io";
const int   MQTT_PORT         = 1883;

// Topics MQTT
const char* TOPIC_COMMAND_WH006 = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_COMMAND_GV    = "citymart/warehouse/GV/picking/command";
const char* TOPIC_EVENT_WH006   = "citymart/warehouse/WH-006/picking/event";
const char* TOPIC_TELEMETRY     = "citymart/warehouse/WH-006/zone/COOL/telemetry";

// =========================================================================
// 2. KHAI BÁO PHẦN CỨNG (GIỮ NGUYÊN CHÍNH XÁC THEO MẠCH CỦA BẠN)
// =========================================================================
#define SDA_PIN 21
#define SCL_PIN 22

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C
#define SHT30_ADDRESS 0x44

// Khai báo chân 3 Còi, 3 LED, 3 Nút bấm
#define BUZZER1 18
#define BUZZER2 19
#define BUZZER3 23

#define LED1 25
#define LED2 26
#define LED3 32

#define BTN1 27
#define BTN2 14
#define BTN3 33

// Còi kích mức LOW (Đã kiểm tra thành công)
#define BUZZER_ON LOW
#define BUZZER_OFF HIGH

// Nút nhấn kích mức HIGH
#define BUTTON_PRESSED HIGH

const int buzzerPins[3] = { BUZZER1, BUZZER2, BUZZER3 };
const int ledPins[3]    = { LED1, LED2, LED3 };
const int buttonPins[3] = { BTN1, BTN2, BTN3 };

const char* SHELF_NAMES[3]    = { "Ke A1", "Ke A2", "Ke A3" };
const char* SHELF_PRODUCTS[3] = { "Ba Roi Xong Khoi", "Pho Mai Montinis", "Cha Com Hoa Doanh" };

// =========================================================================
// 3. ĐỐI TƯỢNG VÀ BIẾN TRẠNG THÁI TOÀN CỤC
// =========================================================================
Adafruit_SHT31 sht30 = Adafruit_SHT31();
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);

bool shtOK = false;
bool oledOK = false;
float nhietDo = NAN;
float doAm = NAN;

// Trạng thái 3 giàn
bool active[3] = {false, false, false};
unsigned long buzzerAutoOffTime[3] = {0, 0, 0}; // Tự động ngắt còi sau 2.5s để đỡ chói tai, LED vẫn sáng

// Thông tin đơn hàng đang hiển thị
String currentShelfActive = "";
String currentProductActive = "";
int currentQtyActive = 0;
String currentActionMessage = "SAN SANG";

// Chống dội phím
bool lastRaw[3] = {LOW, LOW, LOW};
bool stableState[3] = {LOW, LOW, LOW};
unsigned long lastChange[3] = {0, 0, 0};

// Chu kỳ đọc cảm biến và gửi Telemetry (mỗi 3 giây)
const unsigned long SENSOR_INTERVAL = 3000;
unsigned long lastSensorRead = 0;

// Chu kỳ kết nối lại MQTT
unsigned long lastMqttReconnectAttempt = 0;

// =========================================================================
// 4. CÁC HÀM ĐIỀU KHIỂN GIÀN KỆ (LED & BUZZER)
// =========================================================================

/**
 * Bật giàn kệ i (0 = Kệ A1, 1 = Kệ A2, 2 = Kệ A3)
 * @param i: Chỉ số kệ (0..2)
 * @param chirpOnly: Nếu true, chỉ kêu 2 tiếng Smartkey rồi tắt còi, không giữ còi liên tục
 */
void batGian(int i, bool chirpOnly = false) {
  if (i < 0 || i >= 3) return;

  active[i] = true;
  digitalWrite(ledPins[i], HIGH);

  if (chirpOnly) {
    // Kiểu tiếng bóp còi Smartkey "Pip-Pip!"
    for (int k = 0; k < 2; k++) {
      digitalWrite(buzzerPins[i], BUZZER_ON);
      delay(80);
      digitalWrite(buzzerPins[i], BUZZER_OFF);
      delay(70);
    }
  } else {
    // Kiểu còi định vị tìm kệ: Kêu trong 2.5 giây rồi tự ngắt, LED vẫn tiếp tục sáng đợi nhân viên nhặt hàng
    digitalWrite(buzzerPins[i], BUZZER_ON);
    buzzerAutoOffTime[i] = millis() + 2500;
  }

  currentShelfActive = SHELF_NAMES[i];
  currentProductActive = SHELF_PRODUCTS[i];

  Serial.print(">>> [IOT] BAT DEN & COI ");
  Serial.print(SHELF_NAMES[i]);
  Serial.print(" - SP: ");
  Serial.println(SHELF_PRODUCTS[i]);
}

/**
 * Tắt giàn kệ i
 */
void tatGian(int i) {
  if (i < 0 || i >= 3) return;

  active[i] = false;
  digitalWrite(buzzerPins[i], BUZZER_OFF);
  digitalWrite(ledPins[i], LOW);

  Serial.print(">>> [IOT] DA TAT GIAN ");
  Serial.println(SHELF_NAMES[i]);
}

/**
 * Tắt toàn bộ giàn kệ
 */
void tatTatCa() {
  for (int i = 0; i < 3; i++) {
    tatGian(i);
  }
  currentShelfActive = "";
  currentProductActive = "";
  currentQtyActive = 0;
  currentActionMessage = "SAN SANG";
}

// =========================================================================
// 5. HIỂN THỊ MÀN HÌNH OLED SSD1306 (GIAO DIỆN CÔNG NGHIỆP TRỰC QUAN)
// =========================================================================
void hienThiOLED() {
  if (!oledOK) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // DÒNG 1: HEADER & TRẠNG THÁI MẠNG
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("WH-006 KHO MAT");

  display.setCursor(94, 0);
  if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    display.print("[MQTT]");
  } else if (WiFi.status() == WL_CONNECTED) {
    display.print("[WIFI]");
  } else {
    display.print("[OFF]");
  }

  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // NẾU CÓ KỆ ĐANG HOẠT ĐỘNG (PICK-TO-LIGHT ĐƯỢC KÍCH HOẠT):
  if (currentShelfActive.length() > 0) {
    display.setTextSize(2);
    display.setCursor(0, 14);
    display.print(currentShelfActive); // "Ke A1", "Ke A2", ...

    if (currentQtyActive > 0) {
      display.setCursor(85, 14);
      display.print("x");
      display.print(currentQtyActive);
    }

    display.setTextSize(1);
    display.setCursor(0, 34);
    display.print(currentProductActive);

    display.setCursor(0, 46);
    display.print("LENH: ");
    display.print(currentActionMessage);

    // Dưới cùng: Hiển thị nhiệt độ thu gọn
    display.setCursor(0, 56);
    display.print("T:");
    if (!isnan(nhietDo)) {
      display.print(nhietDo, 1);
      display.print("C  H:");
      display.print(doAm, 0);
      display.print("%");
    } else {
      display.print("--C");
    }
  } 
  // NẾU Ở CHẾ ĐỘ CHỜ (IDLE TELEMETRY):
  else {
    if (isnan(nhietDo) || isnan(doAm)) {
      display.setTextSize(1);
      display.setCursor(18, 26);
      display.println("SHT30 ERROR!");
      display.setCursor(12, 42);
      display.println("CHECK CABLE I2C");
    } else {
      display.setTextSize(1);
      display.setCursor(0, 14);
      display.println("NHIET DO KHO MAT:");

      display.setTextSize(2);
      display.setCursor(10, 26);
      display.print(nhietDo, 1);
      display.write(247);
      display.print("C");

      display.setTextSize(1);
      display.setCursor(0, 48);
      display.print("DO AM: ");
      display.print(doAm, 1);
      display.print("%");

      display.setCursor(85, 48);
      if (nhietDo >= 0.0 && nhietDo <= 4.0) {
        display.print("[CHUAN]");
      } else {
        display.print("[CANH BAO]");
      }
    }
    display.setCursor(0, 56);
    display.print("IP: ");
    display.print(WiFi.localIP().toString());
  }

  display.display();
}

// =========================================================================
// 6. ĐỌC CẢM BIẾN SHT30 & GỬI DỮ LIỆU TELEMETRY QUA MQTT
// =========================================================================
void docCamBienVaGuiTelemetry() {
  if (!shtOK) {
    shtOK = sht30.begin(SHT30_ADDRESS);
  }

  if (shtOK) {
    nhietDo = sht30.readTemperature();
    doAm    = sht30.readHumidity();

    if (isnan(nhietDo) || isnan(doAm)) {
      Serial.println("[SHT30] Loi doc gia tri cam bien!");
      shtOK = false;
    }
  } else {
    nhietDo = NAN;
    doAm    = NAN;
  }

  // Cập nhật màn hình OLED
  hienThiOLED();

  // Bắn dữ liệu Telemetry lên hệ thống SmartWarehouse
  if (!isnan(nhietDo) && !isnan(doAm) && mqttClient.connected()) {
    StaticJsonDocument<256> doc;
    doc["warehouseCode"] = "WH-006";
    doc["zone"]          = "COOL";
    doc["temperature"]   = round(nhietDo * 10) / 10.0;
    doc["humidity"]      = round(doAm * 10) / 10.0;
    doc["status"]        = (nhietDo <= 4.0 && nhietDo >= 0.0) ? "NORMAL" : "WARNING";
    doc["sensorType"]    = "SHT30_INDUSTRIAL";
    doc["ip"]            = WiFi.localIP().toString();
    doc["timestamp"]     = millis();

    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish(TOPIC_TELEMETRY, buffer);
  }
}

// =========================================================================
// 7. BẮN HTTP REST CONFIRM VỀ BACKEND OUTBOUND-SERVICE (:3007)
// =========================================================================
void sendHttpCompleteToBackend(String shelfCode) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;

  String url = "http://" + String(BACKEND_SERVER_IP) + ":" + String(BACKEND_PORT) + "/outbound-orders/iot/complete-shelf";
  Serial.print("[HTTP] Gui xac nhan ve Backend: ");
  Serial.println(url);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["warehouseCode"] = "WH-006";
  doc["shelfCode"]     = shelfCode;

  String reqBody;
  serializeJson(doc, reqBody);

  int httpCode = http.POST(reqBody);
  if (httpCode > 0) {
    Serial.printf("[HTTP] Backend phan hoi: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] Loi goi API: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// =========================================================================
// 8. XỬ LÝ NHẤN NÚT VẬT LÝ TRÊN KỆ (CONFIRM ĐÃ NHẶT XONG)
// =========================================================================
void kiemTraNutNhan() {
  unsigned long now = millis();

  // Tự động tắt còi sau 2.5s nếu nhân viên chưa ấn nút, giữ lại LED sáng
  for (int i = 0; i < 3; i++) {
    if (active[i] && buzzerAutoOffTime[i] > 0 && now >= buzzerAutoOffTime[i]) {
      digitalWrite(buzzerPins[i], BUZZER_OFF);
      buzzerAutoOffTime[i] = 0;
    }
  }

  // Quét 3 nút bấm với chống dội phím (30ms)
  for (int i = 0; i < 3; i++) {
    bool raw = digitalRead(buttonPins[i]);

    if (raw != lastRaw[i]) {
      lastRaw[i] = raw;
      lastChange[i] = now;
    }

    if (now - lastChange[i] >= 30) {
      if (raw != stableState[i]) {
        stableState[i] = raw;

        // Nhân viên ấn nút vật lý trên kệ (HIGH)
        if (stableState[i] == BUTTON_PRESSED) {
          Serial.printf(">>> [BUTTON] DA AN NUT XAC NHAN TAI GIAN %d (%s)!\n", i + 1, SHELF_NAMES[i]);

          // 1. Tắt đèn & còi kệ ngay lập tức
          tatGian(i);

          // 2. Kêu 1 tiếng Bíp ngắn xác nhận thao tác thành công
          digitalWrite(buzzerPins[i], BUZZER_ON);
          delay(80);
          digitalWrite(buzzerPins[i], BUZZER_OFF);

          currentActionMessage = "DA XAC NHAN!";
          hienThiOLED();

          // 3. Bắn sự kiện lên MQTT Broker cho toàn hệ thống
          if (mqttClient.connected()) {
            StaticJsonDocument<256> doc;
            doc["event"]         = "PICK_CONFIRMED";
            doc["shelfIndex"]    = i + 1;
            doc["shelfCode"]     = SHELF_NAMES[i];
            doc["warehouseCode"] = "WH-006";
            doc["timestamp"]     = millis();

            char buffer[256];
            serializeJson(doc, buffer);
            mqttClient.publish(TOPIC_EVENT_WH006, buffer);
            Serial.println("[MQTT] Da publish su kien PICK_CONFIRMED");
          }

          // 4. Bắn HTTP REST đồng bộ với App Nhân Viên qua Backend :3007
          sendHttpCompleteToBackend(SHELF_NAMES[i]);

          delay(400);
          tatTatCa();
          hienThiOLED();
        }
      }
    }
  }
}

// =========================================================================
// 9. NHẬN VÀ PHÂN TÍCH LỆNH TỪ MQTT (TỪ APP NHÂN VIÊN & WEB QUẢN LÝ)
// =========================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println();
  Serial.print("[MQTT RECEIVE] Topic: ");
  Serial.println(topic);
  Serial.print("[MQTT RECEIVE] Payload: ");
  Serial.println(message);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.print("[MQTT] Loi parse JSON: ");
    Serial.println(error.c_str());
    return;
  }

  const char* action    = doc["action"];    // "LOCATE", "SMARTKEY_CHIRP", "SCAN_COMPLETED", "COMPLETE", "CLEAR"
  const char* shelfCode = doc["shelfCode"]; // "Kệ A1", "Ke A1", "1", "A2", "3", ...
  const char* prodName  = doc["productName"] | "";
  int qty               = doc["qty"] | 1;

  if (!action || !shelfCode) return;

  String sCode = String(shelfCode);
  sCode.toLowerCase();

  // Xác định giàn kệ đích (0, 1, 2)
  int targetIdx = -1;
  if (sCode.indexOf("a1") >= 0) targetIdx = 0;
  else if (sCode.indexOf("a2") >= 0) targetIdx = 1;
  else if (sCode.indexOf("a3") >= 0) targetIdx = 2;
  else if (sCode.indexOf("kệ 1") >= 0 || sCode.indexOf("ke 1") >= 0 || sCode == "1") targetIdx = 0;
  else if (sCode.indexOf("kệ 2") >= 0 || sCode.indexOf("ke 2") >= 0 || sCode == "2") targetIdx = 1;
  else if (sCode.indexOf("kệ 3") >= 0 || sCode.indexOf("ke 3") >= 0 || sCode == "3") targetIdx = 2;

  String actStr = String(action);
  actStr.toUpperCase();

  // LỆNH 1: ĐỊNH VỊ NHÁY ĐÈN KỆ (LOCATE)
  if (actStr == "LOCATE") {
    if (targetIdx >= 0) {
      currentQtyActive = qty;
      if (strlen(prodName) > 0) currentProductActive = String(prodName);
      currentActionMessage = "DANG LAY HANG";
      batGian(targetIdx, false);
      hienThiOLED();
    }
  }
  // LỆNH 2: BÓP CÒI SMARTKEY TÌM KỆ (SMARTKEY_CHIRP)
  else if (actStr == "SMARTKEY_CHIRP" || actStr == "CHIRP") {
    if (targetIdx >= 0) {
      currentActionMessage = "BOP COI TIM KE";
      batGian(targetIdx, true); // Kêu 2 tiếng Pip-Pip
      hienThiOLED();
    }
  }
  // LỆNH 3: QUÉT XONG HOẶC TẮT ĐÈN (SCAN_COMPLETED / COMPLETE / OFF)
  else if (actStr == "SCAN_COMPLETED" || actStr == "COMPLETE" || actStr == "OFF") {
    if (targetIdx >= 0) {
      tatGian(targetIdx);
    } else {
      tatTatCa();
    }
    currentActionMessage = "DA XONG";
    hienThiOLED();
    delay(500);
    tatTatCa();
    hienThiOLED();
  }
  // LỆNH 4: TẮT TẤT CẢ (CLEAR)
  else if (actStr == "CLEAR") {
    tatTatCa();
    hienThiOLED();
  }
}

// =========================================================================
// 10. KẾT NỐI VÀ DUY TRÌ MQTT BROKER
// =========================================================================
void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttReconnectAttempt > 5000) {
    lastMqttReconnectAttempt = now;
    Serial.print("[MQTT] Dang ket noi toi Broker: ");
    Serial.println(MQTT_BROKER);

    String clientId = "ESP32-ColdStorage-WH006-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("[MQTT] KET NOI THANH CONG!");
      mqttClient.subscribe(TOPIC_COMMAND_WH006);
      mqttClient.subscribe(TOPIC_COMMAND_GV);
      Serial.print("[MQTT] Da subscribe topic: ");
      Serial.println(TOPIC_COMMAND_WH006);
      hienThiOLED();
    } else {
      Serial.print("[MQTT] Ket noi that bai, rc=");
      Serial.println(mqttClient.state());
    }
  }
}

// =========================================================================
// 11. WEBSERVER NỘI BỘ (CHO PHÉP TEST NHANH QUA TRÌNH DUYỆT ĐIỆN THOẠI/PC)
// =========================================================================
void setupWebServer() {
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<title>SFWMS IoT Node Kho Mát</title>";
    html += "<style>body{font-family:Arial,sans-serif;background:#0f172a;color:#fff;text-align:center;padding:20px;}";
    html += ".card{background:#1e293b;border-radius:16px;padding:20px;max-width:400px;margin:0 auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);}";
    html += "button{width:100%;padding:14px;margin:8px 0;font-size:16px;font-weight:bold;border:none;border-radius:10px;cursor:pointer;}";
    html += ".b1{background:#0284c7;color:#fff;} .b2{background:#10b981;color:#fff;} .b3{background:#f59e0b;color:#fff;} .b0{background:#ef4444;color:#fff;}";
    html += ".stat{font-size:24px;color:#38bdf8;font-weight:bold;margin:15px 0;}</style></head><body>";
    html += "<div class='card'>";
    html += "<h2>❄️ SFWMS IoT KHO MÁT (WH-006)</h2>";
    html += "<div class='stat'>Nhiệt độ: " + String(nhietDo, 1) + "°C | Độ ẩm: " + String(doAm, 0) + "%</div>";
    html += "<p>Điều khiển Pick-to-Light trực tiếp:</p>";
    html += "<button class='b1' onclick=\"fetch('/api/shelf?id=1')\">🔔 Kệ A1 (Thịt Ba Rọi)</button>";
    html += "<button class='b2' onclick=\"fetch('/api/shelf?id=2')\">🔔 Kệ A2 (Phô Mai Montinis)</button>";
    html += "<button class='b3' onclick=\"fetch('/api/shelf?id=3')\">🔔 Kệ A3 (Chả Cốm Hoa Doanh)</button>";
    html += "<button class='b0' onclick=\"fetch('/api/off')\">🛑 TẮT TẤT CẢ GIÀN</button>";
    html += "<p style='font-size:12px;color:#94a3b8;margin-top:15px;'>Kết nối chuẩn MQTT broker.emqx.io</p>";
    html += "</div></body></html>";
    server.send(200, "text/html", html);
  });

  server.on("/api/shelf", HTTP_GET, []() {
    String id = server.arg("id");
    if (id == "1") batGian(0, false);
    else if (id == "2") batGian(1, false);
    else if (id == "3") batGian(2, false);
    server.send(200, "application/json", "{\"success\":true,\"shelf\":" + id + "}");
    hienThiOLED();
  });

  server.on("/api/off", HTTP_GET, []() {
    tatTatCa();
    server.send(200, "application/json", "{\"success\":true,\"action\":\"OFF_ALL\"}");
    hienThiOLED();
  });

  server.begin();
  Serial.println("[HTTP SERVER] Web Server noi bo da bat tai cong 80!");
}

// =========================================================================
// 12. NHẬN LỆNH TEST TỪ SERIAL MONITOR (GIỮ NGUYÊN FILE GỐC CỦA BẠN)
// =========================================================================
void xuLySerial() {
  while (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd >= '1' && cmd <= '3') {
      int i = cmd - '1';
      batGian(i, false);
      hienThiOLED();
    } else if (cmd == '0') {
      tatTatCa();
      hienThiOLED();
    }
  }
}

// =========================================================================
// 13. HÀM SETUP
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("==================================================");
  Serial.println(" SFWMS - SMART COLD CHAIN IOT (WH-006 GO VAP)");
  Serial.println("==================================================");

  // 1. Khởi tạo chân I/O 3 Giàn Kệ
  for (int i = 0; i < 3; i++) {
    pinMode(buzzerPins[i], OUTPUT);
    digitalWrite(buzzerPins[i], BUZZER_OFF);

    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);

    pinMode(buttonPins[i], INPUT);
    lastRaw[i]     = digitalRead(buttonPins[i]);
    stableState[i] = lastRaw[i];
    lastChange[i]  = millis();
  }
  tatTatCa();

  // 2. Khởi tạo bus I2C (SDA=21, SCL=22)
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);

  // 3. Khởi tạo màn hình OLED SSD1306
  oledOK = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (oledOK) {
    Serial.println("[OLED] OK (0x3C)");
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(20, 24);
    display.println("SFWMS IOT NODE");
    display.setCursor(15, 38);
    display.println("DANG KET NOI WIFI");
    display.display();
  } else {
    Serial.println("[OLED] ERROR!");
  }

  // 4. Khởi tạo cảm biến SHT30
  shtOK = sht30.begin(SHT30_ADDRESS);
  if (shtOK) {
    Serial.println("[SHT30] OK (0x44)");
  } else {
    Serial.println("[SHT30] ERROR - Khong tim thay dia chi 0x44!");
  }

  // 5. Kết nối Wi-Fi
  Serial.print("[WIFI] Dang ket noi toi SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 15) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WIFI] KET NOI THANH CONG!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());

    // Cấu hình MQTT
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    // Bật WebServer nội bộ
    setupWebServer();
  } else {
    Serial.println();
    Serial.println("[WIFI] Chua ket noi duoc Wi-Fi (Chay offline qua Serial/Nut bam).");
  }

  // Đọc cảm biến ngay lập tức
  docCamBienVaGuiTelemetry();
  lastSensorRead = millis();

  Serial.println("==================================================");
  Serial.println(" SANG SANG NHAN LENH:");
  Serial.println(" - Tu App Nhan Vien / Dashboard qua MQTT");
  Serial.println(" - Tu Serial: 1 (Gian 1), 2 (Gian 2), 3 (Gian 3), 0 (Tat)");
  Serial.println(" - Tu Nut bam vat ly tren gian de xac nhan xong");
  Serial.println("==================================================");
}

// =========================================================================
// 14. VÒNG LẶP CHÍNH (LOOP)
// =========================================================================
void loop() {
  // 1. Duy trì kết nối Wi-Fi & MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    } else {
      mqttClient.loop();
    }
    server.handleClient();
  }

  // 2. Quét kiểm tra 3 nút nhấn vật lý
  kiemTraNutNhan();

  // 3. Nhận lệnh điều khiển từ Serial
  xuLySerial();

  // 4. Định kỳ đọc cảm biến SHT30 & gửi Telemetry (mỗi 3s)
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = millis();
    docCamBienVaGuiTelemetry();
  }
}
