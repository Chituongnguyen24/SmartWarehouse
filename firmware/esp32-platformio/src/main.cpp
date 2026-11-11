#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🏢 CITYMART SMART WAREHOUSE - PICKING LIGHT SYSTEM (WH-006)
//
//  SA BÀN THỰC TẾ:
//    ┌──────────────────────────────────────────────┐
//    │  [CỬA PHÒNG] [KỆ A1-Thịt] [KỆ A2-Sữa] [KỆ A3-Rau]  │
//    └──────────────────────────────────────────────┘
//
//  LUỒNG HOẠT ĐỘNG:
//    1. Web Dashboard gửi MQTT lệnh LOCATE tới ESP32
//       → Chỉ ra kệ nào cần lấy hàng
//    2. ESP32 bật đèn + còi kệ được chỉ định (picking light)
//    3. Nhân viên kho đến bấm nút "Check-In" tại kệ
//    4. ESP32 tắt đèn, gửi event CONFIRMED về MQTT
//    5. Web Dashboard nhận event → cập nhật trạng thái đơn hàng
//
//  MQTT TOPICS:
//    Subscribe (nhận lệnh):
//      citymart/wh006/shelf/command     → {"action":"LOCATE","shelfCode":"A1","orderId":"...","qty":5}
//      citymart/wh006/system/command    → {"action":"RESET"} | {"action":"ALL_OFF"}
//
//    Publish (gửi sự kiện):
//      citymart/wh006/shelf/event       → {"event":"CONFIRMED","shelfCode":"A1","orderId":"...","timestamp":...}
//      citymart/wh006/environment       → {"temp":2.5,"hum":78,"status":"NORMAL","warehouseCode":"WH-006"}
// =========================================================================

// ================= CẤU HÌNH WIFI & MQTT =================
const char* WIFI_SSID     = "Bao Hoa";        // WiFi 2.4GHz
const char* WIFI_PASSWORD = "hoabao8420";     // Mật khẩu WiFi

const char* MQTT_SERVER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

// Topics mới (gọn, rõ ràng)
const char* TOPIC_CMD_SHELF  = "citymart/wh006/shelf/command";
const char* TOPIC_CMD_SYSTEM = "citymart/wh006/system/command";
const char* TOPIC_EVT_SHELF  = "citymart/wh006/shelf/event";
const char* TOPIC_ENV        = "citymart/wh006/environment";

// Topics cũ (giữ tương thích ngược)
const char* TOPIC_CMD_LEGACY = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_EVT_LEGACY = "citymart/warehouse/WH-006/picking/event";

// ================= SƠ ĐỒ CHÂN PHẦN CỨNG (GPIO MAPPING) =================
// 1. I2C Bus (OLED + SHT30)
#define I2C_SDA_PIN     21  // SDA
#define I2C_SCL_PIN     22  // SCL

#define OLED_ADDR       0x3C
#define SHT30_ADDR      0x44

#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// 2. Chân Nút Bấm Check-In (INPUT_PULLUP, bấm = LOW)
#define PIN_DOOR_BTN    32  // Nút Cửa Phòng
#define PIN_A1_BTN      33  // Nút Check-In Kệ A1 (Thịt CP)
#define PIN_A2_BTN      14  // Nút Check-In Kệ A2 (Sữa)
#define PIN_A3_BTN      13  // Nút Check-In Kệ A3 (Rau)
#define PIN_ESP_BOOT     0  // Nút BOOT (GPIO 0 có sẵn trên ESP32)

// 3. Chân Đèn LED Picking Light
#define PIN_DOOR_LED     4  // LED Cửa Phòng
#define PIN_A1_LED      25  // LED Kệ A1 — Đỏ (Thịt)
#define PIN_A2_LED      26  // LED Kệ A2 — Xanh Dương (Sữa)
#define PIN_A3_LED      27  // LED Kệ A3 — Xanh Lá (Rau)

