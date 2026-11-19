#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🏢 CITYMART SMART WAREHOUSE - KỊCH BẢN 4: XÁC NHẬN LẤY HÀNG TẠI KỆ (WH-006)
//
// SƠ ĐỒ CHÂN PHẦN CỨNG (3 GIÀN KỆ + OLED + SHT30 - THEO BẢNG EXCEL):
//   1. OLED 0.96" + SHT30 (I2C): SDA = GPIO21, SCL = GPIO22
//   2. Giàn 1 (Kệ A1 - Thịt CP):
//        - Còi 1 : GPIO18 (Active LOW  : LOW = Bật kêu, HIGH = Tắt)
//        - LED 1 : GPIO25 (Active HIGH : HIGH = Sáng,   LOW  = Tắt)
//        - STOP 1: GPIO27 (Active HIGH : HIGH khi nhấn)
//   3. Giàn 2 (Kệ A2 - Sữa):
//        - Còi 2 : GPIO19 (Active LOW  : LOW = Bật kêu, HIGH = Tắt)
//        - LED 2 : GPIO26 (Active HIGH : HIGH = Sáng,   LOW  = Tắt)
//        - STOP 2: GPIO14 (Active HIGH : HIGH khi nhấn)
//   4. Giàn 3 (Kệ A3 - Rau):
//        - Còi 3 : GPIO23 (Active LOW  : LOW = Bật kêu, HIGH = Tắt)
//        - LED 3 : GPIO32 (Active HIGH : HIGH = Sáng,   LOW  = Tắt)
//        - STOP 3: GPIO33 (Active HIGH : HIGH khi nhấn)
//
// LUỒNG HOẠT ĐỘNG KỊCH BẢN 4:
//   - Khi có đơn hàng cần lấy (tự động kích hoạt cả 3 kệ khi khởi động hoặc nhận lệnh
//     LOCATE từ Web Dashboard): Đèn LED sáng + Còi kêu tại các kệ cần lấy.
//   - Nhân viên đi tới kệ nào, nhấn nút STOP của kệ đó:
//       1. Đèn LED và Còi của kệ đó TẮT NGAY LẬP TỨC (bấm lại không bị bật lại).
//       2. OLED hiển thị thông báo lớn: "DA XAC NHAN -> KE A1 OK!" trong 1.5 giây.
//       3. Gửi gói tin MQTT "CONFIRMED" về Web Dashboard.
//       4. OLED cập nhật danh sách các kệ còn lại chưa lấy.
//   - Khi đã bấm STOP xác nhận hết các kệ -> OLED hiển thị "HOAN TAT DON HANG"
//     và chuyển về màn hình giám sát Nhiệt độ / Độ ẩm SHT30.
//   - (Bấm nút BOOT trên ESP32 hoặc gửi lệnh từ Web để bắt đầu lượt lấy hàng mới).
// =========================================================================

// ================= CẤU HÌNH WIFI & MQTT =================
const char* WIFI_SSID     = "BELAND lau 2";   // WiFi 2.4GHz
const char* WIFI_PASSWORD = "0919237655";     // Mật khẩu WiFi

const char* MQTT_SERVER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

// Topics MQTT chuẩn đồng bộ với Web Dashboard & Backend
const char* TOPIC_CMD_SHELF  = "citymart/wh006/shelf/command";
const char* TOPIC_CMD_SYSTEM = "citymart/wh006/system/command";
const char* TOPIC_EVT_SHELF  = "citymart/wh006/shelf/event";
const char* TOPIC_ENV        = "citymart/wh006/environment";

// Topics tương thích ngược
const char* TOPIC_CMD_LEGACY = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_CMD_GV     = "citymart/warehouse/GV/picking/command";
const char* TOPIC_EVT_LEGACY = "citymart/warehouse/WH-006/picking/event";
const char* TOPIC_EVT_GV     = "citymart/warehouse/GV/picking/event";

// ================= SƠ ĐỒ CHÂN PHẦN CỨNG =================
// 1. I2C Bus (OLED + SHT30)
#define I2C_SDA_PIN     21  // SDA
#define I2C_SCL_PIN     22  // SCL

