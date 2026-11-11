#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🏢 CITYMART SMART WAREHOUSE - TEST ĐÈN THEO THỨ TỰ 1, 2, 3 (WH-006)
// KỊCH BẢN CHUẨN THEO YÊU CẦU:
//   1. Ban đầu: Đèn nháy theo thứ tự 1 -> 2 -> 3 liên tục.
//   2. Khi BẤM NÚT (bất kỳ nút nào hoặc nút BOOT GPIO 0 trên ESP32):
//      👉 ĐÈN 1 TẮT NGAY LẬP TỨC!
//      👉 Đèn 2 và Đèn 3 tiếp tục nháy.
//   3. Đúng 5 GIÂY SAU:
//      👉 ĐÈN 2 TẮT!
//      👉 Chỉ còn Đèn 3 nháy.
//   4. Đúng 5 GIÂY TIẾP THEO:
//      👉 TỚI ĐÈN 3 TẮT!
//   5. RỒI HẾT! Tất cả các đèn tắt hoàn toàn, kết thúc chu trình test.
//      (Bấm nút lần nữa nếu muốn chạy lại từ đầu).
// =========================================================================

// ================= CẤU HÌNH WIFI & MQTT =================
const char* WIFI_SSID     = "Bao Hoa";        // WiFi 2.4GHz
const char* WIFI_PASSWORD = "hoabao8420";     // Mật khẩu WiFi

const char* MQTT_SERVER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

const char* TOPIC_COMMAND_WH006   = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_COMMAND_GV      = "citymart/warehouse/GV/picking/command";
const char* TOPIC_EVENT_WH006     = "citymart/warehouse/WH-006/picking/event";
const char* TOPIC_EVENT_GV        = "citymart/warehouse/GV/picking/event";
const char* TOPIC_TELEMETRY_GEN   = "citymart/warehouse/GV/environment/telemetry";
const char* TOPIC_TELEMETRY_COLD  = "citymart/warehouse/GV/zone/COLD/telemetry";
const char* TOPIC_TEMP_RAW        = "warehouse/COLD/temperature";
const char* TOPIC_HUM_RAW         = "warehouse/COLD/humidity";

// ================= SƠ ĐỒ CHÂN PHẦN CỨNG (GPIO MAPPING) =================
// 1. I2C Bus (OLED + SHT30)
#define I2C_SDA_PIN     21  // SDA
#define I2C_SCL_PIN     22  // SCL

#define OLED_ADDR       0x3C
#define SHT30_ADDR      0x44

#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// 2. Chân Nút Bấm / Công Tắc (INPUT_PULLUP)
#define PIN_DOOR_BTN    32  // Nút Cửa Phòng / Master
#define PIN_A1_BTN      33  // Nút Kệ 1 (A1)
#define PIN_A2_BTN      14  // Nút Kệ 2 (A2)
#define PIN_A3_BTN      13  // Nút Kệ 3 (A3)
#define PIN_ESP_BOOT    0   // Nút BOOT có sẵn trên ESP32

// 3. Chân Đèn LED
#define PIN_DOOR_LED    4   // LED Cửa Phòng
#define PIN_A1_LED      25  // LED 1 (Kệ A1 - Đỏ)
#define PIN_A2_LED      26  // LED 2 (Kệ A2 - Xanh Dương)
#define PIN_A3_LED      27  // LED 3 (Kệ A3 - Xanh Lá)

// 4. Chân Còi Buzzer
#define PIN_DOOR_BUZZER 23  // Còi Cửa
#define PIN_A1_BUZZER   19  // Còi 1
#define PIN_A2_BUZZER   18  // Còi 2
#define PIN_A3_BUZZER   5   // Còi 3

const int BTN_PINS[4]        = { PIN_DOOR_BTN,    PIN_A1_BTN,    PIN_A2_BTN,    PIN_A3_BTN };
const int LED_PINS[4]        = { PIN_DOOR_LED,    PIN_A1_LED,    PIN_A2_LED,    PIN_A3_LED };
const int BUZ_PINS[4]        = { PIN_DOOR_BUZZER, PIN_A1_BUZZER, PIN_A2_BUZZER, PIN_A3_BUZZER };
const char* CHANNEL_NAMES[4] = { "CUA KHO", "DEN 1 (A1)", "DEN 2 (A2)", "DEN 3 (A3)" };
const char* ITEM_NAMES[4]    = { "Cua kho", "Thit tuoi CP", "Sua Da Lat", "Rau VietGAP" };