// 4. Chân Còi Buzzer
#define PIN_DOOR_BUZZER 23  // Còi Cửa
#define PIN_A1_BUZZER   19  // Còi Kệ A1
#define PIN_A2_BUZZER   18  // Còi Kệ A2
#define PIN_A3_BUZZER    5  // Còi Kệ A3

// ================= INDEX MAPPING =================
// index: 0=Cửa, 1=A1(Thịt), 2=A2(Sữa), 3=A3(Rau)
const int   BTN_PINS[4]      = { PIN_DOOR_BTN,    PIN_A1_BTN,    PIN_A2_BTN,    PIN_A3_BTN    };
const int   LED_PINS[4]      = { PIN_DOOR_LED,     PIN_A1_LED,    PIN_A2_LED,    PIN_A3_LED    };
const int   BUZ_PINS[4]      = { PIN_DOOR_BUZZER,  PIN_A1_BUZZER, PIN_A2_BUZZER, PIN_A3_BUZZER };
const char* SHELF_CODES[4]   = { "DOOR",           "A1",          "A2",          "A3"          };
const char* SHELF_LABELS[4]  = { "Cua Kho",        "Thit tuoi CP","Sua Da Lat",  "Rau VietGAP" };

// ================= TRẠNG THÁI HỆ THỐNG =================
// Trạng thái mỗi kệ
struct ShelfState {
  bool  ledOn;          // Đèn đang sáng?
  bool  buzzerOn;       // Còi đang kêu?
  bool  waitingCheckin; // Đang chờ nhân viên check-in?
  char  orderId[32];    // Order ID đang xử lý
  int   qty;            // Số lượng cần lấy
  unsigned long activatedAt; // Thời điểm bật (ms)
};

ShelfState shelves[4] = {
  {false, false, false, "", 0, 0},
  {false, false, false, "", 0, 0},
  {false, false, false, "", 0, 0},
  {false, false, false, "", 0, 0},
};

// Nút bấm debounce
bool lastBtnState[4] = { true, true, true, true }; // HIGH = không bấm (INPUT_PULLUP)

// Môi trường
float currentTemp = 0.0;
float currentHum  = 0.0;
bool  isSensorOK  = false;
bool  isAlarm     = false;

// Timers
unsigned long lastReadTime    = 0;
unsigned long lastMqttTime    = 0;
unsigned long lastOledTime    = 0;
unsigned long lastBuzzTime    = 0;
bool          buzzPhase       = false; // dùng để blink còi

// MQTT
WiFiClient   espClient;
PubSubClient client(espClient);

// ================= HELPER: TẮT TẤT CẢ =================
void allOff() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(LED_PINS[i],  LOW);
    digitalWrite(BUZ_PINS[i],  LOW);
    shelves[i].ledOn          = false;
    shelves[i].buzzerOn       = false;
    shelves[i].waitingCheckin = false;
    shelves[i].orderId[0]     = '\0';
    shelves[i].qty            = 0;
  }
}

// ================= HELPER: TÌM INDEX TỪ SHELF CODE =================
int findShelfIndex(const char* code) {
  for (int i = 0; i < 4; i++) {
    if (strcmp(SHELF_CODES[i], code) == 0) return i;
  }
  return -1; // Không tìm thấy
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
    hum  = 100.0 * ((float)rawHum  / 65535.0);
    if (hum  > 100.0) hum  = 100.0;
    if (hum  < 0.0)   hum  = 0.0;
    return true;
  }
  return false;
}

