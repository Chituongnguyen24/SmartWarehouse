# BẢNG TỔNG HỢP DANH SÁCH TÀI KHOẢN VÀ MẬT KHẨU HỆ THỐNG SMARTWAREHOUSE (C.T MART)

> **Ghi chú quan trọng về xác thực:**
> 1. **Mật khẩu chung:** Mọi tài khoản khởi tạo mặc định trong hệ thống đều có mật khẩu: `password123`
> 2. **Linh hoạt định danh đăng nhập:** Người dùng có thể đăng nhập bằng bất kỳ hình thức nào: **Email**, **Số điện thoại**, hoặc **Mã nhân viên / Mã định danh**.
> 3. **Phân quyền vai trò:**
>    - `ADMIN`: Quản trị viên toàn quyền hệ thống, theo dõi toàn bộ 16 kho, báo cáo, cấu hình.
>    - `WAREHOUSE_MANAGER`: Quản lý kho, điều phối xuất nhập, phân ca nhân viên, kiểm kê tồn kho.
>    - `WAREHOUSE_STAFF`: Nhân viên kho trực tiếp (sử dụng Web hoặc Staff App / PDA lấy hàng Pick-to-Light).
>    - `SALES_STAFF`: Nhân viên kinh doanh B2B, quản lý đơn hàng sỉ, hợp đồng, hạn mức công nợ.
>    - `DRIVER`: Tài xế vận chuyển và giao nhận lạnh (sử dụng Driver App & Web theo dõi lộ trình).
>    - `CUSTOMER`: Khách hàng mua sắm lẻ & khách hàng sỉ B2B trên cổng `customer-web`.

---

## 1. TÀI KHOẢN QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)

| STT | Họ và Tên | Mã Định Danh | Email Đăng Nhập | Số Điện Thoại | Mật Khẩu | Phạm Vi Quyền Hạn |
|:---:|:---|:---:|:---|:---:|:---:|:---|
| 1 | **Lê Công Chung** | `ADMIN-CHUNG`<br>*(hoặc `ADM-02`)* | `0377019958`<br>`lecongchung@sfwms.vn` | `0377019958` | `password123` | **Master Admin** - Toàn quyền kỹ thuật, kiến trúc & cấu hình 16 kho |
| 2 | **Nguyễn Chi Tường** | `ADMIN-01`<br>*(hoặc `ADM-01`)* | `admin@sfwms.vn` | `0909000001` | `password123` | **Admin Tổng** - Ban Giám Đốc điều hành chuỗi cung ứng C.T Mart |

---

## 2. TÀI KHOẢN QUẢN LÝ KHO (WAREHOUSE_MANAGER)

| STT | Họ và Tên | Mã Nhân Viên | Email Đăng Nhập | Số Điện Thoại | Mật Khẩu | Kho Quản Lý Trực Thuộc |
|:---:|:---|:---:|:---|:---:|:---:|:---|
| 1 | **Nguyễn Hoàng Nam** | `NV-GV01`<br>*(hoặc `MGR-01`)* | `govap@sfwms.vn` | `0908123456` | `password123` | **Kho Gò Vấp (`WH-006`)** - Kho phân phối trung tâm |
| 2 | **Trần Văn Bình** | `NV-BT01`<br>*(hoặc `MGR-02`)* | `manager@sfwms.vn` | `0908234567`<br>*(hoặc `0905678901`)* | `password123` | **Kho Bình Thạnh (`WH-005`)** |
| 3 | **Đặng Quốc Huy** | `NV-Q12-01`<br>*(hoặc `MGR-03`)* | `manager_wh001@sfwms.vn` | `0901234567`<br>*(hoặc `0908345678`)* | `password123` | **Kho Quận 12 (`WH-001`)** |
| 4 | **Bùi Anh Tuấn** | `NV-TD01`<br>*(hoặc `MGR-04`)* | `manager_wh002@sfwms.vn` | `0903456789`<br>*(hoặc `0908456789`)* | `password123` | **Kho Thủ Đức (`WH-002`)** |

---

## 3. TÀI KHOẢN NHÂN VIÊN VẬN HÀNH KHO (WAREHOUSE_STAFF)
*Sử dụng được cả trên giao diện Web Dashboard và ứng dụng Staff App (PDA Scan Barcode/QR)*

| STT | Họ và Tên | Mã Nhân Viên | Email Đăng Nhập | Số Điện Thoại | Mật Khẩu | Kho & Vị Trí Phân Bổ |
|:---:|:---|:---:|:---|:---:|:---:|:---|
| 1 | **Trần Văn Bình / Lê Thị Hoa** | `NV-GV02`<br>*(hoặc `NV-01`)* | `staff@sfwms.vn` | `0912345678`<br>*(hoặc `0918100000`)* | `password123` | Kho Gò Vấp (`WH-006`) - Khu Khô C & Bàn Soạn Hàng |
| 2 | **Lê Văn Kho** | `NV-GV03`<br>*(hoặc `NV-02`)* | `staff.kho@sfwms.vn` | `0933987654` | `password123` | Kho Gò Vấp (`WH-006`) - Bàn Đóng Gói Pick-to-Light |
| 3 | **Phạm Thị Thúy** | `NV-GV04`<br>*(hoặc `NV-03`)* | `staff.thuy@sfwms.vn` | `0987654321` | `password123` | Kho Gò Vấp (`WH-006`) - Cửa Tiếp Nhận Inbound & QC-01 |
| 4 | **Hoàng Minh Tuấn** | `NV-Q12-02`<br>*(hoặc `NV-04`)* | `staff_wh001@sfwms.vn` | `0902345678` | `password123` | Kho Quận 12 (`WH-001`) - Khu Lạnh & Soạn Hàng Q12 |
| 5 | **Ngô Thanh Hải** | `NV-TD02`<br>*(hoặc `NV-05`)* | `staff_wh002@sfwms.vn` | `0904567890` | `password123` | Kho Thủ Đức (`WH-002`) - Khu Khô & Đóng Gói Thủ Đức |
| 6 | **Vũ Đức Thịnh** | `NV-BT02`<br>*(hoặc `NV-06`)* | `staff_wh005@sfwms.vn` | `0906789012` | `password123` | Kho Bình Thạnh (`WH-005`) - Khu Tiếp Nhận & Kiểm Kê |

