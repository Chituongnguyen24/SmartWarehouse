# HƯỚNG DẪN TỪNG BƯỚC TRIỂN KHAI BACKEND & DATABASE LÊN AWS EC2 (GIAI ĐOẠN TEST DEPLOY)

Tài liệu này hướng dẫn chi tiết quy trình đưa 9 microservices backend và cơ sở dữ liệu lên một máy chủ ảo **AWS EC2**, đồng thời đảm bảo:
1. **Phục vụ trọn vẹn mọi ứng dụng**: Web Dashboard, Customer Web, **Staff App (Nhân viên kho)** và **Driver App (Tài xế giao nhận chạy 4G)**.
2. **Bảo toàn 100% môi trường local**: Bạn vẫn chạy `npm run backend:fast` trên máy của mình bình thường.
3. **Tự động hóa hoàn toàn**: Đã chuẩn bị sẵn script `scripts/ec2-setup.sh` và cấu hình PM2 `ecosystem.config.js`.

---

## BƯỚC 1: KHỞI TẠO MÁY CHỦ EC2 TRÊN AWS CONSOLE

1. Đăng nhập vào **AWS Management Console** -> Chọn dịch vụ **EC2** -> Bấm **Launch Instance**.
2. **Cấu hình thông số máy chủ:**
   - **Name**: `SmartWarehouse-Test-Backend`
   - **Application and OS Images (AMI)**: Chọn **Ubuntu Server 22.04 LTS (HVM)** hoặc **24.04 LTS**.
   - **Instance Type**: Chọn **t3.small** (2 vCPU, 2GB RAM) - Giá khoảng ~0.02 USD/giờ (~15.000 VNĐ/ngày). *(Lưu ý: Script setup sẽ tự tạo thêm 4GB Swapfile nên 2GB RAM chạy hoàn toàn mượt mà).*
   - **Key pair (login)**: Chọn Key Pair có sẵn của bạn (file `.pem`) hoặc bấm *Create new key pair* và tải về máy.
   - **Storage (dung lượng ổ cứng)**: Đổi từ `8 GiB` thành **`25 GiB`** hoặc **`30 GiB`** loại `gp3`.

3. **Cấu hình Tường Lửa (Security Group - Inbound Rules):**
   Tạo mới Security Group và mở các cổng sau:

| Loại lưu lượng (Type) | Cổng (Port Range) | Nguồn (Source) | Mục đích sử dụng |
|---|:---:|:---:|---|
| **SSH** | `22` | My IP *(hoặc `0.0.0.0/0`)* | Truy cập terminal điều khiển EC2 |
| **HTTP** | `80` | `0.0.0.0/0` (Anywhere) | Nginx Reverse Proxy / Cổng chung cho Web |
| **HTTPS** | `443` | `0.0.0.0/0` (Anywhere) | Kết nối bảo mật SSL / WSS |
| **Custom TCP** | `3004 - 3013` | `0.0.0.0/0` (Anywhere) | Kết nối trực tiếp 9 Microservices từ Mobile Apps (Staff App & Driver App 4G) |

4. Bấm **Launch Instance** và đợi khoảng 1-2 phút để máy chủ khởi động xong. Lấy **Public IPv4 Address** của EC2 (VD: `54.251.182.90`).

---

## BƯỚC 2: KẾT NỐI SSH VÀO EC2 VÀ CHẠY SCRIPT SETUP 1 CHẠM

Mở Terminal trên máy tính của bạn (PowerShell hoặc Git Bash), di chuyển đến thư mục chứa file key `.pem` vừa tải:

```bash
# 1. Phân quyền cho file key (nếu dùng Mac/Linux/WSL)
chmod 400 my-key.pem

# 2. Kết nối vào EC2 (Thay IP bằng IP thật của EC2 bạn vừa tạo)
ssh -i my-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Sau khi đã vào được giao diện dòng lệnh của Ubuntu trên EC2, chạy các lệnh sau:

```bash
# 3. Kéo mã nguồn dự án từ Git về
git clone <URL_GIT_CUA_BAN> SmartWarehouse
cd SmartWarehouse