#define OLED_ADDR       0x3C
#define SHT30_ADDR      0x44

#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// 2. Chân Còi Buzzer 3 Giàn (Active LOW: LOW = Bật kêu, HIGH = Tắt)
#define PIN_A1_BUZZER   18  // Coi gian 1 (GPIO18)
#define PIN_A2_BUZZER   19  // Coi gian 2 (GPIO19)
#define PIN_A3_BUZZER   23  // Coi gian 3 (GPIO23)

#define BUZZER_ON       LOW
#define BUZZER_OFF      HIGH

// 3. Chân Đèn LED 3 Giàn (Active HIGH: HIGH = Sáng, LOW = Tắt)
#define PIN_A1_LED      25  // LED gian 1 (GPIO25)
#define PIN_A2_LED      26  // LED gian 2 (GPIO26)
#define PIN_A3_LED      32  // LED gian 3 (GPIO32)

#define LED_ON          HIGH
#define LED_OFF         LOW

// 4. Chân Nút Nhấn STOP 3 Giàn (Active HIGH: HIGH khi nhấn)
#define PIN_A1_BTN      27  // STOP gian 1 (GPIO27 - HIGH khi nhấn)
#define PIN_A2_BTN      14  // STOP gian 2 (GPIO14 - HIGH khi nhấn)
#define PIN_A3_BTN      33  // STOP gian 3 (GPIO33 - HIGH khi nhấn)
#define PIN_ESP_BOOT     0  // Nút BOOT trên ESP32 (Reset bắt đầu lại đơn hàng 3 kệ)

#define BTN_PRESSED_STATE HIGH

// ================= INDEX MAPPING (0=Giàn 1/A1, 1=Giàn 2/A2, 2=Giàn 3/A3) =================
const int   BTN_PINS[3]      = { PIN_A1_BTN,    PIN_A2_BTN,    PIN_A3_BTN    };
const int   LED_PINS[3]      = { PIN_A1_LED,    PIN_A2_LED,    PIN_A3_LED    };
const int   BUZ_PINS[3]      = { PIN_A1_BUZZER, PIN_A2_BUZZER, PIN_A3_BUZZER };
const char* SHELF_CODES[3]   = { "A1",          "A2",          "A3"          };
const char* SHELF_LABELS[3]  = { "Thit tuoi CP","Sua Da Lat",  "Rau VietGAP" };

// ================= TRẠNG THÁI HỆ THỐNG =================
struct ShelfState {
  bool  ledOn;
  bool  buzzerOn;
  bool  waitingCheckin;
  char  orderId[32];
  int   qty;
  unsigned long activatedAt;
};

ShelfState shelves[3] = {
  {false, false, false, "", 0, 0},
  {false, false, false, "", 0, 0},
  {false, false, false, "", 0, 0},
};

bool lastBtnPressed[3] = { false, false, false };
bool lastBootPressed   = false;

// Thông báo xác nhận tạm thời trên màn hình OLED
char          lastConfirmedShelf[8] = "";
unsigned long confirmBannerUntil    = 0;

// Môi trường
float currentTemp = 0.0;
float currentHum  = 0.0;
bool  isSensorOK  = false;
bool  isAlarm     = false;

// Timers
unsigned long lastReadTime = 0;
unsigned long lastMqttTime = 0;
unsigned long lastOledTime = 0;
unsigned long lastBuzzTime = 0;
bool          buzzPhase    = false;

WiFiClient   espClient;
PubSubClient client(espClient);

// ================= HELPER: TẮT TẤT CẢ 3 GIÀN =================
void allOff() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PINS[i], LED_OFF);
    digitalWrite(BUZ_PINS[i], BUZZER_OFF);
    shelves[i].ledOn          = false;
    shelves[i].buzzerOn       = false;
    shelves[i].waitingCheckin = false;
    shelves[i].orderId[0]     = '\0';
    shelves[i].qty            = 0;
  }
}