// ================= TRẠNG THÁI CHU TRÌNH TEST =================
enum TestStepState {
  STATE_ALL_BLINKING,   // Ban đầu: Đèn 1, 2, 3 nháy đuổi theo thứ tự
  STATE_WAITING_OFF_2,  // Đèn 1 đã tắt, đang đếm 5 giây để tắt Đèn 2 (Đèn 2, 3 đang nháy)
  STATE_WAITING_OFF_3,  // Đèn 2 đã tắt, đang đếm 5 giây để tắt Đèn 3 (Chỉ Đèn 3 nháy)
  STATE_ALL_FINISHED    // Tới Đèn 3 tắt -> RỒI HẾT! Tất cả đèn tắt hoàn tất.
};

TestStepState testState = STATE_ALL_BLINKING;
bool ledActive[4]       = { false, true, true, true }; // index 1, 2, 3 đang bật

unsigned long stateStartTime       = 0;
unsigned long lastBlinkStepTime    = 0;
int currentBlinkIndex              = 1; // Đèn đang bật trong nhịp nháy (1, 2, 3)
const unsigned long BLINK_INTERVAL = 200; // Tốc độ nháy đuổi 200ms
const unsigned long COOLDOWN_5S    = 5000; // Nghỉ đúng 5 giây giữa các lần tắt

unsigned long lastOledUpdateTime   = 0;
bool lastAnyButtonPressed          = false;

// Cảm biến SHT30 & MQTT
float currentTemp = 0.0;
float currentHum  = 0.0;
bool isSensorOK   = false;
bool isAlarm      = false;
unsigned long lastReadTime = 0;
unsigned long lastMqttTime = 0;

WiFiClient espClient;
PubSubClient client(espClient);

// ================= TẮT TẤT CẢ ĐÈN VÀ CÒI =================
void muteAll() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(LED_PINS[i], LOW);
    digitalWrite(BUZ_PINS[i], LOW);
  }
}

// ================= KHỞI ĐỘNG LẠI CHU TRÌNH TEST =================
void resetTestCycle() {
  ledActive[1] = true;
  ledActive[2] = true;
  ledActive[3] = true;
  testState = STATE_ALL_BLINKING;
  stateStartTime = millis();
  currentBlinkIndex = 1;
  Serial.println("\n🔄 [RESET TEST] Bắt đầu lại chu trình: Đèn nháy 1 -> 2 -> 3");
}

