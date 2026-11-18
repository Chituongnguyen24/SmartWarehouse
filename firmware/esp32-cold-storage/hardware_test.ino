#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// 🛠️ CHƯƠNG TRÌNH KIỂM TRA PHẦN CỨNG (HARDWARE DIAGNOSTIC TEST)
// Kiểm tra độc lập: I2C (OLED + SHT30) -> 4 Đèn LED -> 4 Còi -> 4 Nút Bấm
// =========================================================================

// Định nghĩa chân phần cứng
#define I2C_SDA_PIN     21
#define I2C_SCL_PIN     22

#define PIN_DOOR_BUZZER 23
#define PIN_DOOR_BTN    32
#define PIN_DOOR_LED    4

#define PIN_A1_LED      25
#define PIN_A1_BTN      33
#define PIN_A1_BUZZER   19

#define PIN_A2_LED      26
#define PIN_A2_BTN      14
#define PIN_A2_BUZZER   18

#define PIN_A3_LED      27
#define PIN_A3_BTN      13
#define PIN_A3_BUZZER   5

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool readSHT30(float &temp, float &hum) {
  Wire.beginTransmission(0x44);
  Wire.write(0x2C);
  Wire.write(0x06);
  if (Wire.endTransmission() != 0) return false;
  delay(15);
  Wire.requestFrom((uint8_t)0x44, (uint8_t)6);
  if (Wire.available() == 6) {
    uint8_t d[6];
    for (int i = 0; i < 6; i++) d[i] = Wire.read();
    uint16_t rawT = (d[0] << 8) | d[1];
    uint16_t rawH = (d[3] << 8) | d[4];
    temp = -45.0 + (175.0 * ((float)rawT / 65535.0));
    hum  = 100.0 * ((float)rawH / 65535.0);
    return true;
  }
  return false;
}

