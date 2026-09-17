# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT

---

## 2.1. Môi trường thực thi Node.js và Framework NestJS

### 2.1.1. Khái niệm và kiến trúc của Node.js

Node.js là môi trường thực thi JavaScript phía server (server-side runtime), được xây dựng trên nền tảng V8 JavaScript Engine của Google Chrome. Node.js sử dụng mô hình **đơn luồng hướng sự kiện (Single-threaded Event Loop)** kết hợp **I/O không đồng bộ (Non-blocking I/O)**, cho phép xử lý hàng nghìn kết nối đồng thời mà không cần tạo luồng mới cho mỗi yêu cầu.

Các đặc điểm kỹ thuật nổi bật của Node.js:

- **V8 Engine:** Biên dịch JavaScript trực tiếp sang mã máy (machine code), giúp tốc độ thực thi rất cao.
- **Event Loop:** Vòng lặp sự kiện liên tục kiểm tra và xử lý các tác vụ I/O, callback và timer.
- **npm (Node Package Manager):** Hệ sinh thái thư viện mã nguồn mở lớn nhất thế giới với hơn 2 triệu package.
- **Đa nền tảng:** Chạy trên Windows, macOS, Linux.

**Chức năng trong hệ thống:** Node.js đóng vai trò là nền tảng thực thi cho toàn bộ backend microservices và các công cụ hỗ trợ (seed data, scripts, IoT simulator) của hệ thống SFWMS.

### 2.1.2. Framework NestJS trong kiến trúc Microservices

NestJS là framework Node.js dành cho xây dựng ứng dụng server-side hiệu quả và dễ mở rộng. NestJS được viết bằng TypeScript, lấy cảm hứng từ Angular và áp dụng các mẫu thiết kế hướng đối tượng (OOP), lập trình hàm (FP) và lập trình phản ứng (Reactive Programming).

Các thành phần cốt lõi của NestJS:

| Thành phần | Vai trò |
|:---|:---|
| **Module** (`@Module`) | Đơn vị tổ chức mã nguồn, nhóm các Controller và Service liên quan |
| **Controller** (`@Controller`) | Xử lý HTTP request, định nghĩa các endpoint API |
| **Service** (`@Injectable`) | Chứa logic nghiệp vụ, được inject vào Controller thông qua Dependency Injection |
| **Guard** | Kiểm tra xác thực và phân quyền trước khi request đến Controller |
| **Middleware** | Xử lý request trước khi đến route handler (logging, CORS, validation) |

NestJS hỗ trợ xây dựng kiến trúc Microservices thông qua module `@nestjs/microservices`, cho phép các dịch vụ giao tiếp qua nhiều giao thức: TCP, RabbitMQ, MQTT, Redis, gRPC.

**Chức năng trong hệ thống:** NestJS là framework chính để xây dựng toàn bộ 12 microservices backend của SFWMS, bao gồm: user-service, product-service, inventory-service, warehouse-service, order-service, inbound-service, outbound-service, transport-service, report-service, notification-service, iot-service và ai-service.

---

## 2.2. Thư viện ReactJS và Công cụ build Vite

### 2.2.1. Kiến trúc thành phần (Component-based) của ReactJS

ReactJS là thư viện JavaScript mã nguồn mở do Meta (Facebook) phát triển, dùng để xây dựng giao diện người dùng (UI) theo mô hình **Component-Based Architecture**. Mỗi thành phần giao diện (nút bấm, bảng dữ liệu, biểu đồ) được đóng gói thành một component độc lập, có thể tái sử dụng.

Các khái niệm cốt lõi của React:

- **Virtual DOM (DOM ảo):** React duy trì một bản sao ảo của DOM trong bộ nhớ. Khi state thay đổi, React so sánh Virtual DOM mới với cũ (thuật toán Reconciliation/Diffing), chỉ cập nhật những phần tử DOM thực sự thay đổi – giúp tối ưu hiệu suất render đáng kể.
- **JSX (JavaScript XML):** Cú pháp mở rộng cho phép viết cấu trúc HTML bên trong JavaScript, tăng tính trực quan khi phát triển UI.
- **React Hooks:** API cho phép sử dụng state (`useState`), side effects (`useEffect`), context (`useContext`) và các tính năng khác trong Functional Components mà không cần Class Components.
- **Unidirectional Data Flow:** Dữ liệu chảy một chiều từ component cha xuống component con thông qua `props`, đảm bảo luồng dữ liệu dễ kiểm soát và debug.