// ================= ĐỌC CẢM BIẾN SHT30 =================
bool readSHT30(float &temp, float &hum) {
  Wire.beginTransmission(SHT30_ADDR);
  Wire.write(0x2C);
  Wire.write(0x06);
  if (Wire.endTransmission() != 0) return false;

  delay(15);
  Wire.requestFrom((uint8_t)SHT30_ADDR, (uint8_t)6);
  if (Wire.available() == 6) {
    uint8_t data[6];
    for (int i = 0; i < 6; i++) data[i] = Wire.read();
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

// ================= CẬP NHẬT MÀN HÌNH OLED =================
void updateOLEDDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // 1. GIAI ĐOẠN 1: CẢ 3 ĐÈN ĐANG NHÁY THEO THỨ TỰ 1, 2, 3
  if (testState == STATE_ALL_BLINKING) {
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("TEST NHAY DEN 1, 2, 3");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

    display.setCursor(0, 14);
    display.print("Thu tu nhay: 1->2->3");

    display.setTextSize(2);
    display.setCursor(8, 28);
    display.print("DEN ");
    display.print(currentBlinkIndex);
    display.print(" SANG");

    display.setTextSize(1);
    display.setCursor(0, 48);
    display.print(">> BAM NUT DE TAT 1!");
    display.setCursor(0, 56);
    display.print("(5s sau tat 2, roi 3)");
  }
  // 2. GIAI ĐOẠN 2: ĐÈN 1 ĐÃ TẮT -> ĐẾM 5S ĐỂ TẮT ĐÈN 2
  else if (testState == STATE_WAITING_OFF_2) {
    unsigned long elapsed = millis() - stateStartTime;
    int remainSec = (COOLDOWN_5S > elapsed) ? (int)((COOLDOWN_5S - elapsed + 999) / 1000) : 0;

    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print(">> DA TAT: DEN 1");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

    display.setCursor(0, 13);
    display.print("Con lai nhay: DEN 2, 3");

    display.setCursor(0, 25);
    display.print("5s sau TAT DEN 2:");

    display.setTextSize(3);
    display.setCursor(40, 36);
    display.print(remainSec);
    display.setTextSize(2);
    display.print(" s");
  }
  // 3. GIAI ĐOẠN 3: ĐÈN 2 ĐÃ TẮT -> ĐẾM 5S ĐỂ TỚI ĐÈN 3 TẮT
  else if (testState == STATE_WAITING_OFF_3) {
    unsigned long elapsed = millis() - stateStartTime;
    int remainSec = (COOLDOWN_5S > elapsed) ? (int)((COOLDOWN_5S - elapsed + 999) / 1000) : 0;

    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print(">> DA TAT: DEN 1 & 2");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

    display.setCursor(0, 13);
    display.print("Con lai nhay: DEN 3");

    display.setCursor(0, 25);
    display.print("5s sau TOI DEN 3:");

    display.setTextSize(3);
    display.setCursor(40, 36);
    display.print(remainSec);
    display.setTextSize(2);
    display.print(" s");
  }
  // 4. GIAI ĐOẠN 4: TỚI ĐÈN 3 RỒI HẾT! (TẤT CẢ ĐÃ TẮT HOÀN TOÀN)
  else if (testState == STATE_ALL_FINISHED) {
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("=====================");
    display.setCursor(14, 10);
    display.setTextSize(1);
    display.print(">> HOAN TAT TEST <<");
    display.drawLine(0, 21, 127, 21, SSD1306_WHITE);

    display.setTextSize(2);
    display.setCursor(10, 26);
    display.print("ROI HET !");

    display.setTextSize(1);
    display.setCursor(0, 46);
    display.print("Da tat ca 3 den 1,2,3");
    display.setCursor(0, 56);
    display.print("Bam nut: Chay lai");
  }

  display.display();
}

// ================= GỬI SỰ KIỆN LÊN MQTT =================
void publishEvent(const char* eventName, int channel, const char* note) {
  if (!client.connected()) return;

  DynamicJsonDocument doc(256);
  doc["event"]         = eventName;
  doc["warehouseCode"] = "WH-006";
  doc["shelfCode"]     = CHANNEL_NAMES[channel];
  doc["message"]       = note;
  doc["timestamp"]     = millis();

  char buf[256];
  serializeJson(doc, buf);
  client.publish(TOPIC_EVENT_WH006, buf);
  client.publish(TOPIC_EVENT_GV, buf);
}

// ================= XỬ LÝ LỆNH MQTT =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) return;

  String action = doc["action"] | "";
  if (action == "LOCATE" || action == "TEST" || action == "START") {
    resetTestCycle();
  }
}

// ================= KẾT NỐI WIFI =================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Dang ket noi WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(250);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n🎉 WiFi Da Ket Noi! IP: " + WiFi.localIP().toString());
  }
}

// ================= KẾT NỐI MQTT =================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED || client.connected()) return;
  String clientId = "CityMart-PickLight-" + String(random(0xffff), HEX);
  if (client.connect(clientId.c_str())) {
    Serial.println("✅ MQTT Da Ket Noi!");
    client.subscribe(TOPIC_COMMAND_WH006);
    client.subscribe(TOPIC_COMMAND_GV);
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=======================================================");
  Serial.println("  CITYMART WH-006: TEST NHÁY ĐÈN THEO THỨ TỰ 1, 2, 3   ");
  Serial.println("=======================================================");
  Serial.println("👉 KỊCH BẢN: Đèn nháy 1,2,3 -> Bấm: Đèn 1 tắt -> 5s sau Đèn 2 tắt -> 5s sau tới Đèn 3 tắt -> RỒI HẾT!");

  // 1. Cấu hình chân nút bấm
  for (int i = 0; i < 4; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(PIN_ESP_BOOT, INPUT_PULLUP); // Nút BOOT GPIO 0

  // 2. Cấu hình chân LED & Còi
  for (int i = 0; i < 4; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);

    pinMode(BUZ_PINS[i], OUTPUT);
    digitalWrite(BUZ_PINS[i], LOW);
  }

  // 3. I2C Bus & OLED
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 15);
    display.println("CITYMART WH-006");
    display.setCursor(10, 32);
    display.println("TEST NHAY DEN 1,2,3");
    display.setCursor(10, 48);
    display.println("Nhan nut de bat dau");
    display.display();
    delay(1000);
  }

  connectWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);

  resetTestCycle();
}

