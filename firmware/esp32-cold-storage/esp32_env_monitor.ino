#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🏢 CITYMART SMART WAREHOUSE - NODE GIÁM SÁT MÔI TRƯỜNG KHO LẠNH (WH-006)
// PHẦN CỨNG TỐI GIẢN: 1 ESP32 + 1 CẢM BIẾN NHIỆT ẨM SHT30 + 1 MÀN HÌNH OLED
// Giao tiếp: Toàn bộ chỉ dùng đúng 2 chân I2C (GPIO 21 SDA & GPIO 22 SCL)
// =========================================================================

// ================= CẤU HÌNH WIFI & MQTT =================
const char* WIFI_SSID     = "YOUR_WIFI_NAME";     // Tên WiFi (2.4GHz)
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Mật khẩu WiFi

// MQTT Broker (Mặc định dùng EMQX Public Cloud, hoặc đổi thành IP máy tính bạn)
const char* MQTT_SERVER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

// Topics Telemetry gửi dữ liệu về Dashboard và Backend IoT Service
const char* TOPIC_TELEMETRY_GEN   = "citymart/warehouse/GV/environment/telemetry";
const char* TOPIC_TELEMETRY_COLD  = "citymart/warehouse/GV/zone/COLD/telemetry";
const char* TOPIC_TEMP_RAW        = "warehouse/COLD/temperature";
const char* TOPIC_HUM_RAW         = "warehouse/COLD/humidity";

// ================= SƠ ĐỒ CHÂN I2C =================
#define I2C_SDA_PIN   21  // SDA: Dây Trắng/Xanh SHT30 + Chân SDA của OLED
#define I2C_SCL_PIN   22  // SCL: Dây Vàng SHT30        + Chân SCL của OLED

// Địa chỉ I2C
#define OLED_ADDR     0x3C
#define SHT30_ADDR    0x44

// Cấu hình màn hình OLED 0.96 inch SSD1306
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Ngưỡng tiêu chuẩn kho mát thực phẩm (0°C ~ 4.5°C, 50% ~ 85%)
const float TEMP_MIN_SAFE = 0.0;
const float TEMP_MAX_SAFE = 4.5;
const float HUM_MIN_SAFE  = 50.0;
const float HUM_MAX_SAFE  = 85.0;

// Biến lưu dữ liệu đo
float currentTemp = 0.0;
float currentHum  = 0.0;
bool isSensorOK   = false;
bool isAlarm      = false;

unsigned long lastReadTime  = 0;
const unsigned long READ_INTERVAL = 2000;  // Đọc cảm biến mỗi 2 giây

unsigned long lastMqttTime  = 0;
const unsigned long MQTT_INTERVAL = 5000;  // Bắn dữ liệu MQTT mỗi 5 giây

WiFiClient espClient;
PubSubClient client(espClient);

// ================= HÀM ĐỌC CẢM BIẾN SHT30 (I2C) =================
bool readSHT30(float &temp, float &hum) {
  Wire.beginTransmission(SHT30_ADDR);
  Wire.write(0x2C); // Đo chế độ lặp lại cao (High repeatability)
  Wire.write(0x06);
  if (Wire.endTransmission() != 0) {
    return false; // Lỗi truyền thông I2C
  }

  delay(15); // Chờ 15ms để cảm biến hoàn tất phép đo

  Wire.requestFrom((uint8_t)SHT30_ADDR, (uint8_t)6);
  if (Wire.available() == 6) {
    uint8_t data[6];
    for (int i = 0; i < 6; i++) {
      data[i] = Wire.read();
    }

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

// ================= HIỂN THỊ MÀN HÌNH DASHBOARD OLED =================
void updateOLED(float temp, float hum, bool sensorOk, bool wifiOk, bool alarm) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // 1. THANH TIÊU ĐỀ TRÊN CÙNG (HEADER)
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("CITYMART KHO LANH");

  // Icon trạng thái WiFi góc phải
  display.setCursor(110, 0);
  display.print(wifiOk ? "WF" : "--");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  if (!sensorOk) {
    display.setCursor(10, 25);
    display.setTextSize(1);
    display.println("DANG TIM SHT30...");
    display.setCursor(10, 42);
    display.println("Kiem tra day I2C!");
    display.display();
    return;
  }

  // 2. KHU VỰC HIỂN THỊ NHIỆT ĐỘ (CHỮ TO NỔI BẬT)
  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print("Nhiet do: ");

  display.setTextSize(2);
  display.setCursor(62, 13);
  display.print(temp, 1);
  display.setTextSize(1);
  display.print(" ");
  display.drawCircle(display.getCursorX() + 2, 14, 2, SSD1306_WHITE); // Ký hiệu độ °
  display.setCursor(display.getCursorX() + 6, 16);
  display.print("C");

  // 3. KHU VỰC HIỂN THỊ ĐỘ ẨM
  display.setTextSize(1);
  display.setCursor(0, 34);
  display.print("Do am:    ");
  display.setTextSize(2);
  display.setCursor(62, 31);
  display.print((int)hum);
  display.setTextSize(1);
  display.print(" %");

  display.drawLine(0, 50, 127, 50, SSD1306_WHITE);

  // 4. THANH TRẠNG THÁI DƯỚI CÙNG (FOOTER)
  display.setTextSize(1);
  display.setCursor(0, 54);
  if (alarm) {
    display.print("! CANH BAO QUANHIET !");
  } else {
    display.print(">> KHO LANH: AN TOAN");
  }

  // Hiệu ứng đảo màu chớp cảnh báo nếu vượt ngưỡng
  if (alarm) {
    static bool inv = false;
    inv = !inv;
    display.invertDisplay(inv);
  } else {
    display.invertDisplay(false);
  }

  display.display();
}

// ================= KẾT NỐI WIFI =================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(400);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi chua ket noi. Chay che do Offline hien thi tai cho!");
  }
}