// ================= GỬI SỰ KIỆN LÊN MQTT =================
void publishShelfEvent(const char* eventName, int idx, const char* note) {
  if (!client.connected()) return;

  DynamicJsonDocument doc(256);
  doc["event"]         = eventName;
  doc["shelfCode"]     = SHELF_CODES[idx];
  doc["shelfLabel"]    = SHELF_LABELS[idx];
  doc["orderId"]       = shelves[idx].orderId;
  doc["qty"]           = shelves[idx].qty;
  doc["warehouseCode"] = "WH-006";
  doc["message"]       = note;
  doc["timestamp"]     = millis();

  char buf[256];
  serializeJson(doc, buf);
  client.publish(TOPIC_EVT_SHELF, buf);
  client.publish(TOPIC_EVT_LEGACY, buf);  // backward compat

  Serial.printf("📡 [MQTT TX] %s → %s (order=%s)\n",
                eventName, SHELF_CODES[idx], shelves[idx].orderId);
}

// ================= KÍCH HOẠT KỆ (BẬT ĐÈN + CÒI) =================
void activateShelf(int idx, const char* orderId, int qty) {
  strncpy(shelves[idx].orderId, orderId, sizeof(shelves[idx].orderId) - 1);
  shelves[idx].qty            = qty;
  shelves[idx].ledOn          = true;
  shelves[idx].buzzerOn       = true;
  shelves[idx].waitingCheckin = true;
  shelves[idx].activatedAt    = millis();

  digitalWrite(LED_PINS[idx], HIGH);
  Serial.printf("💡 [ACTIVATE] Kệ %s ON — Order=%s Qty=%d\n",
                SHELF_CODES[idx], orderId, qty);
}

// ================= XÁC NHẬN CHECK-IN (TẮT ĐÈN + CÒI) =================
void confirmCheckin(int idx) {
  shelves[idx].ledOn          = false;
  shelves[idx].buzzerOn       = false;
  shelves[idx].waitingCheckin = false;

  digitalWrite(LED_PINS[idx], LOW);
  digitalWrite(BUZ_PINS[idx], LOW);

  publishShelfEvent("CONFIRMED", idx, "Nhan vien da check-in tai ke");

  Serial.printf("✅ [CHECK-IN] Kệ %s đã được xác nhận — Order=%s\n",
                SHELF_CODES[idx], shelves[idx].orderId);
}

// ================= CẬP NHẬT MÀN HÌNH OLED =================
void updateOLED() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // --- Header ---
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("CITYMART WH-006");

  // --- Nhiệt độ / độ ẩm ---
  display.setCursor(80, 0);
  if (isSensorOK) {
    if (isAlarm) {
      display.print("!ALM!");
    } else {
      display.printf("%.1fC", currentTemp);
    }
  } else {
    display.print("--C");
  }

  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // --- Trạng thái từng kệ ---
  // Đếm số kệ đang active
  int activeCount = 0;
  for (int i = 0; i < 4; i++) {
    if (shelves[i].waitingCheckin) activeCount++;
  }

  if (activeCount == 0) {
    // Idle: hiện thông tin môi trường
    display.setTextSize(1);
    display.setCursor(0, 14);
    display.print("Cho lenh LOCATE...");
    display.setCursor(0, 24);
    if (isSensorOK) {
      display.printf("Nhiet do: %.1f C", currentTemp);
      display.setCursor(0, 34);
      display.printf("Do am  : %.1f %%", currentHum);
      display.setCursor(0, 44);
      display.print(isAlarm ? ">> CANH BAO NHIET DO! <<" : "Moi truong: ON DINH");
    } else {
      display.print("Cam bien: Loi ket noi");
    }

    // WiFi/MQTT status
    display.setCursor(0, 56);
    if (client.connected()) {
      display.print("MQTT: OK | ");
    } else {
      display.print("MQTT: OFF | ");
    }
    display.print(WiFi.status() == WL_CONNECTED ? "WiFi:OK" : "WiFi:--");

  } else {
    // Đang có lệnh picking: hiển thị kệ cần đến
    display.setTextSize(1);
    display.setCursor(0, 12);
    display.printf("LENH PICK (%d ke):", activeCount);

    int y = 24;
    for (int i = 1; i < 4; i++) { // Bỏ qua Cửa (index 0)
      if (shelves[i].waitingCheckin && y < 56) {
        display.setCursor(0, y);
        display.printf(">> Ke %s x%d", SHELF_CODES[i], shelves[i].qty);
        y += 10;
      }
    }

    // Nếu Cửa cũng active
    if (shelves[0].waitingCheckin && y < 56) {
      display.setCursor(0, y);
      display.print(">> Mo Cua Kho");
    }

    display.setCursor(0, 56);
    display.print("Bam nut check-in!");
  }

  display.display();
}

