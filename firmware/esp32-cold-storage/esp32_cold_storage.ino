#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🏢 CITYMART SMART WAREHOUSE - HỆ THỐNG GIÁM SÁT KHO LẠNH (WH-006)
// PHẦN CỨNG THỰC TẾ: ESP32 + OLED I2C + SHT30 I2C + 4 NÚT + 4 CÒI + 4 LED
// =========================================================================

// ================= CẤU HÌNH WIFI & MQTT =================
// Cập nhật tên WiFi và Mật khẩu thực tế của bạn tại đây:
const char* WIFI_SSID     = "YOUR_WIFI_NAME";     // Thay bằng tên WiFi của bạn (2.4GHz)
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Mật khẩu WiFi

// MQTT Broker (Mặc định dùng EMQX Cloud Public miễn phí để test ngay)
// Nếu chạy broker cục bộ trên máy tính (iot-service hoặc Mosquitto), đổi thành IP máy tính
const char* MQTT_SERVER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

// Các MQTT Topics điều khiển & gửi sự kiện
const char* TOPIC_COMMAND_WH006 = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_COMMAND_GV    = "citymart/warehouse/GV/picking/command";
const char* TOPIC_EVENT_WH006   = "citymart/warehouse/WH-006/picking/event";
const char* TOPIC_EVENT_GV      = "citymart/warehouse/GV/picking/event";
const char* TOPIC_TELEMETRY     = "citymart/warehouse/GV/environment/telemetry";

// ================= SƠ ĐỒ CHÂN PHẦN CỨNG (GPIO PIN MAPPING) =================
// 1. I2C Bus (Dùng chung cho cả OLED 0.96" và Cảm biến SHT30)
#define I2C_SDA_PIN     21  // SDA: Dây White/Green của SHT30 & SDA OLED
#define I2C_SCL_PIN     22  // SCL: Dây Yellow của SHT30 & SCL OLED

// 2. Cửa phòng lạnh (Check-in Cửa & Loa Tổng)
#define PIN_DOOR_BUZZER 23  // Còi cửa phòng
#define PIN_DOOR_BTN    32  // Nút bấm cửa phòng (Master Check-in / Mute Alarm)
#define PIN_DOOR_LED    4   // Đèn LED báo hiệu cửa phòng

// 3. Kệ A1 - Thịt tươi sống CP (Bảo quản 0°C ~ 4°C)
#define PIN_A1_LED      25  // Đèn LED Kệ A1 (Chân R - Màu Đỏ)
#define PIN_A1_BTN      33  // Nút bấm Kệ A1 (Nút Đỏ)
#define PIN_A1_BUZZER   19  // Còi Kệ A1

// 4. Kệ A2 - Sữa tươi Đà Lạt Milk (Bảo quản 2°C ~ 6°C)
#define PIN_A2_LED      26  // Đèn LED Kệ A2 (Chân B - Màu Xanh Dương)
#define PIN_A2_BTN      14  // Nút bấm Kệ A2 (Nút Xanh Dương)
#define PIN_A2_BUZZER   18  // Còi Kệ A2

// 5. Kệ A3 - Rau củ VietGAP (Bảo quản 2°C ~ 8°C)
#define PIN_A3_LED      27  // Đèn LED Kệ A3 (Chân G - Màu Xanh Lá)
#define PIN_A3_BTN      13  // Nút bấm Kệ A3 (Nút Vàng / Lá)
#define PIN_A3_BUZZER   5   // Còi Kệ A3

// ================= CẤU HÌNH MỨC LOGIC CỦA MODULE =================
// Đối với module LED SMD RGB:
// - Common Cathode (Chân '-' nối GND): Mức HIGH = Đèn Sáng (Mặc định)
// - Common Anode   (Chân '+' nối 3.3V): Mức LOW = Đèn Sáng (Đổi thành LOW)
#define LED_ON_LEVEL    HIGH
#define LED_OFF_LEVEL   LOW

