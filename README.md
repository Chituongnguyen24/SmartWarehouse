# CityMart - Smart Food Warehouse Management System

Dự án Hệ thống quản lý kho thực phẩm thông minh CityMart được xây dựng với kiến trúc Microservices và React Frontend hiện đại.

## Cấu trúc thư mục

```text
d:/KLTN/
├── docker-compose.yml          # Cấu hình hạ tầng (Postgres, Redis, RabbitMQ, InfluxDB, MinIO, Mosquitto)
├── package.json                # Root package.json quản lý toàn bộ workspace
├── backend/services/           # Các microservices
│   ├── auth-service            # Đăng nhập, phân quyền
│   ├── user-service            # Khách hàng, nhân viên, shipper
│   ├── product-service         # Quản lý sản phẩm
│   ├── inventory-service       # Tồn kho thời gian thực
│   ├── order-service           # Tạo và quản lý đơn hàng
│   ├── picking-service         # Sinh danh sách lấy hàng + tối ưu đường đi
│   ├── packing-service         # Đóng gói đơn hàng
│   ├── delivery-service        # Phân công shipper
│   ├── tracking-service        # Theo dõi trạng thái giao hàng
│   ├── notification-service    # Email, SMS, Push
│   └── report-service          # Dashboard, thống kê
└── frontend/web-dashboard/     # Giao diện người dùng (React, Vite) - Port 5173
```

## Yêu cầu cài đặt
- **Node.js** >= 18.x
- **Docker** và **Docker Compose**
- **npm** (được cài kèm Node.js)

---

## Hướng dẫn khởi chạy toàn bộ hệ thống

### Bước 1: Khởi động hệ thống cơ sở hạ tầng (Database, RabbitMQ...)
Mở terminal tại thư mục gốc `d:\KLTN` và chạy lệnh:
```bash
docker-compose up -d
```
Lệnh này sẽ khởi chạy toàn bộ database (11 DBs cho các dịch vụ), RabbitMQ, Redis, InfluxDB, MinIO.

### Bước 2: Cài đặt thư viện (Dependencies)
Cũng tại thư mục gốc `d:\KLTN`, chạy lệnh sau để cài đặt toàn bộ package cho backend và frontend:
```bash
npm install --legacy-peer-deps
```

### Bước 3: Khởi chạy Backend Services
Trong một terminal mới (tại `d:\KLTN`), chạy lệnh để khởi động đồng loạt các NestJS Microservices:
```bash
npm run backend:all
```
*(Nếu muốn chạy riêng lẻ, có thể sử dụng ví dụ: `npm run auth:start`, `npm run order:start`...)*

### Bước 4: Khởi chạy Frontend Web Dashboard
Mở thêm một terminal mới, chuyển hướng vào thư mục frontend và khởi chạy giao diện:
```bash
cd d:\KLTN\frontend\web-dashboard
npm run dev
```
Sau đó mở trình duyệt và truy cập: **[http://localhost:5173](http://localhost:5173)**

---

## Lỗi thường gặp (Troubleshooting)
1. **Lỗi Frontend báo trắng trang (Blank screen):**
   Nguyên nhân có thể do chưa cài đủ package cục bộ. Hãy làm các bước sau:
   ```bash
   cd frontend/web-dashboard
   npm install --no-workspaces
   npm run dev
   ```

2. **Lỗi xung đột Port:**
   Hãy chắc chắn rằng không có ứng dụng nào khác đang chạy trên các port từ `3001` đến `3013`, cũng như port `5173`, `5432` (Postgres), `5672` (RabbitMQ).
