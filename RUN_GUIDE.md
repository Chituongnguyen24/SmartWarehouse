# CẨM NANG KHỞI ĐỘNG DỰ ÁN SMARTWAREHOUSE (RUN GUIDE)

> Tài liệu tổng hợp toàn bộ câu lệnh khởi chạy hạ tầng, microservices backend, web portal và ứng dụng di động cho dự án Smart Food Warehouse Management System (SmartWarehouse).

---

## 1. KHỞI ĐỘNG HẠ TẦNG DOCKER (INFRASTRUCTURE)

Chạy từ thư mục gốc của dự án (`SmartWarehouse`):

```bash
# Khởi động toàn bộ container nền (Postgres, RabbitMQ, Redis, Mosquitto, InfluxDB, MinIO)
npm run infra:up

# Xem trạng thái hoạt động của các container
docker ps

# Dừng toàn bộ container
npm run infra:down

# Xem log theo thời gian thực của hạ tầng
npm run infra:logs
```

*Các dịch vụ mặc định:*
- **PostgreSQL**: `localhost:5432` (User/Password: `postgres`/`postgres`)
- **RabbitMQ Dashboard**: `http://localhost:15672` (User/Password: `guest`/`guest`)
- **Mosquitto MQTT**: `localhost:1883`
- **Redis Cache**: `localhost:6379`
- **MinIO Storage**: `http://localhost:9001` (Console)

---

## 2. KHỞI ĐỘNG BACKEND MICROSERVICES

Dự án thiết kế theo kiến trúc Microservices (NestJS). Bạn có thể chọn cách khởi động phù hợp với tài nguyên máy:

### Cách 1: Chạy theo nhóm phân hệ (Khuyên dùng cho máy RAM vừa/yếu)
```bash
# Nhóm 1 - Nghiệp vụ Nhân viên Kho (User, Outbound, Product, Inventory, Inbound)
npm run backend:staff

# Nhóm 2 - Nghiệp vụ Quản trị & Điều phối (Warehouse, Order, Report, Transport)
npm run backend:admin
```

### Cách 2: Chạy toàn bộ Backend cùng lúc (Máy có RAM >= 16GB)
```bash
npm run backend:all
```

### Cách 3: Chạy độc lập từng Microservice riêng lẻ
Mở terminal tại thư mục gốc và chạy:
```bash
npm run auth:start          # Auth Service (:3000)
npm run user:start          # User Service (:3001)
npm run product:start       # Product Service (:3002)
npm run inventory:start     # Inventory Service (:3003)
npm run order:start         # Order & Dispatch Service (:3004)
npm run warehouse:start     # Warehouse Service (:3005)
npm run inbound:start       # Inbound Receiving Service (:3006)
npm run outbound:start      # Outbound Service (:3007)
npm run report:start        # Report & Analytics Service (:3008)
npm run transport:start     # Transport & VRP Service (:3009)
npm run picking:start       # Picking & Pick-to-Light Service (:3010)
npm run packing:start       # Packing Service (:3011)
npm run delivery:start      # Delivery & Routing Service (:3012)
npm run tracking:start      # Tracking Service (:3013)
npm run notification:start  # Notification Service (:3014)
```

---

## 3. KHỞI ĐỘNG CÁC ỨNG DỤNG FRONTEND & MOBILE

### A. Web Quản Lý (Admin / Web Dashboard)
- **Công nghệ**: React, Vite, Tailwind CSS.
- **Cổng truy cập**: `http://localhost:5173`
```bash
npm run dashboard:start
# Hoặc: cd frontend/web-dashboard && npm run dev
```

---

### B. Ứng Dụng Tài Xế Giao Hàng (Driver App)
- **Công nghệ**: React Native (Expo SDK 54), Native Debug APK.

#### Chế độ Development Build (Hot Reload - Khuyên dùng khi code)
Áp dụng khi điện thoại đã được cài sẵn bản `app-debug.apk`:
```bash
# 1. Chuyển tiếp cổng kết nối USB sang điện thoại
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3004 tcp:3004 && adb reverse tcp:3007 tcp:3007

# 2. Bật Metro Bundler (chỉ nạp code JS, không cần biên dịch lại native)
npm run driver:dev
```
*Sau đó mở icon **C.T Mart Driver** trên màn hình điện thoại, code sẽ cập nhật tức thì.*

#### Biên dịch lại APK và nạp mới vào điện thoại (Khi thay đổi quyền Android / Thêm native module)
```bash
npm run driver:phone
# Hoặc: cd frontend/driver-app && npm run run:phone
```

---

### C. Ứng Dụng Nhân Viên Kho (Staff App)
- **Công nghệ**: React, Vite, Ionic / Capacitor.

```bash
# Chạy trên trình duyệt Web (dễ debug kiểm thử giao diện PDA)
npm run staff-web:start
# (Truy cập tại: http://localhost:5174)

# Chạy bản Native APK trực tiếp lên thiết bị di động / máy quét mã vạch
npm run staff:phone
```

---

### D. Cổng Khách Hàng (Customer Web & Customer App)
```bash
# Website mua sắm khách hàng (Customer Web)
npm run customer-web:start

# Ứng dụng di động khách hàng (Customer App Expo)
npm run customer:start
```

---

## 4. DỮ LIỆU MẪU & SCRIPTS GIẢ LẬP IOT

```bash
# Nạp dữ liệu sản phẩm mẫu (thực phẩm tươi mát) vào CSDL
npm run seed:products

# Xuất dữ liệu danh mục sản phẩm hiện có
npm run export:products

# Chạy script giả lập cân điện tử & cảm biến kệ hàng Pick-to-Light
node scripts/iot-shelf-simulator.js

# Theo dõi luồng gói tin MQTT từ các thiết bị IoT
node scripts/mqtt_monitor.js
```

---

## 5. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Lỗi cổng bị chiếm dụng (`EADDRINUSE: :::3004`, `:::5173`)
Nếu một tiến trình cũ bị treo và giữ cổng:
```powershell
# Tìm ID tiến trình (PID) đang chiếm cổng (ví dụ cổng 3004)
Get-NetTCPConnection -LocalPort 3004 | Select-Object OwningProcess

# Buộc dừng tiến trình đó (thay <PID> bằng mã số tìm được)
Stop-Process -Id <PID> -Force
```

### 2. Điện thoại không kết nối được Metro Bundler của Driver App
```bash
# Đảm bảo thiết bị đã nhận kết nối ADB
adb devices

# Chạy lại câu lệnh đảo cổng (Reverse Ports)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3004 tcp:3004
adb reverse tcp:3007 tcp:3007
```
Nếu mất kết nối qua USB: Trong menu ứng dụng (lắc điện thoại hoặc bấm nút DevSettings), nhập IP Wi-Fi máy tính: `<IP_MAY_TINH>:8081` (Ví dụ: `192.168.2.147:8081`).