// Đối với Module Nút bấm 3 chân:
// Khi bấm nút, chân tín hiệu (S/OUT) thường kéo xuống LOW (Active LOW)
#define BTN_ACTIVE_LEVEL LOW

// Mảng gom nhóm chân để tiện quét vòng lặp
const int SHELF_LEDS[3]    = { PIN_A1_LED, PIN_A2_LED, PIN_A3_LED };
const int SHELF_BTNS[3]    = { PIN_A1_BTN, PIN_A2_BTN, PIN_A3_BTN };
const int SHELF_BUZZERS[3] = { PIN_A1_BUZZER, PIN_A2_BUZZER, PIN_A3_BUZZER };
const char* SHELF_NAMES[3] = { "Ke A1", "Ke A2", "Ke A3" };
const char* SHELF_DESC[3]  = { "Thit tuoi CP", "Sua Da Lat", "Rau cu VietGAP" };

// ================= OLED SSD1306 CONFIG =================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ================= SHT30 I2C ADDRESS =================
#define SHT30_I2C_ADDR 0x44 // 0x44 mặc định, nếu chân ADDR nối VCC thì là 0x45

// ================= TIÊU CHUẨN NHIỆT ĐỘ AN TOÀN =================
struct ColdStandard {
  const char* shelfCode;
  float minTemp;
  float maxTemp;
  float minHum;
  float maxHum;
};

const ColdStandard STANDARDS[3] = {
  { "Ke A1", 0.0, 4.0, 70.0, 85.0 }, // Thịt tươi CP
  { "Ke A2", 2.0, 6.0, 60.0, 75.0 }, // Sữa tươi
  { "Ke A3", 2.0, 8.0, 75.0, 95.0 }  // Rau củ quả
};

// ================= TRẠNG THÁI HỆ THỐNG =================
enum ShelfStatus {
  STATUS_IDLE,      // Trạng thái chờ, hiển thị nhiệt ẩm giám sát
  STATUS_LOCATING,  // Nhân viên đang tìm kệ: Nháy đèn kệ + kêu còi
  STATUS_ARRIVED    // Nhân viên đã check-in tại kệ: Đèn sáng đứng
};

ShelfStatus currentState = STATUS_IDLE;
int currentTargetShelf = -1; // 0 = A1, 1 = A2, 2 = A3, -1 = None
int currentQty = 0;
String currentProduct = "";

// Biến lưu nhiệt độ, độ ẩm đo được từ SHT30
float currentTemp = 2.5;
float currentHum  = 72.0;
bool shtConnected = false;

// Bộ hẹn giờ không dùng delay()
unsigned long lastShtReadTime = 0;
const unsigned long SHT_READ_INTERVAL = 2000; // Đọc mỗi 2 giây

unsigned long lastTelemTime = 0;
const unsigned long TELEM_INTERVAL = 5000;    // Bắn MQTT telemetry mỗi 5 giây

unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 150;      // Nháy đèn 150ms

// Cảnh báo nhiệt độ kho lạnh
bool isClimateAlarm = false;
bool alarmBlinkState = false;
unsigned long lastAlarmTime = 0;
const unsigned long ALARM_INTERVAL = 250;
bool alarmMuted = false;
unsigned long muteStartTime = 0;
const unsigned long MUTE_DURATION = 20000;    // Tắt còi 20s khi bấm nút Master

// Debounce nút bấm
int lastPressed = -1;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 40;

WiFiClient espClient;
PubSubClient client(espClient);

// ================= HÀM ĐIỀU KHIỂN CÒI BUZZER =================
void soundBuzzer(int pin, bool on) {
  // Module Buzzer tích hợp sẵn transistor: mức HIGH bật kêu, mức LOW tắt
  digitalWrite(pin, on ? HIGH : LOW);
}

void beepPin(int pin, int durationMs) {
  soundBuzzer(pin, true);
  delay(durationMs);
  soundBuzzer(pin, false);
}