**Chức năng trong hệ thống:** React (phiên bản 19) là công nghệ chính để xây dựng giao diện Web Dashboard quản trị kho, bao gồm: bảng điều khiển tổng quan, quản lý nhập/xuất kho, bản đồ 3D Digital Twin, biểu đồ phân tích AI và màn hình tối ưu vận chuyển.

### 2.2.2. Quy trình đóng gói mã nguồn với Vite

Vite là công cụ build thế hệ mới cho ứng dụng web, được tạo bởi Evan You (tác giả Vue.js). Vite tận dụng **ES Modules gốc của trình duyệt** trong quá trình phát triển, giúp khởi động dev server gần như tức thì (< 300ms) bất kể kích thước dự án.

So sánh Vite với công cụ build truyền thống:

| Tiêu chí | Webpack (truyền thống) | Vite |
|:---|:---|:---|
| **Thời gian khởi động** | Chậm (10-30 giây), cần bundle toàn bộ | Gần tức thì (< 300ms), lazy loading |
| **Hot Module Replacement** | Chậm khi dự án lớn | Cực nhanh, chỉ cập nhật module thay đổi |
| **Build production** | Webpack bundler | Rollup bundler (tối ưu tree-shaking) |

**Chức năng trong hệ thống:** Vite đóng vai trò là công cụ build và dev server cho ứng dụng Web Dashboard (React + TypeScript), cung cấp trải nghiệm phát triển nhanh chóng tại cổng 5173.

---

## 2.3. Framework Next.js cho cổng thông tin khách hàng

Next.js là framework React do Vercel phát triển, hỗ trợ **Server-Side Rendering (SSR)** và **Static Site Generation (SSG)**. Khác với React thuần (Client-Side Rendering), Next.js render trang HTML trên server trước khi gửi đến trình duyệt, giúp:

- **Cải thiện SEO:** Các công cụ tìm kiếm (Google, Bing) có thể đọc nội dung trang ngay từ HTML ban đầu.
- **Tăng tốc độ tải trang đầu (First Contentful Paint):** Người dùng nhìn thấy nội dung nhanh hơn.
- **File-based Routing:** Hệ thống định tuyến tự động dựa trên cấu trúc thư mục `app/` hoặc `pages/`.
- **API Routes:** Cho phép xây dựng API endpoint ngay trong cùng dự án Next.js.

**Chức năng trong hệ thống:** Next.js (phiên bản 16) được sử dụng để xây dựng cổng thông tin mua sắm dành cho khách hàng (Customer Web Portal) tại cổng 3000, nơi khách hàng có thể xem danh mục thực phẩm, đặt hàng và theo dõi tình trạng đơn hàng.

---

## 2.4. Hệ quản trị cơ sở dữ liệu PostgreSQL và TypeORM

### 2.4.1. PostgreSQL – Hệ quản trị dữ liệu quan hệ nâng cao

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ - đối tượng (Object-Relational DBMS) mã nguồn mở, được đánh giá là RDBMS mã nguồn mở tiên tiến nhất hiện nay. PostgreSQL tuân thủ đầy đủ các đặc tính **ACID** (Atomicity, Consistency, Isolation, Durability), đảm bảo tính toàn vẹn dữ liệu cho các giao dịch nghiệp vụ.

Các tính năng nổi bật:

- **Hỗ trợ kiểu dữ liệu phong phú:** Ngoài kiểu SQL chuẩn (INTEGER, VARCHAR, DATE), PostgreSQL hỗ trợ JSON/JSONB, UUID, Array, Hstore, Enum.
- **Full-text Search:** Tìm kiếm toàn văn bản tích hợp sẵn, không cần dịch vụ bên ngoài.
- **Indexing nâng cao:** B-tree, Hash, GIN, GiST, BRIN – phục vụ đa dạng trường hợp truy vấn.
- **Table Partitioning:** Phân vùng bảng dữ liệu lớn (theo khoảng giá trị, danh sách, hash).

