# 🛒 CityMart - Smart Food Warehouse Management System (SFWMS)

> **Hệ thống Quản lý Kho Thực phẩm Thông minh CityMart (SFWMS)**  
> Giải pháp chuyển đổi số toàn diện cho chuỗi cung ứng thực phẩm tươi sống & đông lạnh, kết hợp kiến trúc **Microservices (NestJS)**, **Digital Twin 3D (Three.js)**, **IoT Cold-Chain Monitoring**, **Chiến lược xuất kho FEFO**, và **Tối ưu định tuyến giao hàng (VRP)**.

---

## 📑 Mục lục
1. [Giới thiệu tổng quan](#-giới-thiệu-tổng-quan)
2. [Các tính năng nổi bật](#-các-tính-năng-nổi-bật)
3. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
4. [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
5. [Yêu cầu môi trường](#-yêu-cầu-môi-trường)
6. [Hướng dẫn cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
7. [Danh sách dịch vụ & Cổng kết nối (Ports)](#-danh-sách-dịch-vụ--cổng-kết-nối-ports)
8. [Tài khoản dùng thử (Demo Accounts)](#-tài-khoản-dùng-thử-demo-accounts)
9. [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
10. [Xử lý lỗi thường gặp (Troubleshooting)](#-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## 🌟 Giới thiệu tổng quan

**CityMart SFWMS** là nền tảng quản trị kho vận thực phẩm được thiết kế theo tiêu chuẩn công nghiệp hiện đại, giải quyết các bài toán đặc thù của chuỗi cung ứng thực phẩm:
- **Quản lý hạn sử dụng nghiêm ngặt theo lô (Lot / Batch & FEFO - First Expired, First Out)**.
- **Giám sát nhiệt độ/độ ẩm thời gian thực (Cold Chain IoT)** cho từng vùng kho (Kho lạnh âm sâu, Kho mát, Kho mát rau củ quả, Kho khô).
- **Mô phỏng không gian kho 3D (Digital Twin)** trực quan hoá vị trí kệ (Racks), sức chứa và trạng thái nhiệt độ.
- **Tối ưu hóa logistics & giao hàng (Vehicle Routing Problem - VRP)** hỗ trợ chia tuyến xe, tải trọng và gom đơn thông minh.

---

## ✨ Các tính năng nổi bật

- 🏢 **Digital Twin 3D Warehouse**: Xem trực quan mặt bằng kho, thông số kệ hàng, tình trạng đầy tải và cảnh báo nhiệt độ tức thì.
- 📦 **Quản lý Nhập - Xuất - Chuyển vị trí (Inbound / Outbound / Putaway / Picking)**: Hỗ trợ Wave/Batch Picking, in phiếu nhập xuất và biên bản kế toán.
- ❄️ **Giám sát IoT & Cảnh báo chuỗi lạnh (Cold-Chain)**: Thu thập dữ liệu cảm biến qua MQTT & InfluxDB, tự động kích hoạt cảnh báo khi nhiệt độ bất thường.
- 🚚 **Tối ưu vận chuyển & Giao hàng (Transport & VRP)**: Phân bổ xe tự động theo tải trọng, tính toán lộ trình tiết kiệm chi phí và theo dõi trạng thái giao hàng.
- 📈 **Báo cáo & Phân tích thông minh**: Thống kê tồn kho, tỷ lệ hao hụt thực phẩm, KPI xuất nhập và dự báo nhu cầu (Demand Forecasting).
- 👥 **Phân quyền người dùng đa cấp độ (RBAC)**: Tách biệt quyền hạn rõ ràng cho 6 vai trò: Admin, Quản lý kho, Nhân viên kho, Nhân viên bán hàng, Tài xế và Khách hàng.

---

## 🏛️ Kiến trúc hệ thống

Dự án được xây dựng dưới dạng **Monorepo (npm workspaces)** với kiến trúc **Event-Driven Microservices**:

```mermaid
flowchart TB
    subgraph Clients["Frontend Clients"]
        WEB["Web Dashboard (React + Vite)\nPort 5173"]
        CUST_WEB["Customer Web (Next.js)\nPort 3000"]
        APPS["Mobile Apps (Expo / React Native)\nCustomer / Driver / Staff App"]
    end

    subgraph Infra["Infrastructure (Docker Compose)"]
        PG[(PostgreSQL 15\n11+ Databases)]
        REDIS[(Redis 7)]
        RABBIT[(RabbitMQ)]
        MQTT[(Mosquitto MQTT)]
        INFLUX[(InfluxDB)]
        MINIO[(MinIO Storage)]
    end

    subgraph Services["NestJS Microservices"]
        AUTH["user-service (:3012)\nAuth & Users"]
        PROD["product-service (:3010)"]
        INV["inventory-service (:3011)"]
        WH["warehouse-service (:3005)"]
        INB["inbound-service (:3006)"]
        OUTB["outbound-service (:3007)"]
        ORD["order-service (:3004)"]
        TRANS["transport-service (:3013)"]
        REP["report-service (:3008)"]
        NOTIF["notification-service (:3004)"]
    end

    subgraph IoT["IoT & Simulators"]
        SIM["IoT Sensor Simulator\nMQTT Publisher"]
    end

    Clients --> Services
    Services --> Infra
    SIM --> MQTT --> WH
```

---

## 🛠️ Công nghệ sử dụng

| Tầng / Hạng mục | Công nghệ chính |
| :--- | :--- |
| **Backend** | NestJS, TypeScript, TypeORM/Prisma, Swagger/OpenAPI, Passport JWT |
| **Frontend Web** | React 19, Vite, Next.js 16, TypeScript, Tailwind CSS, Lucide Icons, Three.js / React Three Fiber |
| **Mobile Apps** | React Native, Expo, TypeScript |
| **Cơ sở dữ liệu** | PostgreSQL 15, InfluxDB 2.7 (Time-series data), Redis 7 (Cache & Session) |
| **Hàng đợi & IoT** | RabbitMQ (Message Broker), Eclipse Mosquitto (MQTT Broker) |
| **Lưu trữ tệp tin** | MinIO Object Storage (S3 Compatible) |
| **DevOps & Công cụ** | Docker & Docker Compose, Concurrently, npm workspaces |

---

## 📋 Yêu cầu môi trường

Trước khi bắt đầu, hãy đảm bảo máy của bạn đã cài đặt các công cụ sau:
- **Node.js**: Phiên bản `>= 18.x` (Khuyến nghị `>= 20.x`)
- **npm**: `>= 9.x`
- **Docker Desktop** (hoặc Docker Engine & Docker Compose): Đang được bật và hoạt động bình thường.
- **Git**

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### Bước 1: Clone mã nguồn & Truy cập thư mục dự án
```bash
git clone https://github.com/Chituongnguyen24/SmartWarehouse.git
cd SmartWarehouse
```

---

### Bước 2: Khởi động cơ sở hạ tầng (Docker Compose)
Chạy lệnh sau tại thư mục gốc để khởi tạo toàn bộ Database, Redis, RabbitMQ, InfluxDB, MinIO và Mosquitto:

```bash
docker-compose up -d
```

> 💡 **Kiểm tra trạng thái**: Chạy `docker-compose ps` để đảm bảo tất cả các container (`sfwms-postgres`, `sfwms-redis`, `sfwms-rabbitmq`, `sfwms-influxdb`, `sfwms-minio`, `sfwms-mosquitto`) đều ở trạng thái `running / healthy`.  
> Script `scripts/init-db.sql` sẽ tự động tạo và khởi tạo dữ liệu mẫu cho toàn bộ các database.

---

### Bước 3: Cài đặt thư viện (Dependencies)
Tại thư mục gốc `SmartWarehouse`, thực thi lệnh cài đặt cho toàn bộ workspace:

```bash
npm run install:all
```
*(Lệnh này tương đương với `npm install --legacy-peer-deps`)*

---

### Bước 4: Nạp Dữ Liệu Sản Phẩm Mới Vào Database (Seed Data)

Hệ thống đã chuẩn bị sẵn bộ dữ liệu hơn **5.000 sản phẩm thực tế** đa dạng thuộc **54 ngành hàng/danh mục** được lưu tại `scripts/data/products.json`.

Chạy lệnh sau tại thư mục gốc để nạp dữ liệu vào PostgreSQL (`sfwms_product`):

```bash
npm run seed:products
# Hoặc: node scripts/seed_products.js
```

> 💡 **Tính năng của Script Seed:**
> - Tự động tạo bảng & cấu trúc dữ liệu nếu chưa có.
> - Nạp theo cơ chế Batch Insert (200 sản phẩm/lần) chỉ mất ~2 giây cho toàn bộ 5.044 sản phẩm.
> - Có cơ chế `ON CONFLICT (sku) DO UPDATE` an toàn (idempotent), có thể chạy lại bất kỳ lúc nào mà không sợ trùng lặp hay xung đột khóa chính.
> - Nếu bạn chỉnh sửa dữ liệu trên DB và muốn trích xuất (export) lại thành file JSON để chia sẻ:
>   ```bash
>   npm run export:products
>   ```

---

### Bước 5: Khởi chạy Backend Microservices

Mở một cửa sổ Terminal mới tại thư mục gốc và chạy:

```bash
npm run backend:all
```

Lệnh này sử dụng `concurrently` để chạy đồng loạt tất cả các microservices:
- `user-service` (:3012)
- `product-service` (:3010)
- `inventory-service` (:3011)
- `warehouse-service` (:3005)
- `order-service` (:3004)
- `inbound-service` (:3006)
- `outbound-service` (:3007)
- `report-service` (:3008)
- `transport-service` (:3013)

> 💡 **Khởi chạy từng service riêng lẻ (Nếu muốn debug):**
> ```bash
> npm run user:start       # Chạy User & Auth Service (:3012)
> npm run product:start    # Chạy Product Service (:3010)
> npm run inventory:start  # Chạy Inventory Service (:3011)
> npm run warehouse:start  # Chạy Warehouse Service (:3005)
> npm run order:start      # Chạy Order Service (:3004)
> npm run inbound:start    # Chạy Inbound Service (:3006)
> npm run outbound:start   # Chạy Outbound Service (:3007)
> npm run transport:start  # Chạy Transport Service (:3013)
> npm run report:start     # Chạy Report Service (:3008)
> ```

---

### Bước 6: Khởi chạy Web Dashboard

Mở một Terminal mới và chạy:

```bash
cd frontend/web-dashboard
npm run dev
```

Sau khi khởi chạy thành công, truy cập giao diện quản trị tại:  
👉 **[http://localhost:5173](http://localhost:5173)**

---

### Bước 7: Khởi chạy các ứng dụng bổ trợ (Tuỳ chọn)

#### 1. Cổng mua sắm khách hàng (Customer Web Portal - Next.js)
```bash
npm run customer-web:start
# Hoặc: cd frontend/customer-web && npm run dev
```
Truy cập: **[http://localhost:3000](http://localhost:3000)**

#### 2. Trình mô phỏng cảm biến IoT (IoT Simulator)
Tự động gửi dữ liệu nhiệt độ/độ ẩm của các vùng kho vào Broker MQTT:
```bash
npm run simulator:start
```

#### 3. Ứng dụng di động (Expo Apps)
```bash
npm run customer:start   # Customer Mobile App
npm run driver:start     # Driver Delivery App
npm run staff:start      # Warehouse Staff App
```

---

## 🌐 Danh sách dịch vụ & Cổng kết nối (Ports)

### Microservices & Swagger API Docs

| Tên Dịch vụ | Port | Địa chỉ Endpoint | Swagger API Docs | Chức năng chính |
| :--- | :---: | :--- | :--- | :--- |
| **User & Auth** | `3012` | `http://localhost:3012` | `http://localhost:3012/api` | Xác thực JWT, quản lý tài khoản & phân quyền |
| **Product** | `3010` | `http://localhost:3010` | `http://localhost:3010/api` | Danh mục sản phẩm, đơn vị tính, mã vạch SKU |
| **Inventory** | `3011` | `http://localhost:3011` | `http://localhost:3011/api` | Quản lý tồn kho thời gian thực, Lô hàng (Lots) & FEFO |
| **Warehouse** | `3005` | `http://localhost:3005` | `http://localhost:3005/api` | Layout kho, tọa độ kệ hàng 3D, tích hợp cảm biến IoT |
| **Order** | `3004` | `http://localhost:3004` | `http://localhost:3004/api` | Quản lý đơn hàng (OMS), trạng thái xử lý |
| **Inbound** | `3006` | `http://localhost:3006` | `http://localhost:3006/api` | Nhập kho, kiểm định chất lượng thực phẩm (QC), Putaway |
| **Outbound** | `3007` | `http://localhost:3007` | `http://localhost:3007/api` | Xuất kho, Wave/Batch Picking, Đóng gói & Staging |
| **Transport** | `3013` | `http://localhost:3013` | `http://localhost:3013/api` | Tối ưu tuyến đường VRP, điều phối tài xế |
| **Report** | `3008` | `http://localhost:3008` | `http://localhost:3008/api` | Báo cáo KPI, tổng hợp số liệu PDF/Excel, AI Forecast |

### Hạ tầng Infrastructure & Quản trị

| Công cụ | Port | Thông tin truy cập mặc định |
| :--- | :---: | :--- |
| **PostgreSQL** | `5432` | `postgres` / `postgres` |
| **RabbitMQ Dashboard** | `15672` | `guest` / `guest` (URL: `http://localhost:15672`) |
| **RabbitMQ Broker** | `5672` | `amqp://guest:guest@localhost:5672` |
| **Redis** | `6379` | `localhost:6379` |
| **Mosquitto MQTT** | `1883` | `mqtt://localhost:1883` |
| **InfluxDB Dashboard** | `8086` | User: `admin` / Token: `sfwms-influxdb-token-2026` |
| **MinIO Console** | `9001` | `sfwms_minio` / `sfwms_minio_2026` (URL: `http://localhost:9001`) |

---

## 🔑 Tài khoản dùng thử (Demo Accounts)

Hệ thống đã chuẩn bị sẵn các tài khoản demo tương ứng với từng vai trò trong chuỗi cung ứng:

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Quyền hạn & Phân hệ truy cập chính |
| :--- | :--- | :---: | :--- |
| 👑 **ADMIN** | `admin@sfwms.vn` | `password123` | Toàn quyền hệ thống, Control Center, cấu hình, quản lý user |
| 🏢 **WAREHOUSE_MANAGER** | `manager@sfwms.vn` | `password123` | Quản lý mặt bằng kho 3D, duyệt nhập/xuất, cảnh báo AI, KPI |
| 👷 **WAREHOUSE_STAFF** | `staff@sfwms.vn` | `password123` | Soạn hàng FEFO, đóng gói, xác nhận vị trí kệ, thực hiện đơn |
| 💼 **SALES_STAFF** | `sales@sfwms.vn` | `password123` | Tạo và quản lý đơn bán hàng, xem dự báo nhu cầu (Forecast) |
| 🚚 **DRIVER** | `driver@sfwms.vn` | `password123` | Nhận lệnh điều xe, xem lộ trình tối ưu giao hàng, cập nhật đơn |
| 🛒 **CUSTOMER** | `customer@sfwms.vn` | `password123` | Xem danh mục thực phẩm, mua hàng, theo dõi lộ trình đơn |

---

## 📂 Cấu trúc thư mục dự án

```text
SmartWarehouse/
├── docker-compose.yml              # Cấu hình container hạ tầng (PostgreSQL, Redis, RabbitMQ, Mosquitto, InfluxDB, MinIO)
├── package.json                    # Root package.json điều khiển toàn bộ Monorepo Workspaces
├── scripts/
│   └── init-db.sql                 # Script SQL khởi tạo schema & dữ liệu mẫu cho 11 cơ sở dữ liệu
├── mosquitto/                      # Cấu hình MQTT Broker
│   └── config/mosquitto.conf
├── simulators/                     # Simulator phát sinh dữ liệu IoT cảm biến kho
│   └── iot-simulator.ts
├── backend/
│   └── services/                   # Các dịch vụ NestJS Microservices
│       ├── user-service/           # Xác thực & Quản trị tài khoản
│       ├── product-service/        # Danh mục & Sản phẩm
│       ├── inventory-service/      # Quản lý tồn kho & Lô hàng
│       ├── warehouse-service/      # Vị trí, sơ đồ kho 3D & IoT
│       ├── order-service/          # Quản lý đơn hàng (OMS)
│       ├── inbound-service/        # Quy trình nhập kho & QC
│       ├── outbound-service/       # Quy trình xuất kho & Lấy hàng
│       ├── transport-service/      # Điều phối & Tối ưu định tuyến giao hàng
│       ├── report-service/         # Báo cáo & Phân tích dữ liệu
│       └── notification-service/   # Thông báo & Cảnh báo
├── frontend/
│   ├── web-dashboard/              # Ứng dụng Dashboard chính (React + Vite + Three.js)
│   ├── customer-web/               # Cổng thông tin mua sắm web cho khách hàng (Next.js)
│   ├── customer-app/               # Mobile App cho khách hàng (Expo)
│   ├── driver-app/                 # Mobile App cho tài xế giao hàng (Expo)
│   └── staff-app/                  # Mobile App cho nhân viên kho (Expo)
└── docs/                           # Tài liệu thiết kế kiến trúc, C4 model, kế hoạch AI/ML
```

---

## ❓ Xử lý lỗi thường gặp (Troubleshooting)

### 1. Trắng trang hoặc lỗi thiếu thư viện ở Web Dashboard
Nếu mở giao diện web gặp lỗi trắng trang hoặc thông báo module not found:
```bash
cd frontend/web-dashboard
npm install --no-workspaces
npm run dev
```

### 2. Xung đột Port (Port already in use)
Đảm bảo các cổng sau không bị chiếm bởi ứng dụng khác:
- Hạ tầng: `5432` (PostgreSQL), `6379` (Redis), `5672` / `15672` (RabbitMQ), `1883` (Mosquitto), `8086` (InfluxDB), `9000` / `9001` (MinIO).
- Microservices: `3004` - `3013`.
- Web Apps: `5173` (Vite Dashboard), `3000` (Next.js Customer Web).

*Trên Windows PowerShell, kiểm tra ứng dụng đang chiếm port:*
```powershell
netstat -ano | findstr :5432
```

### 3. Lỗi kết nối Database khi khởi chạy Service
Khi chạy `docker-compose up -d`, PostgreSQL có thể mất từ 5-15 giây để nạp xong file dữ liệu khởi tạo `init-db.sql`. Hãy đợi container báo trạng thái `healthy` trước khi chạy `npm run backend:all`.

---

## 👥 Tác giả & Đóng góp
Dự án được phát triển phục vụ đề tài **Khóa luận Tốt nghiệp - Hệ thống Quản lý Kho Thực phẩm Thông minh (CityMart SFWMS)**.