// ================= XỬ LÝ LỆNH MQTT =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("❌ JSON parse error: %s\n", err.c_str());
    return;
  }

  String action = doc["action"] | "";
  Serial.printf("📥 [MQTT RX] topic=%s action=%s\n", topic, action.c_str());

  // --- Lệnh LOCATE: bật đèn kệ chỉ định ---
  if (action == "LOCATE" || action == "PICK") {
    const char* shelfCode = doc["shelfCode"] | "";
    const char* orderId   = doc["orderId"]   | "ORD-UNKNOWN";
    int         qty       = doc["qty"]       | 1;

    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      activateShelf(idx, orderId, qty);
      publishShelfEvent("LOCATING", idx, "Den kich hoat, cho nhan vien check-in");
    } else {
      Serial.printf("⚠️ Không tìm thấy kệ: %s\n", shelfCode);
    }
  }

  // --- Lệnh LOCATE_MULTI: bật nhiều kệ cùng lúc ---
  else if (action == "LOCATE_MULTI") {
    JsonArray shelvesList = doc["shelves"].as<JsonArray>();
    const char* orderId   = doc["orderId"] | "ORD-UNKNOWN";
    for (JsonObject shelf : shelvesList) {
      const char* code = shelf["shelfCode"] | "";
      int         qty  = shelf["qty"]       | 1;
      int         idx  = findShelfIndex(code);
      if (idx >= 0) {
        activateShelf(idx, orderId, qty);
      }
    }
    // Publish event tổng hợp
    if (client.connected()) {
      DynamicJsonDocument evDoc(256);
      evDoc["event"]         = "LOCATING_MULTI";
      evDoc["orderId"]       = orderId;
      evDoc["warehouseCode"] = "WH-006";
      evDoc["timestamp"]     = millis();
      char buf[256];
      serializeJson(evDoc, buf);
      client.publish(TOPIC_EVT_SHELF, buf);
    }
  }

  // --- Lệnh tắt kệ cụ thể ---
  else if (action == "OFF") {
    const char* shelfCode = doc["shelfCode"] | "";
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      shelves[idx].ledOn          = false;
      shelves[idx].buzzerOn       = false;
      shelves[idx].waitingCheckin = false;
      digitalWrite(LED_PINS[idx], LOW);
      digitalWrite(BUZ_PINS[idx], LOW);
      Serial.printf("🔕 [OFF] Kệ %s đã tắt\n", SHELF_CODES[idx]);
    }
  }

  // --- Lệnh tắt tất cả ---
  else if (action == "RESET" || action == "ALL_OFF") {
    allOff();
    Serial.println("🔄 [RESET] Tất cả kệ đã tắt");
  }

  // --- Lệnh TEST: test đèn/còi kệ ---
  else if (action == "TEST") {
    const char* shelfCode = doc["shelfCode"] | "";
    if (strlen(shelfCode) == 0) {
      // Test tất cả: bật tuần tự 500ms
      for (int i = 0; i < 4; i++) {
        digitalWrite(LED_PINS[i], HIGH);
        digitalWrite(BUZ_PINS[i], HIGH);
        delay(500);
        digitalWrite(LED_PINS[i], LOW);
        digitalWrite(BUZ_PINS[i], LOW);
        delay(100);
      }
    } else {
      int idx = findShelfIndex(shelfCode);
      if (idx >= 0) {
        digitalWrite(LED_PINS[idx], HIGH);
        digitalWrite(BUZ_PINS[idx], HIGH);
        delay(1000);
        digitalWrite(LED_PINS[idx], LOW);
        digitalWrite(BUZ_PINS[idx], LOW);
      }
    }
  }

  updateOLED();
}