**Chức năng trong hệ thống:** PostgreSQL 15 là hệ CSDL quan hệ chính, phục vụ cho toàn bộ 11 cơ sở dữ liệu riêng biệt của các microservices (mỗi service sở hữu database riêng theo nguyên tắc Database per Service): `sfwms_user`, `sfwms_product`, `sfwms_inventory`, `sfwms_warehouse`, `sfwms_order`, `sfwms_inbound`, `sfwms_outbound`, `sfwms_transport`, `sfwms_report`, `sfwms_notification`, `sfwms_iot`.

### 2.4.2. TypeORM – Object-Relational Mapping cho TypeScript

TypeORM là thư viện ORM (Object-Relational Mapping) cho TypeScript và JavaScript, cho phép thao tác cơ sở dữ liệu thông qua các đối tượng (Entity) thay vì viết câu SQL trực tiếp.

Các khái niệm chính:

- **Entity:** Lớp TypeScript ánh xạ đến bảng trong CSDL, sử dụng decorator `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`.
- **Repository Pattern:** Mỗi Entity có một Repository riêng, cung cấp các phương thức `find()`, `save()`, `delete()`, `createQueryBuilder()`.
- **Migration:** Quản lý thay đổi schema CSDL theo phiên bản.
- **Relations:** Hỗ trợ quan hệ `@OneToMany`, `@ManyToOne`, `@ManyToMany` giữa các Entity.

**Chức năng trong hệ thống:** TypeORM được tích hợp với NestJS thông qua module `@nestjs/typeorm`, quản lý toàn bộ các entity như Lot (lô hàng), Product (sản phẩm), Supplier (nhà cung cấp), StockMovement (biến động tồn kho), Warehouse (kho), Shelf (kệ hàng).

---

## 2.5. RabbitMQ và Kiến trúc hướng sự kiện (Event-Driven Architecture)

### 2.5.1. RabbitMQ – Message Broker

RabbitMQ là phần mềm Message Broker (trung gian truyền tin nhắn) mã nguồn mở, triển khai giao thức **AMQP (Advanced Message Queuing Protocol)**. RabbitMQ đóng vai trò trung gian tiếp nhận, lưu trữ và phân phối tin nhắn (message) giữa các ứng dụng/dịch vụ.

Các thành phần chính của RabbitMQ:

| Thành phần | Vai trò |
|:---|:---|
| **Producer** | Ứng dụng gửi tin nhắn đến Exchange |
| **Exchange** | Tiếp nhận tin nhắn và định tuyến đến Queue theo Binding Rules |
| **Queue** | Hàng đợi lưu trữ tin nhắn, chờ Consumer đến lấy |
| **Consumer** | Ứng dụng đăng ký nhận và xử lý tin nhắn từ Queue |
| **Binding** | Quy tắc kết nối giữa Exchange và Queue |

RabbitMQ hỗ trợ nhiều loại Exchange: **Direct** (định tuyến chính xác theo routing key), **Fanout** (broadcast đến tất cả Queue), **Topic** (định tuyến theo pattern).

### 2.5.2. Kiến trúc hướng sự kiện trong hệ thống

Trong kiến trúc hướng sự kiện, các dịch vụ giao tiếp bất đồng bộ thông qua các sự kiện (event). Khi một sự kiện nghiệp vụ xảy ra (ví dụ: đơn hàng được tạo, phiếu nhập kho hoàn tất), dịch vụ gửi (Publisher) đẩy thông điệp vào RabbitMQ, các dịch vụ nhận (Subscriber) lắng nghe và xử lý.

Ưu điểm:

- **Tách biệt hoàn toàn (Loose Coupling):** Dịch vụ gửi không cần biết dịch vụ nhận xử lý như thế nào.
- **Xử lý bất đồng bộ:** Giảm thời gian phản hồi cho người dùng.
- **Khả năng phục hồi:** Tin nhắn được lưu trong Queue khi dịch vụ nhận tạm ngưng, xử lý lại khi phục hồi.

**Chức năng trong hệ thống:** RabbitMQ là hệ thống message broker trung tâm, phục vụ giao tiếp bất đồng bộ giữa các microservices. Ví dụ: khi `order-service` tạo đơn hàng mới, sự kiện `order.created` được phát ra để `inventory-service` trừ tồn kho và `notification-service` gửi thông báo.

---

## 2.6. Giao thức truyền tin MQTT và Mosquitto Broker

### 2.6.1. Khái niệm và đặc điểm của MQTT