# 4. Cấp quyền thực thi và chạy script thiết lập tự động
chmod +x scripts/ec2-setup.sh scripts/ec2-update.sh
./scripts/ec2-setup.sh
```

> **Script `ec2-setup.sh` sẽ tự động thực hiện tất cả:**
> - Tạo 4GB Swapfile chống tràn RAM.
> - Cài đặt Docker, Docker Compose, Node.js 20 LTS, npm và PM2.
> - Bật Docker PostgreSQL 15, Redis 7, RabbitMQ và nạp toàn bộ 16 schema CSDL từ `scripts/init-db.sql`.
> - Biên dịch mã nguồn 9 microservices (`npm run backend:build`).
> - Khởi chạy 9 services dưới sự quản lý của PM2 (`pm2 start ecosystem.config.js`).
> - Cấu hình Nginx Reverse Proxy và mở các cổng API.

---

## BƯỚC 3: KIỂM TRA TRẠNG THÁI HỆ THỐNG TRÊN EC2

Sau khi script chạy xong, bạn có thể kiểm tra nhanh:

```bash
# Xem trạng thái hoạt động của 9 microservices
pm2 status

# Xem log trực tiếp của các services (nếu cần gỡ lỗi)
pm2 logs

# Kiểm tra sức khỏe Nginx
curl http://localhost/health
```

Bảng danh sách cổng 9 microservices đang chạy trên EC2:
- **Port 3012**: `user-service` (Đăng nhập, Quản lý tài khoản, OTP SMS)
- **Port 3010**: `product-service` (Sản phẩm, Danh mục, Khuyến mãi)
- **Port 3011**: `inventory-service` (Tồn kho, Quản lý lô hàng, Lịch sử dịch chuyển)
- **Port 3004**: `order-service` (Đơn hàng, WebSocket Realtime, Tọa độ tài xế, Chat AI)
- **Port 3005**: `warehouse-service` (Quản lý 16 kho, Zone, Kệ hàng, Digital Twin 3D)
- **Port 3007**: `outbound-service` (Xuất kho, Đóng gói, Lấy hàng Pick-to-Light)
- **Port 3006**: `inbound-service` (Nhập kho, Kiểm tra chất lượng QC, Gán kệ)
- **Port 3008**: `report-service` (Báo cáo doanh thu, Tồn kho, Xuất Excel/PDF)
- **Port 3013**: `transport-service` (Tối ưu tuyến đường VRP, Đội xe lạnh)

---

## BƯỚC 4: KẾT NỐI CÁC CLIENT VỚI BACKEND EC2

### 1. Kết nối Staff App (Nhân viên kho)
- **Trên ứng dụng điện thoại / PDA Android**:
  - Cách 1: Mở trình duyệt trên máy quét PDA hoặc điện thoại, vào `localStorage` đặt:
    ```javascript
    localStorage.setItem('sfwms_backend_host', '<EC2_PUBLIC_IP>');
    ```
  - Cách 2: Khi build file APK, đặt biến môi trường:
    ```bash
    VITE_BACKEND_HOST=<EC2_PUBLIC_IP> npm run cap:build:apk -w frontend/staff-app
    ```

### 2. Kết nối Driver App (Tài xế giao hàng ngoài đường qua 4G)
- **Trên ứng dụng di động của tài xế**:
  - Cách 1: Vào `frontend/driver-app/src/shared/services/api.ts`, đổi:
    ```typescript
    export const DEFAULT_LAN_IP = '<EC2_PUBLIC_IP>';
    ```
  - Cách 2: Mở app, đặt giá trị `sfwms_driver_host` thành `<EC2_PUBLIC_IP>`.
  - Lúc này tài xế bật mạng di động **4G/5G** ngoài đường sẽ giao tiếp trực tiếp với backend EC2, nhận chuyến xe và truyền tọa độ GPS thời gian thực về bản đồ điều hành.

### 3. Kết nối Web Dashboard & Customer Web
- **Nếu chạy Web từ máy cá nhân kết nối tới backend EC2**:
  - Web Dashboard: Đổi các hằng số URL API trong giao diện từ `localhost` thành `<EC2_PUBLIC_IP>`.
  - Customer Web: Đặt biến môi trường `.env.local`:
    ```env
    NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>:3010
    ```

---

## BƯỚC 5: CẬP NHẬT CODE MỚI LÊN EC2 (KHI CÓ THAY ĐỔI)

Mỗi khi bạn có code mới push lên nhánh `main` (hoặc `develop`), bạn chỉ cần SSH vào EC2 và chạy script cập nhật nhanh:

```bash
cd SmartWarehouse
./scripts/ec2-update.sh
```
Script này sẽ tự động `git pull`, biên dịch lại bản build mới và khởi động lại PM2 mà không làm gián đoạn hệ thống.