// ================= HELPER: TÌM INDEX TỪ SHELF CODE =================
int findShelfIndex(const char* code) {
  if (strstr(code, "A1") || strstr(code, "01") || strcmp(code, "1") == 0) return 0;
  if (strstr(code, "A2") || strstr(code, "02") || strcmp(code, "2") == 0) return 1;
  if (strstr(code, "A3") || strstr(code, "03") || strcmp(code, "3") == 0) return 2;
  return -1;
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
    if (hum > 100.0) hum = 100.0;
    if (hum < 0.0)   hum = 0.0;
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
  client.publish(TOPIC_EVT_LEGACY, buf);
  client.publish(TOPIC_EVT_GV, buf);
}

// ================= KÍCH HOẠT KỆ (BẬT ĐÈN HIGH + CÒI LOW) =================
void activateShelf(int idx, const char* orderId, int qty) {
  if (idx < 0 || idx >= 3) return;
  strncpy(shelves[idx].orderId, orderId, sizeof(shelves[idx].orderId) - 1);
  shelves[idx].qty            = qty;
  shelves[idx].ledOn          = true;
  shelves[idx].buzzerOn       = true;
  shelves[idx].waitingCheckin = true;
  shelves[idx].activatedAt    = millis();

  digitalWrite(LED_PINS[idx], LED_ON);
  digitalWrite(BUZ_PINS[idx], BUZZER_ON);

  Serial.printf("💡 [ACTIVATE] Giàn %d (Kệ %s) -> LED(GPIO%d)=HIGH, BUZ(GPIO%d)=LOW\n",
                idx + 1, SHELF_CODES[idx], LED_PINS[idx], BUZ_PINS[idx]);
}

// ================= KÍCH HOẠT CẢ 3 GIÀN KỆ CHO LƯỢT LẤY HÀNG MỚI =================
void startAll3ShelvesOrder(const char* orderId) {
  for (int i = 0; i < 3; i++) {
    activateShelf(i, orderId, 1);
  }
  Serial.println("🚀 [START ORDER] Cả 3 Giàn Kệ A1, A2, A3 đã bật sáng đèn & còi chờ nhân viên bấm STOP!");
}

// ================= XÁC NHẬN NÚT STOP (TẮT ĐÈN LOW + TẮT CÒI HIGH) =================
void confirmCheckin(int idx) {
  if (idx < 0 || idx >= 3) return;
  shelves[idx].ledOn          = false;
  shelves[idx].buzzerOn       = false;
  shelves[idx].waitingCheckin = false;

  digitalWrite(LED_PINS[idx], LED_OFF);
  digitalWrite(BUZ_PINS[idx], BUZZER_OFF);

  strncpy(lastConfirmedShelf, SHELF_CODES[idx], sizeof(lastConfirmedShelf) - 1);
  confirmBannerUntil = millis() + 1500;

  publishShelfEvent("CONFIRMED", idx, "Nhan vien da bam STOP xac nhan lay hang tai ke");
  Serial.printf("✅ [STOP CONFIRMED] Giàn %d (Kệ %s) đã TẮT đèn & còi!\n",
                idx + 1, SHELF_CODES[idx]);
}