MQTT là giao thức truyền tin nhắn nhẹ (lightweight messaging protocol), được thiết kế bởi IBM năm 1999 cho các thiết bị IoT có tài nguyên hạn chế và băng thông mạng thấp. MQTT hoạt động theo mô hình **Publish/Subscribe** (xuất bản/đăng ký), khác với mô hình Request/Response truyền thống của HTTP.

Đặc điểm kỹ thuật:

| Đặc điểm | Chi tiết |
|:---|:---|
| **Mô hình** | Publish/Subscribe thông qua Broker trung gian |
| **Giao thức vận chuyển** | TCP/IP |
| **Header** | Cực nhỏ, chỉ 2 bytes overhead tối thiểu |
| **QoS (Quality of Service)** | 3 mức: QoS 0 (Gửi 1 lần), QoS 1 (Ít nhất 1 lần), QoS 2 (Đúng 1 lần) |
| **Topic** | Chuỗi phân cấp (ví dụ: `warehouse/COLD/temperature`) |

### 2.6.2. Eclipse Mosquitto – MQTT Broker

Eclipse Mosquitto là MQTT Broker mã nguồn mở, nhẹ và hiệu suất cao, triển khai giao thức MQTT phiên bản 5.0, 3.1.1 và 3.1. Mosquitto phù hợp cho các hệ thống IoT từ thiết bị nhúng đơn lẻ đến máy chủ xử lý hàng nghìn kết nối đồng thời.

**Chức năng trong hệ thống:** Mosquitto Broker (cổng 1883) tiếp nhận dữ liệu cảm biến nhiệt độ và độ ẩm từ IoT Simulator, phân phối đến `warehouse-service` và `iot-service` theo các topic: `warehouse/COLD/temperature`, `warehouse/COLD/humidity`, `warehouse/FROZEN/temperature`, `warehouse/FROZEN/humidity`, `warehouse/DRY/temperature`, `warehouse/DRY/humidity`.

---

## 2.7. InfluxDB – Cơ sở dữ liệu chuỗi thời gian

InfluxDB là hệ quản trị cơ sở dữ liệu chuỗi thời gian (Time-Series Database – TSDB) mã nguồn mở, được thiết kế chuyên biệt cho dữ liệu có tính chất gắn liền với thời gian như: dữ liệu cảm biến IoT, số liệu giám sát hệ thống, log ứng dụng.

Đặc điểm kỹ thuật:

| Đặc điểm | Chi tiết |
|:---|:---|
| **Tối ưu cho** | Dữ liệu ghi liên tục theo thời gian (Write-heavy workload) |
| **Tốc độ ghi** | Hàng triệu điểm dữ liệu mỗi giây |
| **Nén dữ liệu** | Nén chuyên dụng cho time-series, tiết kiệm 90% dung lượng |
| **Ngôn ngữ truy vấn** | Flux Query Language – tối ưu cho aggregation, downsampling |
| **Retention Policy** | Tự động xóa dữ liệu cũ theo chính sách lưu trữ |
| **Bucket** | Đơn vị lưu trữ dữ liệu, tương đương database trong RDBMS |

So sánh với RDBMS truyền thống: InfluxDB vượt trội về tốc độ ghi và truy vấn aggregation theo khoảng thời gian, nhưng không hỗ trợ JOIN và quan hệ phức tạp giữa các bảng.

**Chức năng trong hệ thống:** InfluxDB 2.7 lưu trữ toàn bộ dữ liệu cảm biến IoT (nhiệt độ, độ ẩm) từ các vùng kho theo chuỗi thời gian, phục vụ cho biểu đồ lịch sử nhiệt độ, phân tích xu hướng và phát hiện bất thường trên dashboard.

---

## 2.8. Redis – Hệ thống Cache và Pub/Sub

Redis (Remote Dictionary Server) là hệ thống lưu trữ dữ liệu dạng key-value trong bộ nhớ (In-Memory Data Store) mã nguồn mở. Redis nổi bật với tốc độ đọc/ghi cực cao (hàng trăm nghìn operations/giây) nhờ lưu trữ toàn bộ dữ liệu trong RAM.

Các cấu trúc dữ liệu Redis hỗ trợ:

- **String:** Lưu trữ giá trị đơn giản (cache kết quả API).
- **Hash:** Lưu trữ đối tượng (session người dùng).
- **List:** Danh sách có thứ tự (hàng đợi công việc).
- **Set / Sorted Set:** Tập hợp duy nhất (bảng xếp hạng, leaderboard).
- **Pub/Sub:** Cơ chế phát và nhận thông báo thời gian thực.

**Chức năng trong hệ thống:** Redis 7 đảm nhận 3 vai trò trong SFWMS: (1) **Caching** – lưu cache kết quả dự báo AI để phản hồi API < 50ms; (2) **Session Management** – quản lý phiên đăng nhập JWT; (3) **Pub/Sub** – phát thông báo cập nhật tồn kho thời gian thực giữa `inventory-service` và Web Dashboard.

---

## 2.9. Docker và Docker Compose – Container hóa ứng dụng

### 2.9.1. Công nghệ Container hóa Docker

Docker là nền tảng container hóa mã nguồn mở cho phép đóng gói ứng dụng cùng toàn bộ phụ thuộc (runtime, thư viện, biến môi trường, file cấu hình) vào một đơn vị triển khai tiêu chuẩn gọi là **Container**.

Khác với máy ảo (Virtual Machine), Container chia sẻ kernel hệ điều hành với máy chủ, nên nhẹ hơn và khởi động nhanh hơn:

| Tiêu chí | Máy ảo (VM) | Docker Container |
|:---|:---|:---|
| **Kích thước** | Hàng GB (gồm cả Guest OS) | Hàng MB (chỉ app + dependencies) |
| **Thời gian khởi động** | Vài phút | Vài giây |
| **Hiệu suất** | Overhead do ảo hóa phần cứng | Gần như native |
| **Cô lập** | Cô lập hoàn toàn (OS riêng) | Cô lập cấp tiến trình (process) |

### 2.9.2. Docker Compose cho ứng dụng đa container

Docker Compose là công cụ cho phép định nghĩa và quản lý ứng dụng gồm nhiều container thông qua file cấu hình YAML (`docker-compose.yml`). Với một lệnh `docker-compose up -d`, toàn bộ hệ thống hạ tầng được khởi tạo đồng loạt.

**Chức năng trong hệ thống:** Docker Compose quản lý 6 container hạ tầng của SFWMS: PostgreSQL 15 (cổng 5432), Redis 7 (cổng 6379), RabbitMQ 3 (cổng 5672/15672), Mosquitto MQTT (cổng 1883), InfluxDB 2.7 (cổng 8086) và MinIO (cổng 9000/9001). Mỗi container được cấu hình health check, persistent volume và biến môi trường riêng.

---

## 2.10. MinIO – Hệ thống lưu trữ đối tượng (Object Storage)

MinIO là hệ thống lưu trữ đối tượng (Object Storage) mã nguồn mở, tương thích hoàn toàn với API Amazon S3. MinIO cho phép lưu trữ dữ liệu phi cấu trúc (file, ảnh, video, tài liệu) không giới hạn kích thước.

Đặc điểm kỹ thuật:

- **S3-Compatible API:** Tương thích với hàng nghìn ứng dụng và SDK hỗ trợ Amazon S3.
- **Hiệu suất cao:** Đọc/ghi tốc độ lên đến hàng GB/giây.
- **Web Console:** Giao diện quản trị trực quan qua trình duyệt.
- **Bucket-based:** Tổ chức dữ liệu theo Bucket (tương tự thư mục gốc).

**Chức năng trong hệ thống:** MinIO (cổng 9000/9001) lưu trữ các file báo cáo PDF/Excel xuất từ `report-service`, hình ảnh sản phẩm từ `product-service` và các tài liệu chứng từ nhập/xuất kho.

---

## 2.11. Three.js và công nghệ Digital Twin 3D

### 2.11.1. Thư viện đồ họa 3D Three.js

Three.js là thư viện JavaScript mã nguồn mở cho phép tạo và hiển thị đồ họa 3D tương tác trên trình duyệt web thông qua **WebGL** (Web Graphics Library). WebGL là API JavaScript cấp thấp cho phép render đồ họa 2D và 3D trong phần tử HTML5 Canvas mà không cần plugin.

Three.js cung cấp các thành phần đồ họa 3D:

| Thành phần | Vai trò |
|:---|:---|
| **Scene** | Không gian 3D chứa tất cả đối tượng |
| **Camera** | Góc nhìn của người dùng (Perspective / Orthographic) |
| **Renderer** | Bộ render chuyển đổi Scene thành hình ảnh 2D trên màn hình |
| **Mesh** | Đối tượng 3D = Geometry (hình dạng) + Material (chất liệu/màu sắc) |
| **Light** | Nguồn sáng (Ambient, Directional, Point, Spot) |
| **OrbitControls** | Cho phép xoay, zoom, di chuyển camera bằng chuột |

### 2.11.2. React Three Fiber

React Three Fiber là thư viện wrapper tích hợp Three.js vào hệ sinh thái React dưới dạng JSX declarative components. Thay vì viết mã Three.js imperative (từng bước), lập trình viên khai báo đối tượng 3D như React component thông thường, tận dụng được toàn bộ hệ sinh thái React (state, hooks, context).

**Chức năng trong hệ thống:** Three.js kết hợp React Three Fiber xây dựng bản đồ 3D Digital Twin kho hàng trong Web Dashboard, cho phép quản lý kho xem trực quan layout kho, tình trạng kệ hàng, nhiệt độ vùng kho và tương tác click vào từng kệ để xem chi tiết lô hàng.

---

## 2.12. JWT và Phân quyền RBAC

### 2.12.1. JSON Web Token (JWT)

JWT là tiêu chuẩn mở (RFC 7519) cho phép truyền tải thông tin an toàn giữa các bên dưới dạng đối tượng JSON có chữ ký số. Cấu trúc JWT gồm 3 phần ngăn cách bởi dấu chấm: `Header.Payload.Signature`.

- **Header:** Thuật toán mã hóa (HS256, RS256).
- **Payload:** Claims chứa thông tin người dùng (userId, email, role, exp).
- **Signature:** Chữ ký xác minh tính toàn vẹn, ngăn chặn giả mạo.

### 2.12.2. Kiểm soát truy cập dựa trên vai trò (RBAC)

RBAC (Role-Based Access Control) là mô hình phân quyền gán quyền truy cập cho vai trò (Role), người dùng được gán vào vai trò tương ứng.

| Vai trò | Quyền hạn chính |
|:---|:---|
| **ADMIN** | Toàn quyền hệ thống, quản lý người dùng, cấu hình |
| **WAREHOUSE_MANAGER** | Duyệt phiếu nhập/xuất, quản lý kho 3D, xem KPI |
| **WAREHOUSE_STAFF** | Soạn hàng, đóng gói, xác nhận vị trí kệ |
| **SALES_STAFF** | Tạo đơn bán hàng, xem dự báo nhu cầu AI |
| **DRIVER** | Nhận lệnh điều xe, xem lộ trình tối ưu |
| **CUSTOMER** | Xem sản phẩm, đặt hàng, theo dõi đơn |

**Chức năng trong hệ thống:** JWT kết hợp Passport.js được triển khai trong `user-service` (cổng 3012), quản lý xác thực và phân quyền cho 6 vai trò. Mỗi API request phải gửi kèm JWT token trong header `Authorization: Bearer <token>`, Guard của NestJS kiểm tra token và role trước khi cho phép truy cập tài nguyên.

---

## Tài liệu tham khảo

[1] NestJS Documentation. (2024). *NestJS – A progressive Node.js framework*. https://docs.nestjs.com.

[2] React Documentation. (2024). *React – A JavaScript library for building user interfaces*. https://react.dev.

[3] Vite Documentation. (2024). *Vite – Next Generation Frontend Tooling*. https://vitejs.dev.

[4] PostgreSQL Global Development Group. (2024). *PostgreSQL 15 Documentation*. https://www.postgresql.org/docs/15.

[5] RabbitMQ Documentation. (2024). *RabbitMQ – Open-source message broker*. https://www.rabbitmq.com/docs.

[6] MQTT.org. (2024). *MQTT – The Standard for IoT Messaging*. https://mqtt.org.

[7] InfluxDB Documentation. (2024). *InfluxDB OSS 2.7*. https://docs.influxdata.com.

[8] Redis Documentation. (2024). *Redis – In-memory data store*. https://redis.io/docs.

[9] Docker Documentation. (2024). *Docker – Build, Ship, and Run Any App, Anywhere*. https://docs.docker.com.

[10] Three.js Documentation. (2024). *Three.js – JavaScript 3D Library*. https://threejs.org/docs.