void muteAllBuzzers() {
  soundBuzzer(PIN_DOOR_BUZZER, false);
  for (int i = 0; i < 3; i++) {
    soundBuzzer(SHELF_BUZZERS[i], false);
  }
}

// ================= HÀM ĐIỀU KHIỂN ĐÈN LED =================
void setLed(int pin, bool on) {
  digitalWrite(pin, on ? LED_ON_LEVEL : LED_OFF_LEVEL);
}

void turnOffAllLeds() {
  setLed(PIN_DOOR_LED, false);
  for (int i = 0; i < 3; i++) {
    setLed(SHELF_LEDS[i], false);
  }
}

// ================= ĐỌC CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM SHT30 (I2C) =================
bool readSHT30(float &temp, float &hum) {
  Wire.beginTransmission(SHT30_I2C_ADDR);
  Wire.write(0x2C); // Đo nhiệt ẩm chế độ lặp lại cao (High repeatability)
  Wire.write(0x06);
  if (Wire.endTransmission() != 0) {
    return false; // Lỗi truyền thông I2C
  }

  delay(15); // Chờ SHT30 đo xong (15ms)

  Wire.requestFrom((uint8_t)SHT30_I2C_ADDR, (uint8_t)6);
  if (Wire.available() == 6) {
    uint8_t data[6];
    for (int i = 0; i < 6; i++) {
      data[i] = Wire.read();
    }
    // data[0], data[1] là Nhiệt độ; data[2] là CRC nhiệt độ
    // data[3], data[4] là Độ ẩm;   data[5] là CRC độ ẩm
    uint16_t rawTemp = (data[0] << 8) | data[1];
    uint16_t rawHum  = (data[3] << 8) | data[4];

    temp = -45.0 + (175.0 * ((float)rawTemp / 65535.0));
    hum  = 100.0 * ((float)rawHum / 65535.0);

    if (hum > 100.0) hum = 100.0;
    if (hum < 0.0)   hum = 0.0;
    return true;
  }
  return false;
}

// ================= HIỂN THỊ MÀN HÌNH OLED =================
void showScreen(String title, String l1, String l2, String l3, String l4 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Thanh tiêu đề Header
  display.setCursor(0, 0);
  display.print(">> ");
  display.println(title);
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Nội dung 4 dòng
  display.setCursor(0, 14);
  display.println(l1);
  display.setCursor(0, 26);
  display.println(l2);
  display.setCursor(0, 38);
  display.println(l3);

  if (l4.length() > 0) {
    display.setCursor(0, 50);
    display.println(l4);
  }

  display.display();
}

// Loại bỏ dấu tiếng Việt để hiển thị chuẩn trên OLED
String stripAccents(String str) {
  String out = "";
  for (unsigned int i = 0; i < str.length(); i++) {
    char c = str[i];
    if ((unsigned char)c >= 0x80) continue;
    out += c;
  }
  return out;
}

// ================= QUÉT NÚT BẤM =================
int scanButtons() {
  for (int i = 0; i < 3; i++) {
    if (digitalRead(SHELF_BTNS[i]) == BTN_ACTIVE_LEVEL) {
      return i; // Bấm nút kệ i (0 = A1, 1 = A2, 2 = A3)
    }
  }
  if (digitalRead(PIN_DOOR_BTN) == BTN_ACTIVE_LEVEL) {
    return -99; // Bấm nút Master tại Cửa phòng
  }
  return -1; // Không nút nào được bấm
}

// Phân tích mã kệ từ chuỗi (Kệ A1, A2, A3)
int parseShelf(String shelfCode) {
  shelfCode.toUpperCase();
  if (shelfCode.indexOf("A1") >= 0) return 0;
  if (shelfCode.indexOf("A2") >= 0) return 1;
  if (shelfCode.indexOf("A3") >= 0) return 2;
  return -1;
}

