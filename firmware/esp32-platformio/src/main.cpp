#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

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
// Tự động kết nối đa mạng WiFi 2.4GHz (Bao Hoa & BELAND lau 2)
const char* WIFI_SSID_1     = "Bao Hoa";
const char* WIFI_PASSWORD_1 = "hoabao8420";
const char* WIFI_SSID_2     = "BELAND lau 2";
const char* WIFI_PASSWORD_2 = "0919237655";

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

// 4. Chân Nút Nhấn STOP 3 Giàn (Module nút 3 chân: VCC, GND, OUT - hỗ trợ cả Active HIGH & Active LOW)
#define PIN_A1_BTN      27  // STOP gian 1 (GPIO27)
#define PIN_A2_BTN      14  // STOP gian 2 (GPIO14)
#define PIN_A3_BTN      33  // STOP gian 3 (GPIO33)
#define PIN_ESP_BOOT     0  // Nút BOOT trên ESP32 (Tắt toàn bộ / Reset thử nghiệm)

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
  char  productName[40];
  int   qty;
  int   step;
  int   totalSteps;
  unsigned long activatedAt;
};

ShelfState shelves[3] = {
  {false, false, false, "", "", 0, 0, 0, 0},
  {false, false, false, "", "", 0, 0, 0, 0},
  {false, false, false, "", "", 0, 0, 0, 0},
};

// Trạng thái logic gần nhất của 3 nút bấm 3 chân (tự thích ứng Active HIGH / Active LOW / Latching)
int  lastBtnState[3]   = { 0, 0, 0 };
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
unsigned long lastReadTime      = 0;
unsigned long lastMqttTime      = 0;
unsigned long lastOledTime      = 0;
unsigned long lastBuzzTime      = 0;
unsigned long lastWifiCheckTime = 0;
unsigned long lastMqttRetryTime = 0;
bool          buzzPhase         = false;

WiFiMulti    wifiMulti;
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
    shelves[i].productName[0] = '\0';
    shelves[i].qty            = 0;
    shelves[i].step           = 0;
    shelves[i].totalSteps     = 0;
    lastBtnState[i]           = digitalRead(BTN_PINS[i]);
  }
}

// ================= HELPER: TÌM INDEX TỪ SHELF CODE =================
// CHỈ ĐỊNH VỊ CHO 3 KỆ DEMO IOT A1, A2, A3 (KHÔNG BEEP CHO A4, A10, B1, C1, D1...)
bool isBoundaryChar(char c) {
  return (c == '\0' || c == '-' || c == '_' || c == ' ' || c == '/' || c == ':' || c == '(' || c == ')');
}

bool containsExactShelfToken(const String& s, const char* token) {
  int tokLen = strlen(token);
  int start = 0;
  while (true) {
    int pos = s.indexOf(token, start);
    if (pos < 0) return false;
    bool leftOk  = (pos == 0) || isBoundaryChar(s.charAt(pos - 1));
    bool rightOk = (pos + tokLen >= (int)s.length()) || isBoundaryChar(s.charAt(pos + tokLen));
    if (leftOk && rightOk) return true;
    start = pos + 1;
  }
}

