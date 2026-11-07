#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <DHT.h>

// =========================================================================
// HỆ THỐNG IOT PHÒNG KHO LẠNH (COLD ROOM NODE) - KHO GÒ VẤP (WH-006 / GV)
// Đặc thù: Bảo quản thực phẩm tươi sống, sữa, rau củ (0°C ~ 4°C, 60% ~ 80%)
// Gồm 3 Kệ hàng Pick-to-Light: Kệ A1, Kệ A2, Kệ A3
// =========================================================================

// ================= OLED DISPLAY CONFIG =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ================= NEOPIXEL CONFIG (3 KỆ HÀNG KHO LẠNH) =================
#define NEOPIXEL_PIN  13
#define NUM_SHELVES   3
Adafruit_NeoPixel strip(NUM_SHELVES, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

// ================= CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM DHT22 =================
#define DHTPIN        5     // Data pin nối GPIO 5
#define DHTTYPE       DHT22 // DHT22 chuyên dụng cho kho lạnh
DHT dht(DHTPIN, DHTTYPE);

// ================= HỆ THỐNG ÂM THANH ĐA VÙNG (MULTI-BUZZER AUDIO) =================
#define BUZZER_DOOR    32  // LOA LỚN NGOÀI CỬA PHÒNG (Master Horn Siren - Báo động & Chuông cửa)
#define BTN_MASTER     33  // Nút check-in tổng tại cửa phòng lạnh

// 3 LOA NHỎ TẠI 3 KỆ HÀNG (Local Shelf Beepers - Định vị âm thanh tại kệ):
// Kệ A1: GPIO 23 | Kệ A2: GPIO 19 | Kệ A3: GPIO 18
const int SHELF_BUZZER_PINS[3] = {23, 19, 18};

// 3 Nút bấm tại 3 Kệ nối trực tiếp GPIO (Không cần ma trận, phản hồi tức thì):
// Kệ A1: GPIO 14 | Kệ A2: GPIO 27 | Kệ A3: GPIO 12
const int SHELF_BTN_PINS[3] = {14, 27, 12};

// Danh mục 3 Kệ Phòng Kho Lạnh Gò Vấp
const char* SHELF_NAMES[3] = { "Ke A1", "Ke A2", "Ke A3" };
const char* SHELF_DESC[3]  = { "Thit tuoi CP", "Sua Da Lat Milk", "Rau cu VietGAP" };

// ================= TIÊU CHUẨN NHIỆT ĐỘ AN TOÀN CHO TỪNG SẢN PHẨM KHO LẠNH =================
struct ColdProductStandard {
  const char* shelfCode;
  const char* productName;
  const char* category;
  float minTempSafe;  // Ngưỡng nhiệt độ tối thiểu (°C)
  float maxTempSafe;  // Ngưỡng nhiệt độ tối đa (°C)
  float minHumSafe;   // Độ ẩm tối thiểu (%)
  float maxHumSafe;   // Độ ẩm tối đa (%)
  const char* riskDesc; // Rủi ro vi phạm
};

const ColdProductStandard COLD_STANDARDS[3] = {
  // 1. Kệ A1: Thịt tươi sống CP & Gia cầm (Bảo quản 0°C ~ 4°C)
  { "Ke A1", "Thit tuoi CP", "Thit & Gia cam", 0.0, 4.0, 70.0, 85.0, "Vi khuan sinh soi / Oi thiu" },

  // 2. Kệ A2: Sữa tươi thanh trùng Đà Lạt Milk, TH True Milk (Bảo quản 2°C ~ 6°C)
  { "Ke A2", "Sua Da Lat Milk", "Sua & Bo sua", 2.0, 6.0, 60.0, 75.0, "Chua sua / Tach bo" },

  // 3. Kệ A3: Rau củ quả VietGAP, cà rốt, súp lơ tươi (Bảo quản 2°C ~ 8°C)
  { "Ke A3", "Rau cu VietGAP", "Rau cu tuoi", 2.0, 8.0, 75.0, 95.0, "Dap ung / Mat nuoc heo ua" }
};

// Đánh giá tình trạng an toàn của sản phẩm theo nhiệt độ thực tế
// Trả về: 0 = "AN TOÀN", 1 = "NGUY CƠ QUÁ NHIỆT", -1 = "NGUY CƠ ĐÔNG ĐÁ"
int getProductSafetyStatus(int shelfIdx, float temp) {
  if (shelfIdx < 0 || shelfIdx >= 3) return 0;
  if (temp > COLD_STANDARDS[shelfIdx].maxTempSafe) return 1;  // Quá nóng
  if (temp < COLD_STANDARDS[shelfIdx].minTempSafe) return -1; // Quá lạnh làm hỏng tế bào
  return 0; // Đạt chuẩn an toàn thực phẩm
}

// ================= NETWORK & MQTT CONFIG =================
const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;

// Topics MQTT Điều khiển & Sự kiện Kho Gò Vấp
const char* TOPIC_COMMAND_GV    = "citymart/warehouse/GV/picking/command";
const char* TOPIC_COMMAND_WH006 = "citymart/warehouse/WH-006/picking/command";
const char* TOPIC_EVENT_GV      = "citymart/warehouse/GV/picking/event";
const char* TOPIC_EVENT_WH006   = "citymart/warehouse/WH-006/picking/event";

// Topics Telemetry Giám sát Môi trường Phòng Kho Lạnh
const char* TOPIC_TELEMETRY_COLD  = "citymart/warehouse/GV/zone/COLD/telemetry";
const char* TOPIC_TELEMETRY_GEN   = "citymart/warehouse/GV/environment/telemetry";

WiFiClient espClient;
PubSubClient client(espClient);

// ================= STATE MACHINE & CLIMATE =================
enum ShelfStatus {
  STATUS_IDLE,      // Phòng lạnh rảnh, đèn tắt, hiển thị nhiệt độ giám sát
  STATUS_LOCATING,  // Nhân viên đang vào phòng tìm kệ: Nháy đèn xanh + kêu còi
  STATUS_ARRIVED    // Nhân viên đã ấn nút tại kệ: Còi tắt, đèn sáng đứng
};

ShelfStatus currentState = STATUS_IDLE;
int currentTargetShelf = -1; // 0 = A1, 1 = A2, 2 = A3 (-1 = Ngoài phòng)
int currentQty = 0;
String currentProduct = "";
String otherRoomInfo = "";

// Cảm biến nhiệt ẩm
float currentTemp = 2.5;   // Chuẩn kho mát 2.5°C
float currentHum  = 72.0;  // Chuẩn kho mát 72%
unsigned long lastDhtTime = 0;
const unsigned long DHT_INTERVAL = 2500;
unsigned long lastTelemTime = 0;
const unsigned long TELEM_INTERVAL = 5000;

// ================= CLIMATE ALARM & CONTINUOUS SIREN =================
bool isClimateAlarm = false;
bool alarmBlinkState = false;
unsigned long lastAlarmSirenTime = 0;
const unsigned long ALARM_SIREN_INTERVAL = 220; // Chu kỳ nháy & hú còi 220ms
bool alarmMuted = false;
unsigned long muteTime = 0;
const unsigned long MUTE_DURATION = 20000; // Tắt còi 20s khi ấn nút Master

// Bộ đếm nháy đèn siêu tốc (140ms strobe)
unsigned long lastBlinkTime = 0;
bool blinkState = false;
const unsigned long BLINK_INTERVAL = 140;

// Debounce nút bấm trực tiếp
int lastPressed = -1;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 35;

void muteAllBuzzers() {
  noTone(BUZZER_DOOR);
  for (int i = 0; i < 3; i++) {
    noTone(SHELF_BUZZER_PINS[i]);
  }
}

void beepDoor(int freq, int durationMs) {
  tone(BUZZER_DOOR, freq);
  delay(durationMs);
  noTone(BUZZER_DOOR);
}

void beepShelf(int shelfIdx, int freq, int durationMs) {
  if (shelfIdx >= 0 && shelfIdx < 3) {
    tone(SHELF_BUZZER_PINS[shelfIdx], freq);
    delay(durationMs);
    noTone(SHELF_BUZZER_PINS[shelfIdx]);
  }
}

void beep(int freq, int durationMs) {
  beepDoor(freq, durationMs);
}

// Chuyển ký tự tiếng Việt có dấu thành không dấu
String removeAccents(String str) {
  String out = "";
  for (unsigned int i = 0; i < str.length(); i++) {
    char c = str[i];
    if ((unsigned char)c >= 0x80) continue;
    out += c;
  }
  return out;
}

void showScreen(String title, String line1, String line2, String line3, String line4 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Header Bar
  display.setCursor(0, 0);
  display.print(">> ");
  display.println(title);
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Content
  display.setCursor(0, 14);
  display.println(line1);
  display.setCursor(0, 26);
  display.println(line2);
  display.setCursor(0, 38);
  display.println(line3);

  if (line4.length() > 0) {
    display.setCursor(0, 50);
    display.println(line4);
  }

  display.display();
}

void turnOffAllLEDs() {
  for (int i = 0; i < NUM_SHELVES; i++) {
    strip.setPixelColor(i, 0);
  }
  strip.show();
}

// Màu đặc trưng của Kho Lạnh (Zone Mát): Xanh lá cây tươi (Green)
uint32_t getColdZoneColor() {
  return strip.Color(0, 255, 0);
}

// Phân tích mã kệ: Trả về 0 (A1), 1 (A2), 2 (A3) nếu thuộc Kho Lạnh, ngược lại -1
int parseColdShelfIndex(String shelfCode) {
  shelfCode.toUpperCase();
  if (shelfCode.indexOf("A1") >= 0 || shelfCode.indexOf("COOL-SHELF-01") >= 0 || shelfCode.indexOf("COOL-SHELF-1") >= 0 || shelfCode.indexOf("COOL-1") >= 0 || shelfCode.indexOf("CL-A") >= 0) return 0;
  if (shelfCode.indexOf("A2") >= 0 || shelfCode.indexOf("COOL-SHELF-02") >= 0 || shelfCode.indexOf("COOL-SHELF-2") >= 0 || shelfCode.indexOf("COOL-2") >= 0 || shelfCode.indexOf("CL-B") >= 0) return 1;
  if (shelfCode.indexOf("A3") >= 0 || shelfCode.indexOf("COOL-SHELF-03") >= 0 || shelfCode.indexOf("COOL-SHELF-3") >= 0 || shelfCode.indexOf("COOL-3") >= 0 || shelfCode.indexOf("CL-C") >= 0) return 2;
  return -1; // Thuộc phòng khác (Kho Đông hoặc Kho Khô)
}

// Quét 3 nút bấm trực tiếp tại kệ A1, A2, A3 và nút Master
int scanShelfButtons() {
  for (int i = 0; i < 3; i++) {
    if (digitalRead(SHELF_BTN_PINS[i]) == LOW) {
      return i; // Bấm nút Kệ i
    }
  }
  if (digitalRead(BTN_MASTER) == LOW) {
    return -99; // Mã riêng cho nút Master tại cửa phòng
  }
  return -1;
}

// ================= XỬ LÝ LỆNH TỪ APP NHÂN VIÊN =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println(F("deserializeJson() failed"));
    return;
  }

  String action = doc["action"] | "";
  String shelfCode = doc["shelfCode"] | "";
  String productName = doc["productName"] | "";
  int qty = doc["qty"] | 1;

  Serial.println("\n[MQTT NHẬN LỆNH KHO LẠNH]: " + action + " | Kệ: " + shelfCode);

  // 1. LỆNH ĐỊNH VỊ TÌM KỆ
  if (action == "LOCATE") {
    int shelfIdx = parseColdShelfIndex(shelfCode);

    // TRƯỜNG HỢP A: KỆ THUỘC PHÒNG KHO LẠNH (A1, A2, A3)
    if (shelfIdx >= 0) {
      currentTargetShelf = shelfIdx;
      currentProduct = productName;
      currentQty = qty;
      otherRoomInfo = "";

      currentState = STATUS_LOCATING;
      lastBlinkTime = millis();
      blinkState = false;
      turnOffAllLEDs();
      muteAllBuzzers();

      Serial.println(">> [TRONG PHÒNG] Kích hoạt nháy đèn định vị " + String(SHELF_NAMES[currentTargetShelf]) + " (" + String(SHELF_DESC[currentTargetShelf]) + ")");

      String header = "PHONG LANH - " + String(SHELF_NAMES[currentTargetShelf]);
      String line1 = "SP: " + removeAccents(currentProduct);
      String line2 = "SL: " + String(currentQty) + " mon [DANG NHAY]";

      int safety = getProductSafetyStatus(currentTargetShelf, currentTemp);
      String safeStr = (safety == 0) ? "[CHAT LUONG: AN TOAN]" : (safety > 0 ? "[CANH BAO QUA NHIET!]" : "[CANH BAO DONG BANG!]");
      String line3 = "T:" + String(currentTemp, 1) + "C (Chuan " + String((int)COLD_STANDARDS[currentTargetShelf].minTempSafe) + "-" + String((int)COLD_STANDARDS[currentTargetShelf].maxTempSafe) + "C)";
      showScreen(header, line1, line2, line3, safeStr);
    }
    // TRƯỜNG HỢP B: KỆ THUỘC PHÒNG KHÁC (VÍ DỤ KỆ C9 Ở KHO KHÔ HOẶC B1 Ở KHO ĐÔNG)
    else {
      currentTargetShelf = -1;
      currentState = STATUS_IDLE;
      turnOffAllLEDs();
      muteAllBuzzers();

      String targetRoom = "Phong Kho Khac";
      if (shelfCode.indexOf("B") >= 0 || shelfCode.indexOf("FROZEN") >= 0) targetRoom = "Phong Kho Dong (-18C)";
      else if (shelfCode.indexOf("C") >= 0 || shelfCode.indexOf("DRY") >= 0) targetRoom = "Phong Kho Kho (+25C)";

      Serial.println(">> [NGOÀI PHÒNG] Đơn hàng ở " + shelfCode + " -> Thuộc " + targetRoom);

      showScreen("DON HANG PHONG KHAC", "Ke: " + shelfCode, "-> Qua: " + targetRoom, "Phong Lanh: Tat den", ">> T: " + String(currentTemp, 1) + "C [AN TOAN]");
    }
    return;
  }

  // 2. LỆNH QUÉT HOÀN TẤT -> TẮT ĐÈN
  if (action == "SCAN_COMPLETED" || action == "DONE_SHELF") {
    int shelfIdx = parseColdShelfIndex(shelfCode);
    if (shelfIdx >= 0) {
      Serial.println(">> Quét xong tại phòng lạnh! Tự động tắt đèn " + String(SHELF_NAMES[shelfIdx]));
      currentState = STATUS_IDLE;
      turnOffAllLEDs();
      muteAllBuzzers();

      beepShelf(shelfIdx, 2600, 80);
      delay(100);
      beepShelf(shelfIdx, 3200, 150);

      showScreen("QUET XONG HANG!", String(SHELF_NAMES[shelfIdx]) + " [TAT DEN]", "Da nhat du so luong!", "Cho san pham tiep theo..", ">> San sang!");
      currentTargetShelf = -1;
    }
    return;
  }

  // 3. LỆNH BẤM CÒI ĐỊNH VỊ TÌM KỆ
  if (action == "SMARTKEY_CHIRP" || action == "HORN" || action == "CHIRP") {
    int shelfIdx = parseColdShelfIndex(shelfCode);
    if (shelfIdx < 0 && currentTargetShelf >= 0) {
      shelfIdx = currentTargetShelf;
    }

    if (shelfIdx >= 0) {
      Serial.println("\n>> 🔊 [BẤM CÒI ĐỊNH VỊ] Kệ " + String(SHELF_NAMES[shelfIdx]) + " kêu Pip-Pip!");

      // Âm thanh 2 nhịp "TÍT - TÍT!" dứt khoát tìm vị trí
      beepShelf(shelfIdx, 2500, 75);
      delay(45);
      beepShelf(shelfIdx, 3200, 110);

      // Loa cửa phòng cũng đệm 1 tiếng bíp nhẹ
      beepDoor(2000, 50);

      showScreen("DINH VI AM THANH", "Ke: " + String(SHELF_NAMES[shelfIdx]), ">> [COI TIT-TIT!]", "Phat am thanh xong", "T: " + String(currentTemp, 1) + "C [AN TOAN]");
    }
    return;
  }

  // 4. LỆNH HOÀN TẤT ĐƠN
  if (action == "COMPLETE" || action == "RESET") {
    currentState = STATUS_IDLE;
    turnOffAllLEDs();
    muteAllBuzzers();
    beepDoor(1500, 250);
    currentTargetShelf = -1;
    showScreen("PHONG KHO LANH (GV)", "HOAN TAT DON HANG!", "Nhiet do: " + String(currentTemp, 1) + " C", "Do am:    " + String(currentHum, 1) + " %", ">> Standby..");
    return;
  }
}