// ================= CẬP NHẬT MÀN HÌNH OLED =================
void updateOLED() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("CITYMART WH-006");

  display.setCursor(82, 0);
  if (isSensorOK) {
    display.printf("%.1fC", currentTemp);
  } else {
    display.print("--.-C");
  }
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // 1. Khi vừa bấm nút STOP xác nhận kệ (hiện thông báo lớn 1.5s)
  if (millis() < confirmBannerUntil && strlen(lastConfirmedShelf) > 0) {
    display.setTextSize(1);
    display.setCursor(10, 14);
    display.print("DA XAC NHAN LAY HANG");
    display.setTextSize(2);
    display.setCursor(22, 28);
    display.printf("KE %s OK", lastConfirmedShelf);
    display.setTextSize(1);
    display.setCursor(12, 52);
    display.print("Da tat den & coi!");
    display.display();
    return;
  }

  // 2. Đếm số giàn đang sáng đèn chờ lấy hàng
  int activeCount = 0;
  for (int i = 0; i < 3; i++) {
    if (shelves[i].waitingCheckin) activeCount++;
  }

  if (activeCount > 0) {
    // Đang có kệ chờ nhân viên bấm STOP
    display.setCursor(0, 12);
    display.printf("CAN LAY HANG (%d ke):", activeCount);

    int y = 23;
    for (int i = 0; i < 3; i++) {
      if (shelves[i].waitingCheckin) {
        display.setCursor(0, y);
        display.printf(">> Ke %s: %s", SHELF_CODES[i], SHELF_LABELS[i]);
        y += 10;
      }
    }

    display.setCursor(0, 56);
    display.print("Bam STOP tai ke de tat");
  } else {
    // Trạng thái nghỉ / Sẵn sàng -> Hiện thông số Nhiệt độ / Độ ẩm
    display.setCursor(0, 13);
    display.print(">> SAN SANG CHO LENH <<");
    display.setCursor(0, 25);
    if (isSensorOK) {
      display.printf("Nhiet do: %.1f C", currentTemp);
      display.setCursor(0, 35);
      display.printf("Do am   : %.1f %%", currentHum);
      display.setCursor(0, 45);
      display.print(isAlarm ? "! CANH BAO NHIET DO !" : "Moi truong: AN TOAN");
    } else {
      display.print("SHT30   : Dang doc...");
      display.setCursor(0, 35);
      display.print("Hoan tat lay hang!");
    }

    display.setCursor(0, 56);
    display.print(client.connected() ? "MQTT:OK " : "MQTT:-- ");
    display.print("| BOOT:Chay lai");
  }

  display.display();
}

// ================= XỬ LÝ LỆNH MQTT =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, payload, length)) return;

  String action = doc["action"] | "";
  const char* shelfCode = doc["shelfCode"] | doc["shelf"] | "";
  const char* orderId   = doc["orderId"]   | "ORD-WEB";
  int         qty       = doc["qty"]       | doc["quantity"] | 1;

  if (action == "LOCATE" || action == "PICK" || (strlen(shelfCode) > 0 && action == "")) {
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      activateShelf(idx, orderId, qty);
      publishShelfEvent("LOCATING", idx, "Den va coi da bat, cho nhan vien bam STOP");
    }
  } else if (action == "LOCATE_MULTI" || action == "START") {
    if (doc.containsKey("shelves")) {
      JsonArray arr = doc["shelves"].as<JsonArray>();
      for (JsonObject s : arr) {
        const char* c = s["shelfCode"] | "";
        int q = s["qty"] | 1;
        int idx = findShelfIndex(c);
        if (idx >= 0) activateShelf(idx, orderId, q);
      }
    } else {
      startAll3ShelvesOrder(orderId);
    }
  } else if (action == "OFF") {
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) confirmCheckin(idx);
  } else if (action == "RESET" || action == "ALL_OFF" || action == "CLEAR") {
    allOff();
  } else if (action == "TEST") {
    if (strlen(shelfCode) > 0) {
      int idx = findShelfIndex(shelfCode);
      if (idx >= 0) activateShelf(idx, "TEST-WEB", 1);
    } else {
      startAll3ShelvesOrder("ORD-TEST");
    }
  }

  updateOLED();
}

// ================= WIFI & MQTT =================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(250);
    tries++;
  }
}

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED || client.connected()) return;
  String cid = "CityMart-WH006-" + String(random(0xffff), HEX);
  if (client.connect(cid.c_str())) {
    client.subscribe(TOPIC_CMD_SHELF);
    client.subscribe(TOPIC_CMD_SYSTEM);
    client.subscribe(TOPIC_CMD_LEGACY);
    client.subscribe(TOPIC_CMD_GV);
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(300);

  // 1. Cấu hình 3 Nút STOP (HIGH khi nhấn)
  for (int i = 0; i < 3; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLDOWN);
  }
  pinMode(PIN_ESP_BOOT, INPUT_PULLUP);

  // 2. Cấu hình 3 LED (HIGH sáng) & 3 Còi (LOW bật, HIGH tắt)
  for (int i = 0; i < 3; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LED_OFF);

    pinMode(BUZ_PINS[i], OUTPUT);
    digitalWrite(BUZ_PINS[i], BUZZER_OFF);
  }

  // 3. I2C Bus & OLED
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 14); display.println("CITYMART WH-006");
    display.setCursor(10, 28); display.println("Kich Ban 4: STOP Ke");
    display.setCursor(10, 42); display.println("Dang khoi dong...");
    display.display();
  }

  connectWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  connectMQTT();

  // Khởi động ở trạng thái SẴN SÀNG (Tất cả đèn và còi đều TẮT, chỉ bật khi có lệnh từ App)
  allOff();
  updateOLED();
}

