#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_NeoPixel.h>
#include <DHT.h>

// =========================================================================
// CITYMART SMART WAREHOUSE - BÀI TEST CHẨN ĐOÁN PHẦN CỨNG (OFFLINE SMOKE TEST)
// Chức năng: Kiểm tra độc lập từng linh kiện (OLED, NeoPixel/LED, Buzzer, DHT, Nút bấm)
// Không cần kết nối WiFi / MQTT để dễ dàng phát hiện lỗi cắm dây!
// =========================================================================

// 1. OLED SSD1306 (I2C: SDA=GPIO 21, SCL=GPIO 22)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// 2. NeoPixel WS2812B (Pin 13, 3 LEDs tượng trưng Kệ A1, A2, A3)
#define NEOPIXEL_PIN  13
#define NUM_LEDS      3
Adafruit_NeoPixel strip(NUM_LEDS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

// 3. DHT22 / DHT11 (Pin 5)
#define DHTPIN        5
#define DHTTYPE       DHT22 // Đổi thành DHT11 nếu bạn dùng cảm biến màu xanh dương DHT11
DHT dht(DHTPIN, DHTTYPE);

// 4. Buzzer Còi báo (Pin 32)
#define BUZZER_PIN    32

// 5. Nút bấm (Buttons)
const int BTN_PINS[3] = {14, 27, 12}; // Kệ A1, A2, A3

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- [START] KIỂM TRA PHẦN CỨNG IOT KHO THÔNG MINH ---");

  // A. Khởi động OLED
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("[!] LỖI: Không tìm thấy màn hình OLED 0.96 (Địa chỉ 0x3C). Hãy kiểm tra chân SDA(21), SCL(22), VCC, GND.");
  } else {
    Serial.println("[OK] Màn hình OLED hoạt động tốt!");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(">> CITYMART IOT TEST");
    display.drawLine(0, 10, 127, 10, SSD1306_WHITE);
    display.setCursor(0, 16);
    display.println("Hardware Diagnostic");
    display.display();
  }

  // B. Khởi động NeoPixel LED
  strip.begin();
  strip.setBrightness(60); // 0 - 255
  strip.show();
  Serial.println("[OK] Đang chạy chu trình đổi màu LED RGB...");

  // Nháy thử từng LED: Xanh lá -> Vàng -> Đỏ
  strip.setPixelColor(0, strip.Color(0, 255, 0));   // Kệ A1 (Xanh lá)
  strip.setPixelColor(1, strip.Color(255, 200, 0)); // Kệ A2 (Vàng)
  strip.setPixelColor(2, strip.Color(0, 150, 255)); // Kệ A3 (Xanh dương)
  strip.show();
  delay(800);

  // C. Khởi động Còi Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.println("[OK] Kêu còi bíp bíp thử nghiệm...");
  tone(BUZZER_PIN, 1000);
  delay(100);
  noTone(BUZZER_PIN);
  delay(80);
  tone(BUZZER_PIN, 1500);
  delay(120);
  noTone(BUZZER_PIN);

  // D. Khởi động DHT
  dht.begin();

  // E. Cấu hình nút bấm (Internal Pullup)
  for (int i = 0; i < 3; i++) {
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }

  Serial.println("\n>> Mời bạn thử ấn các nút bấm (GPIO 14, 27, 12) trên mạch!");
}

void loop() {
  // 1. Đọc cảm biến nhiệt độ & độ ẩm mỗi 2 giây
  static unsigned long lastDhtRead = 0;
  static float temp = 0.0;
  static float hum = 0.0;

  if (millis() - lastDhtRead > 2000) {
    lastDhtRead = millis();
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      temp = t;
      hum = h;
      Serial.printf("[DHT] Nhiet do: %.1f C | Do am: %.1f %%\n", temp, hum);
    } else {
      Serial.println("[!] Lỗi đọc DHT! Kiểm tra dây DATA chân GPIO 5.");
    }

    // Hiển thị lên màn hình OLED
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(">> CITYMART HARDWARE");
    display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

    display.setCursor(0, 15);
    display.printf("Nhiet do: %.1f C", temp);
    display.setCursor(0, 27);
    display.printf("Do am:    %.1f %%", hum);

    display.setCursor(0, 42);
    display.println("Nhan nut 1/2/3 tren ke");
    display.setCursor(0, 53);
    display.println("de test phan hoi...");
    display.display();
  }

  // 2. Quét nút bấm
  for (int i = 0; i < 3; i++) {
    if (digitalRead(BTN_PINS[i]) == LOW) { // Nút được bấm (nối xuống GND)
      Serial.printf("[BUTTON] Da an nut Ke A%d (GPIO %d)!\n", i + 1, BTN_PINS[i]);
      
      // Sáng rực LED tương ứng
      strip.clear();
      strip.setPixelColor(i, strip.Color(255, 0, 0)); // Đỏ rực
      strip.show();

      // Kêu còi báo nhận diện nút
      tone(BUZZER_PIN, 2000);
      delay(80);
      noTone(BUZZER_PIN);

      // Hiển thị lên màn hình
      display.clearDisplay();
      display.setCursor(0, 18);
      display.setTextSize(2);
      display.printf("KE A%d OK!", i + 1);
      display.display();

      delay(300); // Chống dội phím (debounce)
      
      // Trả lại trạng thái LED bình thường
      strip.setPixelColor(0, strip.Color(0, 255, 0));
      strip.setPixelColor(1, strip.Color(255, 200, 0));
      strip.setPixelColor(2, strip.Color(0, 150, 255));
      strip.show();
    }
  }

  delay(20);
}