// ================= NHẬN LỆNH MQTT TỪ APP / HỆ THỐNG =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println(F("[MQTT Error] Lỗi parse JSON payload!"));
    return;
  }

  String action = doc["action"] | "";
  String shelfCode = doc["shelfCode"] | "";
  String productName = doc["productName"] | "";
  int qty = doc["qty"] | 1;

  Serial.println("\n-------------------------------------------");
  Serial.print("[MQTT NHẬN LỆNH]: "); Serial.print(action);
  Serial.print(" | Kệ: "); Serial.println(shelfCode);
  Serial.println("-------------------------------------------");

  // 1. LỆNH ĐỊNH VỊ TÌM KỆ (LOCATE)
  if (action == "LOCATE") {
    int idx = parseShelf(shelfCode);

    if (idx >= 0) {
      currentTargetShelf = idx;
      currentProduct = productName;
      currentQty = qty;
      currentState = STATUS_LOCATING;
      lastBlinkTime = millis();
      blinkState = false;

      turnOffAllLeds();
      muteAllBuzzers();

      // Còi cửa phòng kêu 1 tiếng báo có lệnh tìm trong kho lạnh
      beepPin(PIN_DOOR_BUZZER, 80);

      String header = "TIM KE: " + String(SHELF_NAMES[idx]);
      String l1 = "SP: " + stripAccents(currentProduct);
      String l2 = "SL: " + String(currentQty) + " mon [DANG NHAY]";
      String l3 = "T:" + String(currentTemp, 1) + "C | H:" + String((int)currentHum) + "%";
      showScreen(header, l1, l2, l3, ">> Hay an nut tai ke!");
    } else {
      // Đơn hàng thuộc phòng kho khác (Kho Đông hoặc Kho Khô)
      currentTargetShelf = -1;
      currentState = STATUS_IDLE;
      turnOffAllLeds();
      muteAllBuzzers();
      showScreen("DON O PHONG KHAC", "Ke: " + shelfCode, "Khong thuoc Kho Lanh", "Den phong: Tat", ">> San sang!");
    }
    return;
  }

  // 2. LỆNH BẤM CÒI THÔNG MINH ĐỊNH VỊ (SMARTKEY CHIRP)
  if (action == "SMARTKEY_CHIRP" || action == "HORN" || action == "CHIRP") {
    int idx = parseShelf(shelfCode);
    if (idx < 0 && currentTargetShelf >= 0) idx = currentTargetShelf;

    if (idx >= 0) {
      Serial.println(">> 🔊 Bấm còi định vị Kệ " + String(SHELF_NAMES[idx]));
      beepPin(SHELF_BUZZERS[idx], 80);
      delay(60);
      beepPin(SHELF_BUZZERS[idx], 120);
      beepPin(PIN_DOOR_BUZZER, 50);
      showScreen("DINH VI AM THANH", "Ke: " + String(SHELF_NAMES[idx]), ">> [TIT - TIT!]", "Dang phat am thanh", "T:" + String(currentTemp, 1) + "C [OK]");
    }
    return;
  }

  // 3. LỆNH QUÉT BARCODE XONG -> TỰ ĐỘNG TẮT ĐÈN KỆ
  if (action == "SCAN_COMPLETED" || action == "DONE_SHELF") {
    int idx = parseShelf(shelfCode);
    if (idx >= 0) {
      Serial.println(">> Đã quét xong sản phẩm! Tắt đèn Kệ " + String(SHELF_NAMES[idx]));
      currentState = STATUS_IDLE;
      turnOffAllLeds();
      muteAllBuzzers();

      // Còi kêu 2 tiếng bíp xác nhận hoàn tất kệ
      beepPin(SHELF_BUZZERS[idx], 80);
      delay(100);
      beepPin(SHELF_BUZZERS[idx], 150);

      showScreen("QUET XONG HANG!", String(SHELF_NAMES[idx]) + " [TAT DEN]", "Da nhat du so luong", "Cho mon tiep theo...", ">> Standby");
      currentTargetShelf = -1;
    }
    return;
  }

  // 4. LỆNH HOÀN TẤT TOÀN BỘ ĐƠN HÀNG (COMPLETE)
  if (action == "COMPLETE" || action == "RESET") {
    currentState = STATUS_IDLE;
    turnOffAllLeds();
    muteAllBuzzers();
    beepPin(PIN_DOOR_BUZZER, 250);
    currentTargetShelf = -1;
    showScreen("KHO LANH (WH-006)", "HOAN TAT DON HANG!", "Nhiet do: " + String(currentTemp, 1) + "C", "Do am:    " + String((int)currentHum) + "%", ">> Standby..");
    return;
  }
}

