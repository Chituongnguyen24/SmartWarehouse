#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// =========================================================================
// CHUONG TRINH TEST: NÚT BẤM MODULE 3 CHÂN (VCC, GND, OUT)
// HỖ TRỢ CẢ ACTIVE LOW LẪN ACTIVE HIGH
// =========================================================================

#define I2C_SDA_PIN       21
#define I2C_SCL_PIN       22
#define OLED_ADDR         0x3C
#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64

#define PIN_BUZ_1   18
#define PIN_LED_1   25
#define PIN_BTN_1   27

#define PIN_BUZ_2   19
#define PIN_LED_2   26
#define PIN_BTN_2   14

#define PIN_BUZ_3   23
#define PIN_LED_3   32
#define PIN_BTN_3   33

#define BUZZER_ON   LOW
#define BUZZER_OFF  HIGH

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool hasOled = false;

bool active[3] = {true, true, true}; // Khởi động bật cả 3

void setShelf(int idx, bool on) {
  active[idx] = on;
  if (idx == 0) {
    digitalWrite(PIN_LED_1, on ? HIGH : LOW);
    digitalWrite(PIN_BUZ_1, on ? BUZZER_ON : BUZZER_OFF);
  } else if (idx == 1) {
    digitalWrite(PIN_LED_2, on ? HIGH : LOW);
    digitalWrite(PIN_BUZ_2, on ? BUZZER_ON : BUZZER_OFF);
  } else if (idx == 2) {
    digitalWrite(PIN_LED_3, on ? HIGH : LOW);
    digitalWrite(PIN_BUZ_3, on ? BUZZER_ON : BUZZER_OFF);
  }
}

void updateDisplay(const char* extraMsg = "") {
  if (!hasOled) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("TEST 3 GIAN - NUT 3 CHAN");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  for (int i = 0; i < 3; i++) {
    display.setCursor(0, 14 + i * 12);
    display.printf("Gian %d: %s", i + 1, active[i] ? "BAT" : "TAT");
  }

  display.setCursor(0, 52);
  display.println(extraMsg);
  display.display();
}

int lastB1 = -1, lastB2 = -1, lastB3 = -1, lastB13 = -1;

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_LED_1, OUTPUT);
  pinMode(PIN_LED_2, OUTPUT);
  pinMode(PIN_LED_3, OUTPUT);

  pinMode(PIN_BUZ_1, OUTPUT);
  pinMode(PIN_BUZ_2, OUTPUT);
  pinMode(PIN_BUZ_3, OUTPUT);

  // Module 3 chân có mạch đệm riêng -> Cấu hình INPUT chuẩn
  pinMode(PIN_BTN_1, INPUT);
  pinMode(PIN_BTN_2, INPUT);
  pinMode(PIN_BTN_3, INPUT);
  pinMode(13, INPUT);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    hasOled = true;
  }

  // Đọc giá trị ban đầu để tự thích ứng Active HIGH hay Active LOW
  lastB1 = digitalRead(PIN_BTN_1);
  lastB2 = digitalRead(PIN_BTN_2);
  lastB3 = digitalRead(PIN_BTN_3);
  lastB13 = digitalRead(13);

  // Bật cả 3 giàn lên
  setShelf(0, true);
  setShelf(1, true);
  setShelf(2, true);
  updateDisplay("BAT CA 3 GIAN");

  Serial.println(">>> DA BAT CA 3 GIAN!");
  Serial.printf("Trang thai nut ban dau: N1=%d, N2=%d, N3(33)=%d, N13=%d\n", lastB1, lastB2, lastB3, lastB13);
}

void loop() {
  int b1 = digitalRead(PIN_BTN_1);
  int b2 = digitalRead(PIN_BTN_2);
  int b3 = digitalRead(PIN_BTN_3);
  int b13 = digitalRead(13);

  // Bất kỳ khi nào trạng thái chân thay đổi (dù bấm là LOW hay HIGH) -> Đều nhận lệnh
  if (b1 != lastB1) {
    delay(35);
    b1 = digitalRead(PIN_BTN_1);
    if (b1 != lastB1) {
      setShelf(0, !active[0]);
      Serial.printf("[NUT 1] Thay doi -> Gian 1: %s (gia tri pin=%d)\n", active[0] ? "BAT" : "TAT", b1);
      updateDisplay("Nut 1 da bam!");
      lastB1 = b1;
    }
  }

  if (b2 != lastB2) {
    delay(35);
    b2 = digitalRead(PIN_BTN_2);
    if (b2 != lastB2) {
      setShelf(1, !active[1]);
      Serial.printf("[NUT 2] Thay doi -> Gian 2: %s (gia tri pin=%d)\n", active[1] ? "BAT" : "TAT", b2);
      updateDisplay("Nut 2 da bam!");
      lastB2 = b2;
    }
  }

  // Kiểm tra chân 33 (Nút 3)
  if (b3 != lastB3) {
    delay(35);
    b3 = digitalRead(PIN_BTN_3);
    if (b3 != lastB3) {
      setShelf(2, !active[2]);
      Serial.printf("[NUT 3 - GPIO 33] Thay doi -> Gian 3: %s (gia tri pin=%d)\n", active[2] ? "BAT" : "TAT", b3);
      updateDisplay("Nut 3 da bam!");
      lastB3 = b3;
    }
  }

  // Kiểm tra nếu cắm nhầm sang chân 13
  if (b13 != lastB13) {
    delay(35);
    b13 = digitalRead(13);
    if (b13 != lastB13) {
      setShelf(2, !active[2]);
      Serial.printf("[NUT 3 - GPIO 13] Thay doi -> Gian 3: %s (gia tri pin=%d)\n", active[2] ? "BAT" : "TAT", b13);
      updateDisplay("Nut 3 o GPIO 13!");
      lastB13 = b13;
    }
  }

  // Nút BOOT trên bo ESP32 (GPIO 0)
  if (digitalRead(0) == LOW) {
    delay(50);
    if (digitalRead(0) == LOW) {
      setShelf(0, true);
      setShelf(1, true);
      setShelf(2, true);
      updateDisplay("BAT LAI CA 3");
      while(digitalRead(0) == LOW);
    }
  }
}