// ================= LOOP =================
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) connectMQTT();
    client.loop();
  }

  unsigned long currentMillis = millis();

  // ------------------------------------------------------------------
  // 1. QUÉT NÚT BẤM (BẤT KỲ NÚT NÀO HOẶC NÚT BOOT TRÊN ESP32)
  // ------------------------------------------------------------------
  bool anyButtonPressed = false;
  int pressedPin = -1;

  for (int i = 0; i < 4; i++) {
    if (digitalRead(BTN_PINS[i]) == LOW) {
      anyButtonPressed = true;
      pressedPin = BTN_PINS[i];
      break;
    }
  }
  if (digitalRead(PIN_ESP_BOOT) == LOW) {
    anyButtonPressed = true;
    pressedPin = PIN_ESP_BOOT;
  }

  // PHÁT HIỆN CẠNH NHẤN NÚT
  if (anyButtonPressed && !lastAnyButtonPressed) {
    delay(35); // Chống rung phím

    // 👉 BƯỚC 1: ĐANG NHÁY 1, 2, 3 -> BẤM NÚT THÌ ĐÈN 1 TẮT NGAY LẬP TỨC!
    if (testState == STATE_ALL_BLINKING) {
      ledActive[1] = false; // Tắt Đèn 1 ngay lập tức!
      digitalWrite(LED_PINS[1], LOW);
      digitalWrite(BUZ_PINS[1], LOW);

      testState      = STATE_WAITING_OFF_2; // Chuyển sang chờ 5s để tắt Đèn 2
      stateStartTime = millis();

      Serial.println("\n---------------------------------------------------");
      Serial.print("✅ [ĐÃ BẤM NÚT (GPIO "); Serial.print(pressedPin); Serial.println(")] ĐÈN 1 ĐÃ TẮT NGAY LẬP TỨC!");
      Serial.println("⏳ Đèn 2 và 3 vẫn nháy. Đếm đúng 5 giây nữa sẽ tắt Đèn 2...");
      Serial.println("---------------------------------------------------");

      publishEvent("LED1_OFF", 1, "Da bam nut: Den 1 tat, 5s sau tat den 2");
      updateOLEDDisplay();
    }
    // NẾU NGƯỜI DÙNG BẤM TIẾP KHI ĐANG ĐỢI TẮT ĐÈN 2 -> TẮT ĐÈN 2 LUÔN
    else if (testState == STATE_WAITING_OFF_2) {
      ledActive[2] = false;
      digitalWrite(LED_PINS[2], LOW);
      digitalWrite(BUZ_PINS[2], LOW);

      testState      = STATE_WAITING_OFF_3;
      stateStartTime = millis();

      Serial.println("✅ [BẤM NÚT NHANH] Đèn 2 đã tắt! Đếm 5s nữa sẽ tới Đèn 3 tắt...");
      updateOLEDDisplay();
    }
    // NẾU NGƯỜI DÙNG BẤM TIẾP KHI ĐANG ĐỢI TẮT ĐÈN 3 -> TẮT ĐÈN 3 LUÔN
    else if (testState == STATE_WAITING_OFF_3) {
      ledActive[3] = false;
      muteAll();
      testState = STATE_ALL_FINISHED;

      Serial.println("🎉 [BẤM NÚT NHANH] Tới Đèn 3 đã tắt! RỒI HẾT!");
      updateOLEDDisplay();
    }
    // NẾU ĐÃ HẾT RỒI MÀ BẤM NÚT -> CHẠY LẠI CHU TRÌNH TEST!
    else if (testState == STATE_ALL_FINISHED) {
      resetTestCycle();
      updateOLEDDisplay();
    }
  }

  lastAnyButtonPressed = anyButtonPressed;

  // ------------------------------------------------------------------
  // 2. ĐIỀU KHIỂN NHÁY ĐÈN THEO THỨ TỰ (BLINK ENGINE)
  // ------------------------------------------------------------------
  if (testState != STATE_ALL_FINISHED) {
    if (currentMillis - lastBlinkStepTime >= BLINK_INTERVAL) {
      lastBlinkStepTime = currentMillis;

      // Tìm đèn kế tiếp còn đang active (1 -> 2 -> 3 -> 1...)
      int nextBlink = currentBlinkIndex;
      for (int t = 0; t < 3; t++) {
        nextBlink = (nextBlink % 3) + 1; // 1 -> 2 -> 3 -> 1
        if (ledActive[nextBlink]) {
          currentBlinkIndex = nextBlink;
          break;
        }
      }

      // Xuất tín hiệu: Chỉ bật Đèn đang đến lượt, tất cả đèn khác tắt
      for (int i = 1; i <= 3; i++) {
        if (ledActive[i] && i == currentBlinkIndex) {
          digitalWrite(LED_PINS[i], HIGH);
          // Còi kêu nhịp ngắn đồng bộ theo đèn
          digitalWrite(BUZ_PINS[i], HIGH);
        } else {
          digitalWrite(LED_PINS[i], LOW);
          digitalWrite(BUZ_PINS[i], LOW);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. XỬ LÝ HẸN GIỜ 5 GIÂY TỰ ĐỘNG THEO KỊCH BẢN
  // ------------------------------------------------------------------
  // 👉 5 GIÂY SAU KHI ĐÈN 1 TẮT -> ĐÈN 2 TẮT!
  if (testState == STATE_WAITING_OFF_2) {
    if (currentMillis - stateStartTime >= COOLDOWN_5S) {
      ledActive[2] = false; // Đèn 2 TẮT!
      digitalWrite(LED_PINS[2], LOW);
      digitalWrite(BUZ_PINS[2], LOW);

      testState      = STATE_WAITING_OFF_3; // Chuyển sang chờ 5s để tới Đèn 3 tắt
      stateStartTime = currentMillis;

      Serial.println("\n---------------------------------------------------");
      Serial.println("⏰ [HẾT 5 GIÂY] ĐÈN 2 ĐÃ TẮT!");
      Serial.println("⏳ Chỉ còn Đèn 3 nháy. Đếm đúng 5 giây nữa tới Đèn 3 tắt rồi hết...");
      Serial.println("---------------------------------------------------");

      publishEvent("LED2_OFF", 2, "Het 5s: Den 2 da tat");
      updateOLEDDisplay();
    }
  }
  // 👉 5 GIÂY SAU KHI ĐÈN 2 TẮT -> TỚI ĐÈN 3 TẮT RỒI HẾT!
  else if (testState == STATE_WAITING_OFF_3) {
    if (currentMillis - stateStartTime >= COOLDOWN_5S) {
      ledActive[3] = false; // Đèn 3 TẮT!
      muteAll();            // TẤT CẢ TẮT HOÀN TOÀN!

      testState = STATE_ALL_FINISHED; // RỒI HẾT!

      Serial.println("\n===================================================");
      Serial.println("🎉 [HẾT 5 GIÂY NỮA] TỚI ĐÈN 3 ĐÃ TẮT! RỒI HẾT!");
      Serial.println("👉 Cả 3 đèn 1, 2, 3 đã tắt hoàn toàn. Chu trình test kết thúc.");
      Serial.println("👉 (Bấm nút bất kỳ nếu bạn muốn chạy lại)");
      Serial.println("===================================================");

      publishEvent("LED3_OFF_FINISHED", 3, "Toi den 3 tat: Roi het tat ca!");
      updateOLEDDisplay();
    }
  }

  // ------------------------------------------------------------------
  // 4. CẬP NHẬT MÀN HÌNH OLED (MỖI 150ms để số đếm lùi mượt mà)
  // ------------------------------------------------------------------
  if (currentMillis - lastOledUpdateTime >= 150) {
    lastOledUpdateTime = currentMillis;
    updateOLEDDisplay();
  }

  // ------------------------------------------------------------------
  // 5. ĐỌC CẢM BIẾN SHT30 & MQTT TELEMETRY (ĐỊNH KỲ)
  // ------------------------------------------------------------------
  if (currentMillis - lastReadTime >= 2000) {
    lastReadTime = currentMillis;
    float t, h;
    if (readSHT30(t, h)) {
      currentTemp = t;
      currentHum  = h;
      isSensorOK  = true;
      isAlarm     = (currentTemp > 4.5 || currentTemp < 0.0 || currentHum > 85.0 || currentHum < 50.0);
    } else {
      isSensorOK = false;
    }
  }

  if (currentMillis - lastMqttTime >= 5000) {
    lastMqttTime = currentMillis;
    if (client.connected() && isSensorOK) {
      DynamicJsonDocument doc(512);
      doc["warehouseCode"] = "WH-006";
      doc["room"]          = "PHONG_KHO_LANH";
      doc["zone"]          = "COLD";
      doc["temperature"]   = round(currentTemp * 10) / 10.0;
      doc["humidity"]      = round(currentHum * 10) / 10.0;
      doc["status"]        = isAlarm ? "VIOLATION" : "NORMAL";
      doc["timestamp"]     = currentMillis;

      char buf[512];
      serializeJson(doc, buf);
      client.publish(TOPIC_TELEMETRY_GEN, buf);
      client.publish(TOPIC_TELEMETRY_COLD, buf);
      client.publish(TOPIC_TEMP_RAW, String(currentTemp, 1).c_str());
      client.publish(TOPIC_HUM_RAW, String(currentHum, 1).c_str());
    }
  }
}