// ================= SETUP =================
void setupWiFi() {
  showScreen("KHO LANH (WH-006)", "Connecting WiFi:", "Wokwi-GUEST", "Vui long cho...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
}

void reconnectMQTT() {
  while (!client.connected()) {
    String clientId = "CityMart-ColdRoom-" + String(random(0xffff), HEX);
    Serial.print("Connecting MQTT...");
    showScreen("KHO LANH (WH-006)", "Connecting MQTT:", mqtt_server, "Node: " + clientId.substring(0, 16));

    if (client.connect(clientId.c_str())) {
      Serial.println(" CONNECTED!");
      client.subscribe(TOPIC_COMMAND_GV);
      client.subscribe(TOPIC_COMMAND_WH006);

      showScreen("PHONG KHO LANH (GV)", "Tieu chuan: 0C ~ 4C", "3 Ke: A1, A2, A3", "Cam bien DHT22: Ready", ">> Standby..");
      beepDoor(1800, 100);
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Khởi tạo Dải 3 LED Kệ Phòng Lạnh
  strip.begin();
  strip.setBrightness(255);
  strip.show(); // Ban đầu tắt đèn

  // Cấu hình 3 Nút bấm trực tiếp tại kệ A1, A2, A3
  for (int i = 0; i < 3; i++) {
    pinMode(SHELF_BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(BTN_MASTER, INPUT_PULLUP);

  // Khởi tạo LOA LỚN ngoài cửa phòng lạnh
  pinMode(BUZZER_DOOR, OUTPUT);
  noTone(BUZZER_DOOR);

  // Khởi tạo 3 LOA NHỎ tại 3 kệ hàng
  for (int i = 0; i < 3; i++) {
    pinMode(SHELF_BUZZER_PINS[i], OUTPUT);
    noTone(SHELF_BUZZER_PINS[i]);
  }

  // Khởi động Cảm biến DHT22 Kho Lạnh
  dht.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 failed"));
    for (;;);
  }
  display.clearDisplay();
  showScreen("PHONG KHO LANH", "Khoi dong Node IoT", "Zone: MAT (0C ~ 4C)", "350 Quang Trung, GV");

  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

// ================= LOOP =================
void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  unsigned long currentMillis = millis();

  // 1. NHÁY ĐÈN TẠI ĐÚNG KỆ ĐANG TÌM (MẶC ĐỊNH CHỈ NHÁY ĐÈN, KHI BẤM SMARTKEY TRÊN APP MỚI KÊU CÒI)
  if (currentState == STATUS_LOCATING && currentTargetShelf >= 0 && currentTargetShelf < NUM_SHELVES) {
    if (currentMillis - lastBlinkTime >= BLINK_INTERVAL) {
      lastBlinkTime = currentMillis;
      blinkState = !blinkState;

      strip.setPixelColor(currentTargetShelf, blinkState ? getColdZoneColor() : 0);
      strip.show();
    }
  }

  // 2. QUÉT NÚT BẤM TẠI TỪNG KỆ A1, A2, A3 VÀ NÚT CỬA PHÒNG
  int pressed = scanShelfButtons();

  if (pressed != lastPressed) {
    lastDebounceTime = currentMillis;
  }

  if ((currentMillis - lastDebounceTime) > debounceDelay) {
    if (pressed != -1) {
      // Trường hợp bấm NÚT CỬA PHÒNG (MASTER BUTTON - GPIO 33)
      if (pressed == -99) {
        if (isClimateAlarm) {
          // Bấm nút cửa phòng để TẮT TIẾNG TẤT CẢ CÁC LOA TẠM THỜI (MUTE ALARM)
          alarmMuted = !alarmMuted;
          muteTime = currentMillis;
          muteAllBuzzers();
          Serial.println(alarmMuted ? "\n[MUTE] Nhan vien da an nut Master de tat toan bo loa tam thoi." : "\n[UNMUTE] Bat lai coi bao dong.");
          beepDoor(2000, 80);
        } else if (currentState == STATUS_LOCATING && currentTargetShelf >= 0) {
          pressed = currentTargetShelf; // Quick check-in tại cửa
        }
      }

      // Xử lý check-in khi đang định vị tìm kệ
      if (currentState == STATUS_LOCATING) {
        // Bấm đúng nút kệ đang tìm
        if (pressed == currentTargetShelf) {
          Serial.println("\n[CHECK-IN THÀNH CÔNG] Nhân viên đã đến đúng Kệ " + String(SHELF_NAMES[currentTargetShelf]) + " trong Phòng Lạnh!");

          muteAllBuzzers();
          beepShelf(currentTargetShelf, 3000, 100);

          currentState = STATUS_ARRIVED;
          strip.setPixelColor(currentTargetShelf, getColdZoneColor());
          strip.show();

          // Bắn MQTT thông báo nhân viên đã đến kệ
          DynamicJsonDocument eventDoc(256);
          eventDoc["event"] = "STAFF_ARRIVED";
          eventDoc["warehouseCode"] = "WH-006";
          eventDoc["zone"] = "ZONE MAT (COLD)";
          eventDoc["shelfCode"] = SHELF_NAMES[currentTargetShelf];
          eventDoc["message"] = "Nhan vien da check-in tai " + String(SHELF_NAMES[currentTargetShelf]);
          eventDoc["timestamp"] = currentMillis;

          char buf[256];
          serializeJson(eventDoc, buf);
          client.publish(TOPIC_EVENT_GV, buf);
          client.publish(TOPIC_EVENT_WH006, buf);

          showScreen("DA DEN: " + String(SHELF_NAMES[currentTargetShelf]), "Phong Kho Lanh (0-4C)", "Check-in thanh cong!", "Moi quet Barcode hang..", "[Den sang - Dang soan]");
        }
        // Bấm nhầm kệ khác trong phòng lạnh
        else if (pressed >= 0 && pressed < 3 && pressed != currentTargetShelf) {
          beepShelf(pressed, 600, 300); // Loa nhỏ tại kệ bấm nhầm kêu cảnh báo lỗi
          showScreen("CANH BAO SAI KE!", "Ban bam: " + String(SHELF_NAMES[pressed]), "Don hang tai: " + String(SHELF_NAMES[currentTargetShelf]), "Vui long di dung ke!", "[Coi canh bao]");
          delay(1200);

          String header = "PHONG LANH - " + String(SHELF_NAMES[currentTargetShelf]);
          String line1 = "SP: " + removeAccents(currentProduct);
          String line2 = "SL: " + String(currentQty) + " mon [DANG NHAY]";
          String line3 = "Nhiet do phong: " + String(currentTemp, 1) + " C";
          showScreen(header, line1, line2, line3, ">> Nhan nut tai " + String(SHELF_NAMES[currentTargetShelf]));
        }
      }
    }
  }
  lastPressed = pressed;

  // 3. ĐỌC CẢM BIẾN NHIỆT ĐỘ & ĐỘ ẨM DHT22 CHO PHÒNG KHO LẠNH
  if (currentMillis - lastDhtTime >= DHT_INTERVAL) {
    lastDhtTime = currentMillis;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      currentTemp = t;
      currentHum = h;
    }

    // Đánh giá vi phạm ngưỡng an toàn:
    // Kho Lạnh: Chuẩn 0.0°C ~ 4.5°C | Độ ẩm 55.0% ~ 85.0%
    bool breach = (currentTemp > 4.5 || currentTemp < 0.0 || currentHum > 85.0 || currentHum < 50.0);

    if (breach) {
      if (!isClimateAlarm) {
        Serial.println("\n🚨 [KHO LẠNH NGUY CẤP] PHÁT HIỆN VƯỢT NGƯỠNG AN TOÀN!");
        Serial.println("   Nhiệt độ: " + String(currentTemp, 1) + "°C | Độ ẩm: " + String(currentHum, 1) + "%");
      }
      isClimateAlarm = true;
    } else {
      if (isClimateAlarm) {
        Serial.println("\n✅ [KHO LẠNH PHỤC HỒI] Môi trường đã trở về an toàn!");
        display.invertDisplay(false);
        muteAllBuzzers();
        turnOffAllLEDs();
        beepDoor(2000, 100);
        delay(120);
        beepDoor(2500, 200);
      }
      isClimateAlarm = false;
      alarmMuted = false;
    }

    // Khi ở trạng thái rảnh và MÔI TRƯỜNG AN TOÀN, hiển thị giám sát nhiệt độ từng sản phẩm
    if (currentState == STATUS_IDLE && !isClimateAlarm) {
      display.invertDisplay(false);
      int sA1 = getProductSafetyStatus(0, currentTemp);
      int sA2 = getProductSafetyStatus(1, currentTemp);
      int sA3 = getProductSafetyStatus(2, currentTemp);

      String header = "KHO LANH: " + String(currentTemp, 1) + "C | " + String((int)currentHum) + "%";
      String l1 = "A1-Thit (0-4C): " + String(sA1 == 0 ? "[AN TOAN]" : (sA1 > 0 ? "[QUA NHIET]" : "[DONG BANG]"));
      String l2 = "A2-Sua  (2-6C): " + String(sA2 == 0 ? "[AN TOAN]" : (sA2 > 0 ? "[QUA NHIET]" : "[DONG BANG]"));
      String l3 = "A3-Rau  (2-8C): " + String(sA3 == 0 ? "[AN TOAN]" : (sA3 > 0 ? "[QUA NHIET]" : "[DONG BANG]"));
      showScreen(header, l1, l2, l3, ">> 3 Ke A1..A3 [San sang]");
    }
  }

  // 4. BÁO ĐỘNG LIÊN TỤC KHI VƯỢT NGƯỠNG AN TOÀN (CONTINUOUS SOUND & SCREEN ALARM)
  if (isClimateAlarm) {
    if (currentMillis - lastAlarmSirenTime >= ALARM_SIREN_INTERVAL) {
      lastAlarmSirenTime = currentMillis;
      alarmBlinkState = !alarmBlinkState;

      // A. MÀN HÌNH CHỚP ĐẢO MÀU ĐEN/TRẮNG LIÊN TỤC (STROBE INVERT)
      display.invertDisplay(alarmBlinkState);

      // B. ÂM THANH BÁO ĐỘNG: LOA LỚN CỬA PHÒNG HÚ DỒN DẬP + 3 LOA KỆ CÙNG HÚ ĐỒNG BỘ
      if (!alarmMuted) {
        int sirenFreq = alarmBlinkState ? 2600 : 1800;
        // Loa lớn ngoài cửa hú to
        tone(BUZZER_DOOR, sirenFreq);
        // Cả 3 loa nhỏ tại kệ cũng cùng hú
        for (int i = 0; i < 3; i++) {
          tone(SHELF_BUZZER_PINS[i], sirenFreq);
        }
      } else {
        muteAllBuzzers();
        if (currentMillis - muteTime > MUTE_DURATION) {
          alarmMuted = false; // Tự bật lại sau 20s nếu nhiệt độ vẫn vi phạm
        }
      }

      // C. CẢ 3 ĐÈN KỆ CHỚP ĐỎ RỰC (NẾU KHÔNG CÓ ĐƠN ĐANG NHẶT)
      if (currentState != STATUS_LOCATING && currentState != STATUS_ARRIVED) {
        for (int i = 0; i < NUM_SHELVES; i++) {
          strip.setPixelColor(i, alarmBlinkState ? strip.Color(255, 0, 0) : 0);
        }
        strip.show();
      }

      // D. VẼ NỘI DUNG CẢNH BÁO NGUY CẤP LÊN MÀN HÌNH OLED
      String tWarning = (currentTemp > 4.5) ? "[QUA NHIET NGUY!]" : (currentTemp < 0.0 ? "[DONG BANG NGUY!]" : "[NHIET: ON]");
      String hWarning = (currentHum > 85.0) ? "[AM CAO MOI MOC!]" : (currentHum < 50.0 ? "[QUA KHO HEO UA!]" : "[DO AM: ON]");

      display.clearDisplay();
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);

      display.setCursor(0, 0);
      display.println("! BAO DONG KHO LANH !");
      display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

      display.setCursor(0, 13);
      display.println("T: " + String(currentTemp, 1) + "C >> " + tWarning);

      display.setCursor(0, 25);
      display.println("H: " + String(currentHum, 1) + "% >> " + hWarning);

      display.setCursor(0, 37);
      display.println("NGUY CO: HONG THUC PHAM");

      display.setCursor(0, 50);
      display.println(alarmMuted ? "[DA TAT COI TAM THOI]" : ">> BAM NUT CUA DE TAT");

      display.display();
    }
  }

  // 5. BẮN MQTT TELEMETRY GIÁM SÁT KHO LẠNH LÊN DASHBOARD
  if (currentMillis - lastTelemTime >= TELEM_INTERVAL) {
    lastTelemTime = currentMillis;

    DynamicJsonDocument telemDoc(512);
    telemDoc["warehouseCode"] = "WH-006";
    telemDoc["room"] = "PHONG_KHO_LANH";
    telemDoc["zone"] = "COLD";
    telemDoc["temperature"] = round(currentTemp * 10) / 10.0;
    telemDoc["humidity"] = round(currentHum * 10) / 10.0;

    JsonObject products = telemDoc.createNestedObject("productStandards");
    products["A1_Meat_CP"] = (getProductSafetyStatus(0, currentTemp) == 0) ? "SAFE (0-4C)" : "BREACH";
    products["A2_Milk_DaLat"] = (getProductSafetyStatus(1, currentTemp) == 0) ? "SAFE (2-6C)" : "BREACH";
    products["A3_Veggie_VietGAP"] = (getProductSafetyStatus(2, currentTemp) == 0) ? "SAFE (2-8C)" : "BREACH";

    bool anyViolation = (getProductSafetyStatus(0, currentTemp) != 0 || getProductSafetyStatus(1, currentTemp) != 0 || getProductSafetyStatus(2, currentTemp) != 0);
    telemDoc["status"] = anyViolation ? "VIOLATION" : "NORMAL";
    telemDoc["timestamp"] = currentMillis;

    char telemBuf[512];
    serializeJson(telemDoc, telemBuf);

    client.publish(TOPIC_TELEMETRY_COLD, telemBuf);
    client.publish(TOPIC_TELEMETRY_GEN, telemBuf);
    client.publish("warehouse/COLD/temperature", String(currentTemp, 2).c_str());
    client.publish("warehouse/COLD/humidity", String(currentHum, 2).c_str());
  }
}