// ================= KẾT NỐI WIFI =================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Đang kết nối WiFi: %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(250);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi OK! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n⚠️ WiFi timeout, sẽ thử lại...");
  }
}

// ================= KẾT NỐI MQTT =================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED || client.connected()) return;
  String cid = "CityMart-WH006-" + String(random(0xffff), HEX);
  Serial.printf("Đang kết nối MQTT %s...\n", MQTT_SERVER);
  if (client.connect(cid.c_str())) {
    Serial.println("✅ MQTT OK!");
    client.subscribe(TOPIC_CMD_SHELF);
    client.subscribe(TOPIC_CMD_SYSTEM);
    client.subscribe(TOPIC_CMD_LEGACY); // backward compat

    // Thông báo online
    DynamicJsonDocument doc(256);
    doc["event"]         = "DEVICE_ONLINE";
    doc["warehouseCode"] = "WH-006";
    doc["ip"]            = WiFi.localIP().toString();
    doc["firmware"]      = "v2.0-picking-light";
    doc["timestamp"]     = millis();
    char buf[256];
    serializeJson(doc, buf);
    client.publish(TOPIC_EVT_SHELF, buf);
  } else {
    Serial.printf("❌ MQTT thất bại, rc=%d\n", client.state());
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=================================================");
  Serial.println("  CITYMART WH-006 — PICKING LIGHT SYSTEM v2.0  ");
  Serial.println("=================================================");
  Serial.println("SA BÀN: Cửa | Kệ A1 (Thịt) | Kệ A2 (Sữa) | Kệ A3 (Rau)");

  // 1. Nút bấm (INPUT_PULLUP)
  for (int i = 0; i < 4; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(PIN_ESP_BOOT, INPUT_PULLUP);

  // 2. LED + Còi
  for (int i = 0; i < 4; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
    pinMode(BUZ_PINS[i], OUTPUT);
    digitalWrite(BUZ_PINS[i], LOW);
  }

  // 3. I2C + OLED
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(5, 10); display.println("CITYMART WH-006");
    display.setCursor(5, 24); display.println("Picking Light v2.0");
    display.setCursor(5, 40); display.println("Dang khoi dong...");
    display.display();
  }

  // 4. WiFi + MQTT
  connectWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  connectMQTT();

  // 5. Test nhanh LED startup (blink 1 lần)
  for (int i = 0; i < 4; i++) {
    digitalWrite(LED_PINS[i], HIGH);
  }
  delay(300);
  for (int i = 0; i < 4; i++) {
    digitalWrite(LED_PINS[i], LOW);
  }

  Serial.println("✅ Hệ thống sẵn sàng. Đợi lệnh LOCATE từ MQTT...");
  updateOLED();
}