---

## 4. TÀI KHOẢN NHÂN VIÊN KINH DOANH & KHÁCH HÀNG B2B (SALES_STAFF)

| STT | Họ và Tên | Mã Nhân Viên | Email Đăng Nhập | Số Điện Thoại | Mật Khẩu | Phạm Vi Trách Nhiệm |
|:---:|:---|:---:|:---|:---:|:---:|:---|
| 1 | **Phạm Minh Đức** | `KD-01`<br>*(hoặc `SLS-01`)* | `sales@sfwms.vn` | `0908901234`<br>*(hoặc `0903888999`)* | `password123` | Quản lý Đơn sỉ B2B, Hợp đồng, Hạn mức công nợ & Trực Live Support |

---

## 5. TÀI KHOẢN ĐỘI XE GIAO NHẬN LẠNH (DRIVER)
*Sử dụng được trên Driver App (Mobile / Android APK) và giao diện Web điều phối*

| STT | Họ và Tên | Mã NV | Email Đăng Nhập | Số Điện Thoại | Biển Số Xe | Loại Xe / Dải Nhiệt Độ | Mật Khẩu |
|:---:|:---|:---:|:---|:---:|:---:|:---|:---:|
| 1 | **Võ Minh Trí / Võ Thanh Tùng** | `NV-GV05`<br>`DRV-01` | `driver@sfwms.vn`<br>`driver.tri@sfwms.vn` | `0977112233`<br>`0971000000` | `59-V1 888.99`<br>`59C-882.14` | Xe Máy Thùng Lạnh (0°C ~ 4°C) | `password123` |
| 2 | **Đặng Hoàng Phúc** | `NV-TK01`<br>`DRV-02` | `truck@sfwms.vn` | `0944778899` | `51D-892.45` | Xe Tải Lạnh 2.5 Tấn (-5°C ~ 4°C, Tiêu Hủy / Chuyển Kho) | `password123` |
| 3 | **Phan Hữu Nam** | `NV-VAN01`<br>`DRV-03` | `van@sfwms.vn` | `0918776655` | `51D-456.78` | Xe Bán Tải 1.5 Tấn (0°C ~ 4°C, Tuyến Gò Vấp - Tân Bình - Q12) | `password123` |
| 4 | **Nguyễn Văn Hùng** | `NV-GV06`<br>`DRV-04` | `hung.nguyen@sfwms.vn` | `0909888111` | `59-G2 688.39` | Xe Máy Giao Siêu Tốc Hub Gò Vấp | `password123` |
| 5 | **Trần Quốc Bảo** | `NV-GV07`<br>`DRV-05` | `bao.tran@sfwms.vn` | `0933445566` | `59-P1 456.78` | Xe Máy Thùng Mát Hub Gò Vấp | `password123` |
| 6 | **Lê Thanh Tùng** | `NV-GV09`<br>`DRV-06` | `tung.le@sfwms.vn` | `0966332211` | `59-X1 999.11` | Xe Máy Thùng Lạnh Hub Gò Vấp | `password123` |
| 7 | **Bùi Hoàng Long** | `NV-BT01`<br>`DRV-07` | `long.bui@sfwms.vn` | `0988112244` | `59-S2 555.66` | Xe Máy Thùng Lạnh Hub Bình Thạnh | `password123` |
| 8 | **Trương Gia Huy** | `NV-TB01`<br>`DRV-08` | `huy.truong@sfwms.vn` | `0977223344` | `59-H1 333.22` | Xe Máy Thùng Lạnh Hub Tân Bình | `password123` |

---

## 6. TÀI KHOẢN KHÁCH HÀNG (CUSTOMER)
*Đăng nhập tại Cổng Mua Sắm `customer-web`*

| STT | Tên Khách Hàng | Mã Khách Hàng | Email Đăng Nhập | Số Điện Thoại | Mật Khẩu | Phân Hạng / Quyền Lợi |
|:---:|:---|:---:|:---|:---:|:---:|:---|
| 1 | **Khách Hàng Thử Nghiệm** | `KH-001`<br>*(hoặc `CUST-01`)* | `customer@sfwms.vn` | `0909999999` | `password123` | Khách Mua Lẻ (Hạng Bạc - 450 điểm) |
| 2 | **Lê Công Chung** | `KH-02`<br>*(hoặc `CUST-02`)* | `0377019958` | `0377019958` | `password123` | Khách Hàng VIP (Hạng Vàng - 1.250 điểm) |

---

## 7. CƠ CHẾ KHÔI PHỤC MẬT KHẨU (FORGOT PASSWORD)
Nếu người dùng quên mật khẩu, hệ thống đã trang bị tính năng **Khôi Phục Mật Khẩu qua mã OTP SMS** trực tiếp trên màn hình đăng nhập:
1. Nhấp **"Quên mật khẩu?"**.
2. Nhập số điện thoại tài khoản (VD: `0377019958`, `0908123456`, `0977112233`,...).
3. Nhập mã OTP gồm 6 chữ số gửi về điện thoại (hoặc mã test trong môi trường phát triển: `123456`).
4. Thiết lập mật khẩu mới (tối thiểu 6 ký tự) và đăng nhập bình thường.