// ================= KẾT NỐI MQTT =================
void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED || client.connected()) return;

  String clientId = "CityMart-EnvNode-" + String(random(0xffff), HEX);
  Serial.print("Connecting MQTT: ");
  Serial.println(MQTT_SERVER);

  if (client.connect(clientId.c_str())) {
    Serial.println(">> MQTT CONNECTED!");
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=============================================");
  Serial.println("  CITYMART WH-006 - NODE GIÁM SÁT MÔI TRƯỜNG ");
  Serial.println("   [ 1 ESP32 + 1 SHT30 + 1 OLED SSD1306 ]     ");
  Serial.println("=============================================");

  // Khởi động giao tiếp I2C với chân GPIO 21 (SDA) và GPIO 22 (SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // Khởi động màn hình OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("[LỖI] Không tìm thấy OLED tại 0x3C!"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 15);
    display.println("CITYMART IOT NODE");
    display.setCursor(10, 30);
    display.println("Kho Lanh (WH-006)");
    display.setCursor(10, 45);
    display.println("Khoi dong...");
    display.display();
    delay(1500);
  }

  // Kết nối WiFi & cấu hình MQTT
  connectWiFi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
}

// ================= LOOP =================
void loop() {
  // Duy trì kết nối mạng
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      connectMQTT();
    }
    client.loop();
  }

  unsigned long currentMillis = millis();

  // 1. ĐỌC CẢM BIẾN ĐỊNH KỲ MỖI 2 GIÂY
  if (currentMillis - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentMillis;

    float t, h;
    if (readSHT30(t, h)) {
      currentTemp = t;
      currentHum = h;
      isSensorOK = true;

      // Đánh giá vượt ngưỡng kho lạnh
      isAlarm = (currentTemp > TEMP_MAX_SAFE || currentTemp < TEMP_MIN_SAFE || 
                 currentHum > HUM_MAX_SAFE   || currentHum < HUM_MIN_SAFE);

      Serial.print("[SHT30] Nhiệt độ: ");
      Serial.print(currentTemp, 1);
      Serial.print(" °C | Độ ẩm: ");
      Serial.print(currentHum, 1);
      Serial.print(" % | Trạng thái: ");
      Serial.println(isAlarm ? "[CANH BAO VI PHAM!]" : "[AN TOAN]");
    } else {
      isSensorOK = false;
      Serial.println("[SHT30] Khong doc duoc cam bien I2C! Kiem tra lai day.");
    }

    // Cập nhật lên màn hình OLED
    updateOLED(currentTemp, currentHum, isSensorOK, (WiFi.status() == WL_CONNECTED), isAlarm);
  }

  // 2. BẮN MQTT TELEMETRY MỖI 5 GIÂY LÊN SERVER
  if (currentMillis - lastMqttTime >= MQTT_INTERVAL) {
    lastMqttTime = currentMillis;

    if (client.connected() && isSensorOK) {
      DynamicJsonDocument doc(512);
      doc["warehouseCode"] = "WH-006";
      doc["room"] = "PHONG_KHO_LANH";
      doc["zone"] = "COLD";
      doc["temperature"] = round(currentTemp * 10) / 10.0;
      doc["humidity"] = round(currentHum * 10) / 10.0;
      doc["status"] = isAlarm ? "VIOLATION" : "NORMAL";
      doc["timestamp"] = currentMillis;

      JsonObject standards = doc.createNestedObject("productStandards");
      standards["A1_Meat_CP"] = (currentTemp >= 0.0 && currentTemp <= 4.0) ? "SAFE" : "BREACH";
      standards["A2_Milk_DaLat"] = (currentTemp >= 2.0 && currentTemp <= 6.0) ? "SAFE" : "BREACH";
      standards["A3_Veggie_VietGAP"] = (currentTemp >= 2.0 && currentTemp <= 8.0) ? "SAFE" : "BREACH";

      char buf[512];
      serializeJson(doc, buf);

      client.publish(TOPIC_TELEMETRY_GEN, buf);
      client.publish(TOPIC_TELEMETRY_COLD, buf);
      client.publish(TOPIC_TEMP_RAW, String(currentTemp, 1).c_str());
      client.publish(TOPIC_HUM_RAW, String(currentHum, 1).c_str());

      Serial.println(">> [MQTT] Da gui Telemetry len Dashboard thanh cong!");
    }
  }
}