void testBeep(int pin, int ms) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=======================================================");
  Serial.println("  CITYMART WH-006 - CHƯƠNG TRÌNH TEST LINH KIỆN THỰC TẾ ");
  Serial.println("=======================================================");

  // Cấu hình chân Output
  pinMode(PIN_DOOR_LED, OUTPUT);
  pinMode(PIN_A1_LED, OUTPUT);
  pinMode(PIN_A2_LED, OUTPUT);
  pinMode(PIN_A3_LED, OUTPUT);

  pinMode(PIN_DOOR_BUZZER, OUTPUT);
  pinMode(PIN_A1_BUZZER, OUTPUT);
  pinMode(PIN_A2_BUZZER, OUTPUT);
  pinMode(PIN_A3_BUZZER, OUTPUT);

  // Cấu hình chân Input
  pinMode(PIN_DOOR_BTN, INPUT_PULLUP);
  pinMode(PIN_A1_BTN, INPUT_PULLUP);
  pinMode(PIN_A2_BTN, INPUT_PULLUP);
  pinMode(PIN_A3_BTN, INPUT_PULLUP);

  // Khởi động I2C
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // 1. Quét I2C bus
  Serial.println("\n[1] Đang quét I2C Bus trên GPIO 21 (SDA) & GPIO 22 (SCL)...");
  int nDevices = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("  -> Tìm thấy thiết bị I2C tại địa chỉ: 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      if (address == 0x3C) Serial.print(" (Màn hình OLED SSD1306)");
      if (address == 0x44 || address == 0x45) Serial.print(" (Cảm biến SHT30)");
      Serial.println();
      nDevices++;
    }
  }
  if (nDevices == 0) Serial.println("  -> Không tìm thấy thiết bị I2C nào! Kiểm tra lại dây SDA, SCL, VCC, GND.");

  // 2. Test OLED
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("TEST PHAN CUNG ESP32");
    display.drawLine(0, 10, 127, 10, SSD1306_WHITE);
    display.setCursor(0, 18);
    display.println("OLED: OK (0x3C)");
    display.display();
    Serial.println("\n[2] OLED: Kết nối OK!");
  } else {
    Serial.println("\n[2] OLED: Không tìm thấy!");
  }

  // 3. Test SHT30
  float t, h;
  if (readSHT30(t, h)) {
    Serial.println("\n[3] SHT30: Đọc thành công!");
    Serial.println("  -> Nhiệt độ: " + String(t, 1) + " °C");
    Serial.println("  -> Độ ẩm:    " + String(h, 1) + " %");
    display.setCursor(0, 30);
    display.println("SHT30: " + String(t, 1) + "C | " + String((int)h) + "%");
    display.display();
  } else {
    Serial.println("\n[3] SHT30: Chưa đọc được dữ liệu. Kiểm tra dây SHT30!");
    display.setCursor(0, 30);
    display.println("SHT30: LOI / CHUA CAM");
    display.display();
  }

  // 4. Test 4 Đèn LED & 4 Còi lần lượt
  Serial.println("\n[4] Kiểm tra 4 Đèn LED & 4 Còi (chạy lần lượt)...");
  
  // Cửa phòng
  Serial.println("  - Test Cửa: LED GPIO 4 + Buzzer GPIO 23");
  digitalWrite(PIN_DOOR_LED, HIGH);
  testBeep(PIN_DOOR_BUZZER, 100);
  delay(200);
  digitalWrite(PIN_DOOR_LED, LOW);

  // Kệ A1
  Serial.println("  - Test Kệ A1 (Đỏ): LED GPIO 25 + Buzzer GPIO 19");
  digitalWrite(PIN_A1_LED, HIGH);
  testBeep(PIN_A1_BUZZER, 100);
  delay(200);
  digitalWrite(PIN_A1_LED, LOW);

  // Kệ A2
  Serial.println("  - Test Kệ A2 (Xanh Dương): LED GPIO 26 + Buzzer GPIO 18");
  digitalWrite(PIN_A2_LED, HIGH);
  testBeep(PIN_A2_BUZZER, 100);
  delay(200);
  digitalWrite(PIN_A2_LED, LOW);

  // Kệ A3
  Serial.println("  - Test Kệ A3 (Xanh Lá): LED GPIO 27 + Buzzer GPIO 5");
  digitalWrite(PIN_A3_LED, HIGH);
  testBeep(PIN_A3_BUZZER, 100);
  delay(200);
  digitalWrite(PIN_A3_LED, LOW);

  display.setCursor(0, 46);
  display.println("Bam tung nut de test..");
  display.display();

  Serial.println("\n=======================================================");
  Serial.println("👉 BÂY GIỜ HÃY BẤM THỬ TỪNG NÚT BẤM:");
  Serial.println("   - Bấm Nút Đen (Cửa)  -> LED Cửa sáng + Còi Cửa kêu");
  Serial.println("   - Bấm Nút Đỏ (A1)    -> LED A1 sáng + Còi A1 kêu");
  Serial.println("   - Bấm Nút Xanh (A2)  -> LED A2 sáng + Còi A2 kêu");
  Serial.println("   - Bấm Nút Vàng (A3)  -> LED A3 sáng + Còi A3 kêu");
  Serial.println("=======================================================\n");
}

void loop() {
  // Test nút bấm tương tác trực tiếp
  bool btnDoor = (digitalRead(PIN_DOOR_BTN) == LOW);
  bool btnA1   = (digitalRead(PIN_A1_BTN) == LOW);
  bool btnA2   = (digitalRead(PIN_A2_BTN) == LOW);
  bool btnA3   = (digitalRead(PIN_A3_BTN) == LOW);

  digitalWrite(PIN_DOOR_LED, btnDoor ? HIGH : LOW);
  digitalWrite(PIN_DOOR_BUZZER, btnDoor ? HIGH : LOW);

  digitalWrite(PIN_A1_LED, btnA1 ? HIGH : LOW);
  digitalWrite(PIN_A1_BUZZER, btnA1 ? HIGH : LOW);

  digitalWrite(PIN_A2_LED, btnA2 ? HIGH : LOW);
  digitalWrite(PIN_A2_BUZZER, btnA2 ? HIGH : LOW);

  digitalWrite(PIN_A3_LED, btnA3 ? HIGH : LOW);
  digitalWrite(PIN_A3_BUZZER, btnA3 ? HIGH : LOW);

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 100) {
    lastPrint = millis();
    if (btnDoor || btnA1 || btnA2 || btnA3) {
      Serial.print("Nút đang bấm: ");
      if (btnDoor) Serial.print("[CỬA - GPIO 32] ");
      if (btnA1)   Serial.print("[KỆ A1 - GPIO 33] ");
      if (btnA2)   Serial.print("[KỆ A2 - GPIO 14] ");
      if (btnA3)   Serial.print("[KỆ A3 - GPIO 13] ");
      Serial.println();
    }
  }
}