// ================= LOOP =================
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) connectMQTT();
    client.loop();
  }

  unsigned long now = millis();

  // 1. KỊCH BẢN 4: QUÉT 3 NÚT STOP VẬT LÝ TẠI 3 GIÀN KỆ (HIGH KHI NHẤN)
  //    Nhấn STOP tại kệ nào -> TẮT NGAY đèn & còi kệ đó, hiện xác nhận và gửi MQTT!
  for (int i = 0; i < 3; i++) {
    bool isPressed = (digitalRead(BTN_PINS[i]) == BTN_PRESSED_STATE);
    if (isPressed && !lastBtnPressed[i]) {
      delay(35); // Chống dội phím
      if (digitalRead(BTN_PINS[i]) == BTN_PRESSED_STATE) {
        if (shelves[i].waitingCheckin) {
          confirmCheckin(i);
          updateOLED();
        }
      }
    }
    lastBtnPressed[i] = isPressed;
  }

  // Nút BOOT trên bo ESP32 (GPIO 0): Bấm để bắt đầu lại lượt lấy hàng cả 3 kệ A1, A2, A3
  bool bootNow = (digitalRead(PIN_ESP_BOOT) == LOW);
  if (bootNow && !lastBootPressed) {
    delay(35);
    if (digitalRead(PIN_ESP_BOOT) == LOW) {
      startAll3ShelvesOrder("ORD-WH006");
      updateOLED();
    }
  }
  lastBootPressed = bootNow;

  // 2. ĐIỀU KHIỂN NHỊP CÒI BÍP-BÍP & ĐÈN LED CHO KỆ ĐANG CHỜ LẤY HÀNG
  if (now - lastBuzzTime >= 400) {
    lastBuzzTime = now;
    buzzPhase = !buzzPhase;

    for (int i = 0; i < 3; i++) {
      if (shelves[i].buzzerOn) {
        digitalWrite(BUZ_PINS[i], buzzPhase ? BUZZER_ON : BUZZER_OFF);
        digitalWrite(LED_PINS[i], LED_ON);
      } else {
        digitalWrite(BUZ_PINS[i], BUZZER_OFF);
        digitalWrite(LED_PINS[i], LED_OFF);
      }
    }
  }

  // 3. ĐỌC CẢM BIẾN SHT30 (MỖI 2 GIÂY)
  if (now - lastReadTime >= 2000) {
    lastReadTime = now;
    float t, h;
    if (readSHT30(t, h)) {
      currentTemp = t;
      currentHum  = h;
      isSensorOK  = true;
      isAlarm     = (currentTemp > 35.0 || currentTemp < 10.0 || currentHum > 80.0);
    } else {
      isSensorOK = false;
    }
  }

  // 4. GỬI DỮ LIỆU MÔI TRƯỜNG LÊN MQTT (MỖI 5 GIÂY)
  if (now - lastMqttTime >= 5000) {
    lastMqttTime = now;
    if (client.connected() && isSensorOK) {
      DynamicJsonDocument doc(512);
      doc["warehouseCode"] = "WH-006";
      doc["zone"]          = "COOL";
      doc["temperature"]   = round(currentTemp * 10) / 10.0;
      doc["humidity"]      = round(currentHum  * 10) / 10.0;
      doc["status"]        = isAlarm ? "VIOLATION" : "NORMAL";
      doc["timestamp"]     = now;

      char buf[512];
      serializeJson(doc, buf);
      client.publish(TOPIC_ENV, buf);
      client.publish("citymart/warehouse/GV/environment/telemetry", buf);
    }
  }

  // 5. CẬP NHẬT MÀN HÌNH OLED (MỖI 200ms)
  if (now - lastOledTime >= 200) {
    lastOledTime = now;
    updateOLED();
  }
}