// ================= LOOP =================
void loop() {
  // --- Duy trì kết nối ---
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) connectMQTT();
    client.loop();
  } else {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 10000) {
      lastWifiRetry = millis();
      connectWiFi();
    }
  }

  unsigned long now = millis();

  // ----------------------------------------------------------------
  // 1. QUÉT NÚT BẤM CHECK-IN (debounce cạnh xuống)
  // ----------------------------------------------------------------
  for (int i = 0; i < 4; i++) {
    bool btnNow = (digitalRead(BTN_PINS[i]) == LOW);
    if (btnNow && !lastBtnState[i]) {
      // Phát hiện cạnh nhấn — debounce 30ms
      delay(30);
      if (digitalRead(BTN_PINS[i]) == LOW) {
        if (shelves[i].waitingCheckin) {
          // Nhân viên bấm check-in đúng kệ đang chờ
          confirmCheckin(i);
        } else {
          // Nút bấm mà kệ không active → gửi manual check-in event
          Serial.printf("👆 [BTN] Kệ %s được bấm (không có lệnh pick)\n", SHELF_CODES[i]);
          if (client.connected()) {
            DynamicJsonDocument doc(256);
            doc["event"]         = "MANUAL_BTN";
            doc["shelfCode"]     = SHELF_CODES[i];
            doc["warehouseCode"] = "WH-006";
            doc["timestamp"]     = now;
            char buf[256];
            serializeJson(doc, buf);
            client.publish(TOPIC_EVT_SHELF, buf);
          }
        }
        updateOLED();
      }
    }
    lastBtnState[i] = btnNow;
  }

  // Nút BOOT — tắt tất cả (emergency)
  static bool lastBootBtn = true;
  bool bootNow = (digitalRead(PIN_ESP_BOOT) == LOW);
  if (bootNow && !lastBootBtn) {
    delay(30);
    if (digitalRead(PIN_ESP_BOOT) == LOW) {
      Serial.println("🆘 [BOOT BTN] Emergency: Tắt tất cả kệ!");
      allOff();
      updateOLED();
    }
  }
  lastBootBtn = bootNow;

  // ----------------------------------------------------------------
  // 2. BLINK CÒI CHO KỆ ĐANG ACTIVE (không block loop)
  // ----------------------------------------------------------------
  if (now - lastBuzzTime >= 400) {
    lastBuzzTime = now;
    buzzPhase = !buzzPhase;

    for (int i = 0; i < 4; i++) {
      if (shelves[i].buzzerOn) {
        // Còi blink 400ms on / 400ms off
        digitalWrite(BUZ_PINS[i], buzzPhase ? HIGH : LOW);
        // LED sáng liên tục khi active (không blink LED, để dễ nhìn)
        digitalWrite(LED_PINS[i], HIGH);
      }
    }
  }

  // ----------------------------------------------------------------
  // 3. ĐỌC CẢM BIẾN SHT30 (mỗi 3 giây)
  // ----------------------------------------------------------------
  if (now - lastReadTime >= 3000) {
    lastReadTime = now;
    float t, h;
    if (readSHT30(t, h)) {
      currentTemp = t;
      currentHum  = h;
      isSensorOK  = true;
      isAlarm     = (currentTemp > 4.5 || currentTemp < -0.5 || currentHum > 90.0 || currentHum < 50.0);
    } else {
      isSensorOK = false;
    }
  }

  // ----------------------------------------------------------------
  // 4. GỬI TELEMETRY MÔI TRƯỜNG (mỗi 10 giây)
  // ----------------------------------------------------------------
  if (now - lastMqttTime >= 10000) {
    lastMqttTime = now;
    if (client.connected() && isSensorOK) {
      DynamicJsonDocument doc(512);
      doc["warehouseCode"] = "WH-006";
      doc["zone"]          = "COLD";
      doc["temperature"]   = round(currentTemp * 10) / 10.0;
      doc["humidity"]      = round(currentHum  * 10) / 10.0;
      doc["status"]        = isAlarm ? "VIOLATION" : "NORMAL";
      doc["timestamp"]     = now;

      // Trạng thái từng kệ
      JsonObject st = doc.createNestedObject("shelfStatus");
      for (int i = 0; i < 4; i++) {
        st[SHELF_CODES[i]] = shelves[i].waitingCheckin ? "ACTIVE" : "IDLE";
      }

      char buf[512];
      serializeJson(doc, buf);
      client.publish(TOPIC_ENV, buf);
      // Backward compat
      client.publish("citymart/warehouse/GV/environment/telemetry", buf);
      client.publish("warehouse/COLD/temperature", String(currentTemp, 1).c_str());
      client.publish("warehouse/COLD/humidity",    String(currentHum,  1).c_str());
    }
  }

  // ----------------------------------------------------------------
  // 5. CẬP NHẬT OLED (mỗi 200ms)
  // ----------------------------------------------------------------
  if (now - lastOledTime >= 200) {
    lastOledTime = now;
    updateOLED();
  }
}