// ================= KẾT NỐI WIFI =================
void setupWiFi() {
  showScreen("KHO LANH (WH-006)", "Connecting WiFi...", stripAccents(String(WIFI_SSID)), "Vui long cho...");
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
    showScreen("WIFI CONNECTED!", "IP: " + WiFi.localIP().toString(), "Dang ket noi MQTT...", "");
    delay(1000);
  } else {
    Serial.println("\nWiFi Connection Failed! Running in Offline Mode.");
    showScreen("WIFI OFFLINE", "Kiem tra SSID/Pass", "He thong van hoat", "dong che do Manual!");
    delay(2000);
  }
}

// ================= KẾT NỐI MQTT BROKER =================
void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  while (!client.connected()) {
    String clientId = "CityMart-ColdNode-" + String(random(0xffff), HEX);
    Serial.print("Connecting to MQTT Broker: ");
    Serial.println(MQTT_SERVER);

    if (client.connect(clientId.c_str())) {
      Serial.println(">> MQTT CONNECTED!");
      client.subscribe(TOPIC_COMMAND_WH006);
      client.subscribe(TOPIC_COMMAND_GV);

      showScreen("KHO LANH (WH-006)", "MQTT Connected!", "Node: " + clientId.substring(0, 16), "San sang nhan don!");
      beepPin(PIN_DOOR_BUZZER, 100);
      delay(1200);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Thử lại sau 3s...");
      delay(3000);
      break; // Thoát ra loop để không bị treo mạch
    }
  }
}

// ================= SETUP PHẦN CỨNG =================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=============================================");
  Serial.println("  CITYMART KHO LẠNH WH-006 - KHỞI ĐỘNG HỆ THỐNG ");
  Serial.println("=============================================");

  // 1. Cấu hình chân LED (OUTPUT)
  pinMode(PIN_DOOR_LED, OUTPUT);
  for (int i = 0; i < 3; i++) {
    pinMode(SHELF_LEDS[i], OUTPUT);
  }
  turnOffAllLeds();

  // 2. Cấu hình chân Còi BUZZER (OUTPUT)
  pinMode(PIN_DOOR_BUZZER, OUTPUT);
  for (int i = 0; i < 3; i++) {
    pinMode(SHELF_BUZZERS[i], OUTPUT);
  }
  muteAllBuzzers();

  // 3. Cấu hình chân Nút bấm (INPUT_PULLUP)
  pinMode(PIN_DOOR_BTN, INPUT_PULLUP);
  for (int i = 0; i < 3; i++) {
    pinMode(SHELF_BTNS[i], INPUT_PULLUP);
  }

  // 4. Khởi động giao tiếp I2C cho OLED & SHT30
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // 5. Khởi động màn hình OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[OLED] Không tìm thấy OLED SSD1306 tại 0x3C!"));
  } else {
    display.clearDisplay();
    showScreen("CITYMART IOT", "Kho Lanh (WH-006)", "Chuan: 0C ~ 4C", "Khoi dong he thong...");
  }

  // 6. Test đọc thử cảm biến SHT30
  float tTest, hTest;
  if (readSHT30(tTest, hTest)) {
    shtConnected = true;
    currentTemp = tTest;
    currentHum = hTest;
    Serial.println(">> [SHT30] Kết nối thành công! T: " + String(currentTemp, 1) + "°C | H: " + String(currentHum, 1) + "%");
  } else {
    Serial.println(">> [SHT30] Chưa phát hiện cảm biến tại 0x44 (Đang dùng giá trị mô phỏng an toàn 2.5°C)");
  }

  // 7. Bíp khởi động kiểm tra còi
  beepPin(PIN_DOOR_BUZZER, 80);

  // 8. Kết nối WiFi & MQTT
  setupWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
}