int findShelfIndex(const char* code) {
  if (!code || strlen(code) == 0) return -1;
  String s = String(code);
  s.toUpperCase();
  s.trim();

  // Kệ A1 (chỉ khớp đúng A1, RACK-COOL-01, COLD-SHELF-1, COOL-1, KỆ A1)
  if (s == "A1" || s == "1" ||
      containsExactShelfToken(s, "A1") ||
      s.indexOf("KE A1") >= 0 || s.indexOf("KỆ A1") >= 0 ||
      s.indexOf("RACK-COOL-01") >= 0 || s.indexOf("RACK-COOL-1") >= 0 ||
      s.indexOf("COLD-SHELF-1") >= 0 || s.indexOf("COOL-1") >= 0 ||
      s.indexOf("SHELF-A1") >= 0 || s.indexOf("RACK-A1") >= 0) {
    return 0;
  }

  // Kệ A2 (chỉ khớp đúng A2, RACK-COOL-02, COLD-SHELF-2, COOL-2, KỆ A2)
  if (s == "A2" || s == "2" ||
      containsExactShelfToken(s, "A2") ||
      s.indexOf("KE A2") >= 0 || s.indexOf("KỆ A2") >= 0 ||
      s.indexOf("RACK-COOL-02") >= 0 || s.indexOf("RACK-COOL-2") >= 0 ||
      s.indexOf("COLD-SHELF-2") >= 0 || s.indexOf("COOL-2") >= 0 ||
      s.indexOf("SHELF-A2") >= 0 || s.indexOf("RACK-A2") >= 0) {
    return 1;
  }

  // Kệ A3 (chỉ khớp đúng A3, RACK-COOL-03, COLD-SHELF-3, COOL-3, KỆ A3)
  if (s == "A3" || s == "3" ||
      containsExactShelfToken(s, "A3") ||
      s.indexOf("KE A3") >= 0 || s.indexOf("KỆ A3") >= 0 ||
      s.indexOf("RACK-COOL-03") >= 0 || s.indexOf("RACK-COOL-3") >= 0 ||
      s.indexOf("COLD-SHELF-3") >= 0 || s.indexOf("COOL-3") >= 0 ||
      s.indexOf("SHELF-A3") >= 0 || s.indexOf("RACK-A3") >= 0) {
    return 2;
  }

  // Tất cả các kệ khác (A4, A10, B1, B2, C1, C2, D1, DRY...) trả về -1
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

// ================= GỬI SỰ KIỆN LÊN USB SERIAL & MQTT =================
void publishShelfEvent(const char* eventName, int idx, const char* note, const char* source = "ESP32") {
  DynamicJsonDocument doc(320);
  doc["event"]         = eventName;
  doc["source"]        = source;
  doc["shelfCode"]     = SHELF_CODES[idx];
  doc["shelfLabel"]    = SHELF_LABELS[idx];
  doc["orderId"]       = shelves[idx].orderId;
  doc["qty"]           = shelves[idx].qty;
  doc["step"]          = shelves[idx].step;
  doc["totalSteps"]    = shelves[idx].totalSteps;
  doc["warehouseCode"] = "WH-006";
  doc["message"]       = note;
  doc["timestamp"]     = millis();

  char buf[320];
  serializeJson(doc, buf);

  // 1. Luôn gửi trực tiếp qua USB Serial (COM11) với độ trễ < 5ms (không phụ thuộc WiFi 2.4GHz/5GHz)
  Serial.printf("[IOT_EVENT]%s\n", buf);

  // 2. Đồng thời gửi qua MQTT nếu đang có kết nối
  if (client.connected()) {
    client.publish(TOPIC_EVT_SHELF, buf);
    client.publish(TOPIC_EVT_LEGACY, buf);
    client.publish(TOPIC_EVT_GV, buf);
  }
}

// ================= KÍCH HOẠT KỆ (BẬT ĐÈN HIGH + CÒI LOW) =================
void activateShelf(int idx, const char* orderId, int qty, const char* productName = "", int step = 0, int totalSteps = 0) {
  if (idx < 0 || idx >= 3) return;

  // QUAN TRỌNG: Tắt các giàn khác trước khi bật giàn này để luôn chỉ sáng & kêu đúng 1 kệ!
  for (int i = 0; i < 3; i++) {
    if (i != idx) {
      shelves[i].ledOn          = false;
      shelves[i].buzzerOn       = false;
      shelves[i].waitingCheckin = false;
      digitalWrite(LED_PINS[i], LED_OFF);
      digitalWrite(BUZ_PINS[i], BUZZER_OFF);
    }
  }

  strncpy(shelves[idx].orderId, orderId ? orderId : "ORD-WEB", sizeof(shelves[idx].orderId) - 1);
  shelves[idx].orderId[sizeof(shelves[idx].orderId) - 1] = '\0';

  strncpy(shelves[idx].productName, (productName && strlen(productName) > 0) ? productName : SHELF_LABELS[idx], sizeof(shelves[idx].productName) - 1);
  shelves[idx].productName[sizeof(shelves[idx].productName) - 1] = '\0';

  shelves[idx].qty            = qty > 0 ? qty : 1;
  shelves[idx].step           = step;
  shelves[idx].totalSteps     = totalSteps;
  shelves[idx].ledOn          = true;
  shelves[idx].buzzerOn       = true;
  shelves[idx].waitingCheckin = true;
  shelves[idx].activatedAt    = millis();

  // Đồng bộ trạng thái chân nút bấm 3 chân ngay thời điểm bật kệ để nhận chính xác lần bấm STOP tiếp theo
  lastBtnState[idx] = digitalRead(BTN_PINS[idx]);
  confirmBannerUntil = 0;

  digitalWrite(LED_PINS[idx], LED_ON);
  digitalWrite(BUZ_PINS[idx], BUZZER_ON);
  buzzPhase = true;
  lastBuzzTime = millis();

  Serial.printf("[ACTIVATE] Gian %d (Ke %s) | Buoc %d/%d | LED(GPIO%d)=HIGH, BUZ(GPIO%d)=LOW | BTN_BASE=%d\n",
                idx + 1, SHELF_CODES[idx], step, totalSteps, LED_PINS[idx], BUZ_PINS[idx], lastBtnState[idx]);
}

// ================= KÍCH HOẠT CẢ 3 GIÀN KỆ CHO TEST =================
void startAll3ShelvesOrder(const char* orderId) {
  for (int i = 0; i < 3; i++) {
    strncpy(shelves[i].orderId, orderId, sizeof(shelves[i].orderId) - 1);
    strncpy(shelves[i].productName, SHELF_LABELS[i], sizeof(shelves[i].productName) - 1);
    shelves[i].qty            = 1;
    shelves[i].step           = i + 1;
    shelves[i].totalSteps     = 3;
    shelves[i].ledOn          = true;
    shelves[i].buzzerOn       = true;
    shelves[i].waitingCheckin = true;
    shelves[i].activatedAt    = millis();
    lastBtnState[i]           = digitalRead(BTN_PINS[i]);
    digitalWrite(LED_PINS[i], LED_ON);
    digitalWrite(BUZ_PINS[i], BUZZER_ON);
  }
  Serial.println("[START ORDER] Ca 3 Gian Ke A1, A2, A3 da bat sang den & coi cho bam STOP!");
}

// ================= TẮT KỆ TỪ LỆNH APP/SERVER (KHÔNG PHÁT LẠI CONFIRMED VẬT LÝ) =================
void turnOffShelfSilent(int idx) {
  if (idx < 0 || idx >= 3) return;
  shelves[idx].ledOn          = false;
  shelves[idx].buzzerOn       = false;
  shelves[idx].waitingCheckin = false;

  digitalWrite(LED_PINS[idx], LED_OFF);
  digitalWrite(BUZ_PINS[idx], BUZZER_OFF);
  lastBtnState[idx] = digitalRead(BTN_PINS[idx]);

  Serial.printf("[REMOTE OFF] Gian %d (Ke %s) da TAT den & coi theo lenh App.\n", idx + 1, SHELF_CODES[idx]);
}

// ================= XÁC NHẬN NÚT STOP VẬT LÝ (TẮT ĐÈN & CÒI + GỬI CONFIRMED NHẢY MÓN TIẾP THEO) =================
void confirmCheckin(int idx) {
  if (idx < 0 || idx >= 3) return;
  shelves[idx].ledOn          = false;
  shelves[idx].buzzerOn       = false;
  shelves[idx].waitingCheckin = false;

  digitalWrite(LED_PINS[idx], LED_OFF);
  digitalWrite(BUZ_PINS[idx], BUZZER_OFF);

  strncpy(lastConfirmedShelf, SHELF_CODES[idx], sizeof(lastConfirmedShelf) - 1);
  lastConfirmedShelf[sizeof(lastConfirmedShelf) - 1] = '\0';
  confirmBannerUntil = millis() + 1200;

  publishShelfEvent("CONFIRMED", idx, "Nhan vien da bam STOP xac nhan lay hang tai ke", "HARDWARE_BUTTON");
  Serial.printf("[STOP CONFIRMED] Gian %d (Ke %s) da TAT den & coi -> Gui CONFIRMED de chuyen san pham tiep theo!\n",
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
    int firstActive = -1;
    for (int i = 0; i < 3; i++) {
      if (shelves[i].waitingCheckin) {
        firstActive = i;
        break;
      }
    }

    if (activeCount == 1 && firstActive >= 0) {
      display.setCursor(0, 12);
      if (shelves[firstActive].step > 0 && shelves[firstActive].totalSteps > 0) {
        display.printf("BUOC %d/%d - KE %s", shelves[firstActive].step, shelves[firstActive].totalSteps, SHELF_CODES[firstActive]);
      } else {
        display.printf("LAY HANG - KE %s", SHELF_CODES[firstActive]);
      }

      display.setCursor(0, 24);
      char shortName[22];
      strncpy(shortName, strlen(shelves[firstActive].productName) > 0 ? shelves[firstActive].productName : SHELF_LABELS[firstActive], 21);
      shortName[21] = '\0';
      display.print(shortName);

      display.setCursor(0, 36);
      display.printf("SL: x%d | %s", shelves[firstActive].qty, shelves[firstActive].orderId);

      display.setCursor(0, 48);
      display.print("LED + COI DANG BAT");
      display.setCursor(0, 56);
      display.printf("Bam STOP ke %s de tiep", SHELF_CODES[firstActive]);
    } else {
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
    }
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
  action.toUpperCase();
  action.trim();

  String shelfCodeStr = doc["shelfCode"] | doc["shelf"] | "";
  shelfCodeStr.toUpperCase();
  shelfCodeStr.trim();
  const char* shelfCode = shelfCodeStr.c_str();

  const char* orderId     = doc["orderId"]     | "ORD-WEB";
  const char* productName = doc["productName"] | "";
  int         qty         = doc["qty"]         | doc["quantity"] | 1;
  int         step        = doc["step"]        | 0;
  int         totalSteps  = doc["totalSteps"]  | 0;

  Serial.printf("\n[MQTT RECV] Topic: %s | Action: %s | Shelf: %s | Step: %d/%d\n",
                topic, action.c_str(), shelfCode, step, totalSteps);

  if (action == "LOCATE" || action == "PICK") {
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      activateShelf(idx, orderId, qty, productName, step, totalSteps);
      publishShelfEvent("LOCATING", idx, "Den va coi da bat, cho nhan vien bam STOP", "ESP32");
    }
  } else if (action == "SMARTKEY_CHIRP") {
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      for (int b = 0; b < 2; b++) {
        digitalWrite(LED_PINS[idx], LED_ON);
        digitalWrite(BUZ_PINS[idx], BUZZER_ON);
        delay(90);
        digitalWrite(BUZ_PINS[idx], BUZZER_OFF);
        if (!shelves[idx].ledOn) digitalWrite(LED_PINS[idx], LED_OFF);
        delay(90);
      }
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
  } else if (action == "OFF" || action == "STOP" || action == "SCAN_COMPLETED" || action == "DONE_SHELF" || action == "ARRIVED") {
    int idx = findShelfIndex(shelfCode);
    if (idx >= 0) {
      // Lệnh tắt từ App/Server -> Tắt đèn & còi êm, không phát ngược CONFIRMED tránh vòng lặp nhảy bước
      turnOffShelfSilent(idx);
    } else {
      // Khi bấm tắt chung hoặc không rõ mã kệ -> Tắt toàn bộ 3 kệ ngay lập tức!
      allOff();
    }
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
  wifiMulti.addAP(WIFI_SSID_1, WIFI_PASSWORD_1);
  wifiMulti.addAP(WIFI_SSID_2, WIFI_PASSWORD_2);
  Serial.println("[WIFI] Dang ket noi WiFi (Bao Hoa / BELAND lau 2)...");
  int tries = 0;
  while (wifiMulti.run() != WL_CONNECTED && tries < 12) {
    delay(250);
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Da ket noi: %s | IP: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WIFI] Chua ket noi duoc WiFi, se tiep tuc thu trong loop...");
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
    Serial.printf("[MQTT] Da ket noi %s:%d (clientId=%s)\n", MQTT_SERVER, MQTT_PORT, cid.c_str());
  }
}

// ================= SETUP =================
void setup() {
  // Tắt Brownout Detector để ngăn ESP32 bị reset khi bật đồng thời LED, Còi, OLED
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(250);

  // Tắt WiFi radio mặc định để tiết kiệm dòng USB và không bị nghẽn khi mạng là 5GHz
  WiFi.mode(WIFI_OFF);

  // 1. Cấu hình 3 Nút STOP (Module 3 chân VCC/GND/OUT có mạch đệm riêng -> dùng INPUT chuẩn)
  for (int i = 0; i < 3; i++) {
    pinMode(BTN_PINS[i], INPUT);
  }
  pinMode(PIN_ESP_BOOT, INPUT_PULLUP);

  // 2. Cấu hình 3 LED (HIGH sáng) & 3 Còi (LOW bật, HIGH tắt)
  for (int i = 0; i < 3; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LED_OFF);

    pinMode(BUZ_PINS[i], OUTPUT);
    digitalWrite(BUZ_PINS[i], BUZZER_OFF);
  }

  delay(80);
  for (int i = 0; i < 3; i++) {
    lastBtnState[i] = digitalRead(BTN_PINS[i]);
  }

  // 3. I2C Bus & OLED
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 14); display.println("CITYMART WH-006");
    display.setCursor(10, 28); display.println("Pick-to-Light 3 Ke");
    display.setCursor(10, 42); display.println("USB Serial: OK");
    display.display();
  }

  // Khởi động ở trạng thái SẴN SÀNG (Tất cả đèn và còi đều TẮT, chỉ bật khi có lệnh từ App)
  allOff();
  updateOLED();
  Serial.printf("[READY] BTN states: A1(GPIO%d)=%d, A2(GPIO%d)=%d, A3(GPIO%d)=%d\n",
                BTN_PINS[0], lastBtnState[0], BTN_PINS[1], lastBtnState[1], BTN_PINS[2], lastBtnState[2]);
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // Nhận lệnh JSON trực tiếp qua cổng USB Serial (COM11) với độ trễ < 5ms
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    int startIdx = line.indexOf('{');
    int endIdx   = line.lastIndexOf('}');
    if (startIdx >= 0 && endIdx > startIdx) {
      String jsonStr = line.substring(startIdx, endIdx + 1);
      mqttCallback((char*)"serial/command", (byte*)jsonStr.c_str(), jsonStr.length());
    }
  }

  // 1. QUÉT 3 NÚT STOP VẬT LÝ TẠI 3 GIÀN KỆ (TỰ THÍCH ỨNG CẢ ACTIVE HIGH / ACTIVE LOW / LATCHING)
  //    Khi kệ đang waitingCheckin và nhân viên bấm nút STOP -> TẮT NGAY đèn & còi, gửi CONFIRMED để App nhảy sang món tiếp theo!
  for (int i = 0; i < 3; i++) {
    int curState = digitalRead(BTN_PINS[i]);
    if (curState != lastBtnState[i]) {
      delay(35); // Chống dội phím
      curState = digitalRead(BTN_PINS[i]);
      if (curState != lastBtnState[i]) {
        lastBtnState[i] = curState;
        if (shelves[i].waitingCheckin && (now - shelves[i].activatedAt >= 250)) {
          confirmCheckin(i);
          updateOLED();
        }
      }
    }
  }

  // Nút BOOT trên bo ESP32 (GPIO 0): Bấm để reset tắt toàn bộ nếu đang bật, hoặc test 3 kệ nếu đang tắt
  bool bootNow = (digitalRead(PIN_ESP_BOOT) == LOW);
  if (bootNow && !lastBootPressed) {
    delay(35);
    if (digitalRead(PIN_ESP_BOOT) == LOW) {
      bool anyActive = shelves[0].waitingCheckin || shelves[1].waitingCheckin || shelves[2].waitingCheckin;
      if (anyActive) {
        allOff();
      } else {
        startAll3ShelvesOrder("ORD-WH006");
      }
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
      } else {
        digitalWrite(BUZ_PINS[i], BUZZER_OFF);
      }
      digitalWrite(LED_PINS[i], shelves[i].ledOn ? LED_ON : LED_OFF);
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

  // 4. GỬI DỮ LIỆU MÔI TRƯỜNG LÊN USB SERIAL & MQTT (MỖI 5 GIÂY)
  if (now - lastMqttTime >= 5000) {
    lastMqttTime = now;
    DynamicJsonDocument doc(512);
    doc["warehouseCode"] = "WH-006";
    doc["zone"]          = "COOL";
    doc["temperature"]   = isSensorOK ? (round(currentTemp * 10) / 10.0) : 24.5;
    doc["humidity"]      = isSensorOK ? (round(currentHum  * 10) / 10.0) : 65.0;
    doc["status"]        = isAlarm ? "VIOLATION" : "NORMAL";
    doc["timestamp"]     = now;

    char buf[512];
    serializeJson(doc, buf);
    Serial.printf("[IOT_ENV]%s\n", buf);

    if (client.connected() && isSensorOK) {
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