// ================= LOOP VÒNG LẶP CHÍNH =================
void loop() {
  // Duy trì kết nối MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      reconnectMQTT();
    }
    client.loop();
  }

  unsigned long currentMillis = millis();

  // ----------------------------------------------------
  // 1. ĐIỀU KHIỂN NHÁY ĐÈN KHI ĐANG ĐỊNH VỊ TÌM KỆ
  // ----------------------------------------------------
  if (currentState == STATUS_LOCATING && currentTargetShelf >= 0 && currentTargetShelf < 3) {
    if (currentMillis - lastBlinkTime >= BLINK_INTERVAL) {
      lastBlinkTime = currentMillis;
      blinkState = !blinkState;
      setLed(SHELF_LEDS[currentTargetShelf], blinkState);
    }
  }

  // ----------------------------------------------------
  // 2. QUÉT VÀ XỬ LÝ NÚT BẤM TẠI 3 KỆ & CỬA PHÒNG
  // ----------------------------------------------------
  int pressed = scanButtons();
  if (pressed != lastPressed) {
    lastDebounceTime = currentMillis;
  }

  if ((currentMillis - lastDebounceTime) > DEBOUNCE_DELAY) {
    if (pressed != -1) {
      // TRƯỜNG HỢP A: BẤM NÚT MASTER CỬA PHÒNG
      if (pressed == -99) {
        if (isClimateAlarm) {
          // Bấm nút cửa để TẮT TIẾNG BÁO ĐỘNG (MUTE)
          alarmMuted = !alarmMuted;
          muteStartTime = currentMillis;
          muteAllBuzzers();
          Serial.println(alarmMuted ? "\n[MUTE] Nhan vien an nut cua: Tat coi tam thoi!" : "\n[UNMUTE] Bat lai coi bao dong!");
          beepPin(PIN_DOOR_BUZZER, 80);
        } else if (currentState == STATUS_LOCATING && currentTargetShelf >= 0) {
          pressed = currentTargetShelf; // Cho phép Quick Check-in tại cửa
        }
      }

      // TRƯỜNG HỢP B: BẤM NÚT TẠI KỆ HÀNG KHI ĐANG TÌM KIẾM
      if (currentState == STATUS_LOCATING) {
        // Bấm ĐÚNG nút của kệ đang tìm!
        if (pressed == currentTargetShelf) {
          Serial.println("\n✅ [CHECK-IN THÀNH CÔNG] Đã đến đúng Kệ " + String(SHELF_NAMES[currentTargetShelf]));

          muteAllBuzzers();
          beepPin(SHELF_BUZZERS[currentTargetShelf], 120);

          currentState = STATUS_ARRIVED;
          setLed(SHELF_LEDS[currentTargetShelf], true); // Đèn chuyển sang SÁNG ĐỨNG

          // Bắn MQTT thông báo nhân viên đã đến kệ
          DynamicJsonDocument evDoc(256);
          evDoc["event"] = "STAFF_ARRIVED";
          evDoc["warehouseCode"] = "WH-006";
          evDoc["zone"] = "ZONE MAT (COLD)";
          evDoc["shelfCode"] = SHELF_NAMES[currentTargetShelf];
          evDoc["message"] = "Nhan vien da check-in tai " + String(SHELF_NAMES[currentTargetShelf]);
          evDoc["timestamp"] = currentMillis;

          char buf[256];
          serializeJson(evDoc, buf);
          if (client.connected()) {
            client.publish(TOPIC_EVENT_WH006, buf);
            client.publish(TOPIC_EVENT_GV, buf);
          }

          showScreen("DA DEN: " + String(SHELF_NAMES[currentTargetShelf]), "Check-in thanh cong!", "Moi quet Barcode hang..", "[DEN SANG DUNG]", ">> Dang soan hang");
        }
        // Bấm NHẦM nút kệ khác!
        else if (pressed >= 0 && pressed < 3 && pressed != currentTargetShelf) {
          Serial.println("\n❌ [CẢNH BÁO BẤM SAI KỆ] Bấm nhầm Kệ " + String(SHELF_NAMES[pressed]));
          beepPin(SHELF_BUZZERS[pressed], 250); // Còi kệ bấm nhầm kêu cảnh báo

          showScreen("CANH BAO SAI KE!", "Ban bam: " + String(SHELF_NAMES[pressed]), "Don hang o: " + String(SHELF_NAMES[currentTargetShelf]), "Vui long di dung ke!", ">> [COI CANH BAO]");
          delay(1200);

          // Khôi phục lại màn hình tìm kệ
          String header = "TIM KE: " + String(SHELF_NAMES[currentTargetShelf]);
          String l1 = "SP: " + stripAccents(currentProduct);
          String l2 = "SL: " + String(currentQty) + " mon [DANG NHAY]";
          String l3 = "T:" + String(currentTemp, 1) + "C | H:" + String((int)currentHum) + "%";
          showScreen(header, l1, l2, l3, ">> Hay an nut tai ke!");
        }
      }
    }
  }
  lastPressed = pressed;

  // ----------------------------------------------------
  // 3. ĐỌC CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM SHT30 ĐỊNH KỲ
  // ----------------------------------------------------
  if (currentMillis - lastShtReadTime >= SHT_READ_INTERVAL) {
    lastShtReadTime = currentMillis;
    float t, h;
    if (readSHT30(t, h)) {
      currentTemp = t;
      currentHum = h;
      shtConnected = true;
    }

    // Đánh giá vi phạm chuẩn nhiệt độ Kho Lạnh (0°C ~ 4.5°C, Độ ẩm 50% ~ 85%)
    bool breach = (currentTemp > 4.5 || currentTemp < 0.0 || currentHum > 85.0 || currentHum < 50.0);

    if (breach) {
      if (!isClimateAlarm) {
        Serial.println("\n🚨 [CẢNH BÁO KHO LẠNH] NHIỆT ĐỘ / ĐỘ ẨM VƯỢT NGƯỠNG AN TOÀN!");
        Serial.println("   T: " + String(currentTemp, 1) + "°C | H: " + String(currentHum, 1) + "%");
      }
      isClimateAlarm = true;
    } else {
      if (isClimateAlarm) {
        Serial.println("\n✅ [KHO LẠNH PHỤC HỒI] Nhiệt ẩm đã trở về bình thường.");
        display.invertDisplay(false);
        muteAllBuzzers();
        turnOffAllLeds();
        beepPin(PIN_DOOR_BUZZER, 100);
      }
      isClimateAlarm = false;
      alarmMuted = false;
    }

    // Khi hệ thống rảnh và môi trường an toàn: Cập nhật màn hình giám sát Dashboard
    if (currentState == STATUS_IDLE && !isClimateAlarm) {
      display.invertDisplay(false);
      String header = "KHO LANH: " + String(currentTemp, 1) + "C | " + String((int)currentHum) + "%";
      String l1 = "A1-Thit (0-4C): " + String((currentTemp >= 0 && currentTemp <= 4) ? "[AN TOAN]" : "[CANH BAO]");
      String l2 = "A2-Sua  (2-6C): " + String((currentTemp >= 2 && currentTemp <= 6) ? "[AN TOAN]" : "[CANH BAO]");
      String l3 = "A3-Rau  (2-8C): " + String((currentTemp >= 2 && currentTemp <= 8) ? "[AN TOAN]" : "[CANH BAO]");
      showScreen(header, l1, l2, l3, ">> 3 Ke A1..A3 [San sang]");
    }
  }

  // ----------------------------------------------------
  // 4. XỬ LÝ BÁO ĐỘNG KHI VƯỢT NGƯỠNG AN TOÀN
  // ----------------------------------------------------
  if (isClimateAlarm) {
    if (currentMillis - lastAlarmTime >= ALARM_INTERVAL) {
      lastAlarmTime = currentMillis;
      alarmBlinkState = !alarmBlinkState;

      // Đảo màu màn hình OLED liên tục (Strobe Effect)
      display.invertDisplay(alarmBlinkState);

      // Còi báo động cửa và còi kệ hú nhịp nhàng
      if (!alarmMuted) {
        soundBuzzer(PIN_DOOR_BUZZER, alarmBlinkState);
        for (int i = 0; i < 3; i++) {
          soundBuzzer(SHELF_BUZZERS[i], alarmBlinkState);
        }
      } else {
        muteAllBuzzers();
        if (currentMillis - muteStartTime > MUTE_DURATION) {
          alarmMuted = false; // Tự bật lại còi nếu vẫn chưa xử lý xong sau 20s
        }
      }

      // Nháy đèn LED cảnh báo
      if (currentState != STATUS_LOCATING && currentState != STATUS_ARRIVED) {
        setLed(PIN_DOOR_LED, alarmBlinkState);
        for (int i = 0; i < 3; i++) {
          setLed(SHELF_LEDS[i], alarmBlinkState);
        }
      }

      // Vẽ thông số báo động lên OLED
      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 0);
      display.println("! BAO DONG KHO LANH !");
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

      display.setCursor(0, 13);
      display.println("T: " + String(currentTemp, 1) + "C >> " + String(currentTemp > 4.5 ? "[QUA NHIET!]" : "[DONG BANG!]"));
      display.setCursor(0, 25);
      display.println("H: " + String(currentHum, 1) + "% >> " + String(currentHum > 85.0 ? "[AM QUA CAO!]" : "[QUA KHO!]"));
      display.setCursor(0, 37);
      display.println("NGUY CO: HONG THUC PHAM");
      display.setCursor(0, 50);
      display.println(alarmMuted ? "[DA TAT COI 20S]" : ">> AN NUT CUA DE TAT COI");
      display.display();
    }
  }

  // ----------------------------------------------------
  // 5. GỬI MQTT TELEMETRY GIÁM SÁT MÔI TRƯỜNG KHO LẠNH
  // ----------------------------------------------------
  if (currentMillis - lastTelemTime >= TELEM_INTERVAL) {
    lastTelemTime = currentMillis;

    if (client.connected()) {
      DynamicJsonDocument tDoc(512);
      tDoc["warehouseCode"] = "WH-006";
      tDoc["room"] = "PHONG_KHO_LANH";
      tDoc["zone"] = "COLD";
      tDoc["temperature"] = round(currentTemp * 10) / 10.0;
      tDoc["humidity"] = round(currentHum * 10) / 10.0;
      tDoc["status"] = isClimateAlarm ? "VIOLATION" : "NORMAL";
      tDoc["timestamp"] = currentMillis;

      JsonObject standards = tDoc.createNestedObject("productStandards");
      standards["A1_Meat_CP"] = (currentTemp >= 0.0 && currentTemp <= 4.0) ? "SAFE (0-4C)" : "BREACH";
      standards["A2_Milk_DaLat"] = (currentTemp >= 2.0 && currentTemp <= 6.0) ? "SAFE (2-6C)" : "BREACH";
      standards["A3_Veggie_VietGAP"] = (currentTemp >= 2.0 && currentTemp <= 8.0) ? "SAFE (2-8C)" : "BREACH";

      char telemBuf[512];
      serializeJson(tDoc, telemBuf);
      client.publish(TOPIC_TELEMETRY, telemBuf);
      client.publish("warehouse/COLD/temperature", String(currentTemp, 1).c_str());
      client.publish("warehouse/COLD/humidity", String(currentHum, 1).c_str());
    }
  }
}

