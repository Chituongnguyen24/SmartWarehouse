# SmartWarehouse - Quy Tắc Thiết Kế Giao Diện & Tiêu Chuẩn Code (UI/UX Design Rules)

Tài liệu này là quy tắc bắt buộc (Mandatory Workspace Rules) áp dụng cho toàn bộ các ứng dụng giao diện trong dự án SmartWarehouse (Web Dashboard, Staff App, Driver App, Customer Web). Mọi thành viên và trợ lý lập trình (AI Agent) phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây để đảm bảo giao diện đạt chuẩn phần mềm doanh nghiệp (Enterprise B2B Logistics/WMS), loại bỏ hoàn toàn các lỗi thiết kế rập khuôn kiểu "AI-generated".

---

## 1. NGUYÊN TẮC "ANTI-AI DESIGN" (LOẠI BỎ PHONG CÁCH AI RẬP KHUÔN)

### 1.1. Tuyệt đối KHÔNG sử dụng Emoji bừa bãi trong giao diện
- **CẤM**: Đặt emoji trong tiêu đề trang, thẻ KPI, nút bấm, nhãn trạng thái, bảng dữ liệu hoặc hộp thông báo (VD: `🤖 AI`, `✨ Dự Báo`, `🔮 Phân Tích`, `🔥 Hư Hỏng`, `🚀 Xuất Kho`, `⚡ Thần Tốc`, `🧊 Kho Mát`, `🚨 Báo Động`).
- **QUY CHUẨN**:
  - Sử dụng đồng bộ hệ thống Vector Icons từ thư viện `lucide-react`.
  - Icon phải mang ý nghĩa chức năng thực tế (VD: `Thermometer` cho nhiệt độ, `Route` cho tối ưu đường đi, `AlertTriangle` cho cảnh báo, `PackagePlus` cho nhập kho, `Radio` hoặc `Lightbulb` cho Pick-to-Light).
  - Kích thước icon chuẩn: `14px` - `16px` cho button/badge inline, `18px` - `20px` cho card header, tối đa `24px` cho header chính.

### 1.2. Loại bỏ Gradient màu mè, Neon và Glow lòe loẹt
- **CẤM**:
  - Dùng gradient chéo sặc sỡ trên nền thẻ, nút bấm và header (`linear-gradient(135deg, ...)`, gradient tím-hồng-xanh neon).
  - Dùng hiệu ứng đổ bóng phát sáng rực rỡ (`box-shadow: 0 0 20px #...`).
  - Viền phát sáng hoặc hiệu ứng kính mờ (frosted glass/glassmorphism) không cần thiết trong phần mềm nghiệp vụ.
- **QUY CHUẨN**:
  - Thiết kế phẳng hiện đại (Flat & Elevated Design) lấy cảm hứng từ các hệ thống ERP hàng đầu (Stripe, Linear, SAP Fiori, Manhattan WMS).
  - Sử dụng nền trắng (`#ffffff`) hoặc xám trung tính siêu nhạt (`#f8fafc`, `#f1f5f9`).
  - Đường viền tinh tế, thanh lịch: `1px solid #e2e8f0` hoặc `1px solid #cbd5e1`.
  - Đổ bóng mềm, tự nhiên: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`.
  - Nút bấm (Button): Nền đơn sắc đậm nét (`#0f766e` cho Primary Brand, `#0284c7` cho Action, `#0f172a` cho Dark/Neutral, `#ffffff` có viền cho Secondary). Hover chuyển sắc thái nhẹ nhàng (150ms).

### 1.3. Chuẩn hóa Thuật ngữ Nghiệp vụ (Enterprise Terminology)
- **CẤM**: Đặt tên tính năng theo lối giật gân, "khoe khoang" công nghệ AI (VD: "AI Co-Pilot Siêu Việt", "Hệ Thống Neural Điều Hành Tối Thượng", "Tự Động Thần Tốc", "Magic Putaway").
- **QUY CHUẨN**: Sử dụng thuật ngữ vận hành kho và chuỗi cung ứng chính xác:
  - *Dự báo tiêu thụ & Điểm đặt hàng lại (Demand Forecasting & Reorder Point)*
  - *Tối ưu hóa định tuyến giao nhận (Vehicle Routing Problem - VRP)*
  - *Kiểm soát hạn dùng & Quy tắc FEFO (First-Expired, First-Out)*
  - *Hệ thống hỗ trợ lấy hàng Pick-to-Light (PTL)*
  - *Định vị kệ lưu kho thông minh (Putaway Optimization)*
  - *Chỉ số nguy cơ hao hụt / rủi ro bảo quản (Spoilage Risk Index)*
  - *Trợ lý hỗ trợ điều phối vận hành (Operations Assistant)*

---

## 2. QUY CHUẨN HỆ THỐNG GIAO DIỆN (DESIGN SYSTEM TOKENS)

### 2.1. Typography & Phân cấp thị giác (Visual Hierarchy)
- **CẤM**: Lạm dụng `font-weight: 900` hoặc `800` khắp màn hình làm giao diện bị thô và gây mỏi mắt.
- **QUY ĐỊNH MỨC FONT WEIGHT**:
  - **700 (Bold)**: Chỉ dùng cho tiêu đề trang chính (`h1`) hoặc con số KPI trọng điểm.
  - **600 (SemiBold)**: Dùng cho tiêu đề mục (`h2`, `h3`, `h4`), tiêu đề bảng, tên cột quan trọng.
  - **500 (Medium)**: Dùng cho nhãn dữ liệu (labels), nút bấm (buttons), tabs, navigation menu.
  - **400 (Regular)**: Dùng cho nội dung văn bản (body text), mô tả, ghi chú.
- **BẢNG MÀU CHỮ CHUẨN (Text Contrast)**:
  - Chữ chính (Primary text): `#0f172a` (Slate 900) - Độ tương phản cao, sắc nét.
  - Chữ phụ (Secondary text): `#475569` (Slate 600) - Dễ đọc, không mờ nhạt.
  - Chữ chú thích (Muted text): `#64748b` (Slate 500) - Tối thiểu không bao giờ sáng hơn `#94a3b8`.
  - Tuyệt đối không dùng chữ xám nhạt trên nền trắng gây khó khăn cho nhân viên khi thao tác ngoài kho.

### 2.2. Màu sắc Trạng thái (Semantic Colors & Badges)
Mọi badge và thẻ trạng thái phải tuân thủ cặp màu nền pastel nhạt + chữ đậm + viền mảnh:
- **Đạt chuẩn / Thành công (Success)**:
  `background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;`
- **Cảnh báo / Cận hạn / Chờ xử lý (Warning)**:
  `background: #fffbeb; color: #92400e; border: 1px solid #fde68a;`
- **Nguy hiểm / Quá nhiệt / Hỏng (Danger)**:
  `background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;`
- **Thông tin / Đang lấy hàng (Info)**:
  `background: #f0f9ff; color: #075985; border: 1px solid #bae6fd;`
- **Trung tính / Dự thảo (Neutral)**:
  `background: #f8fafc; color: #334155; border: 1px solid #e2e8f0;`

### 2.3. Bo góc (Border Radius) & Khoảng cách (Spacing)
- **CẤM**: Sử dụng `borderRadius: '24px'` hay `rounded-3xl` cho các card thông thường.
- **QUY ĐỊNH BO GÓC**:
  - Thẻ con (Sub-cards), nút bấm nhỏ, badge: `6px` (`--radius-md`)
  - Thẻ nội dung chính (Cards), Table containers: `8px` hoặc `10px` (`--radius-lg`)
  - Hộp thoại Modal: `12px` hoặc `14px` (`--radius-xl`)
  - Nút tròn / Avatar: `9999px` (Full circle)
- **MẬT ĐỘ THÔNG TIN (High Density for WMS)**:
  - Bảng dữ liệu: Padding ô `8px 12px`, chiều cao dòng gọn gàng, hỗ trợ hiển thị nhiều dòng dữ liệu mà không cần cuộn quá nhiều.
  - Con số định lượng (Số lượng, Đơn giá, Trọng lượng) căn phải và sử dụng font dạng số cố định (`font-variant-numeric: tabular-nums`).

---

## 3. CHECKLIST KIỂM DUYỆT GIAO DIỆN (CODE REVIEW CHECKLIST)
Mỗi khi phát triển hay sửa đổi bất kỳ màn hình nào, phải kiểm tra các tiêu chí sau:
1. [ ] Có icon vector rõ ràng, KHÔNG có emoji trang trí trong label/button.
2. [ ] Không có gradient neon sặc sỡ, sử dụng nền đơn sắc thanh lịch và viền 1px tinh tế.
3. [ ] Tên tính năng mô tả đúng nghiệp vụ kho hàng, không giật tít AI.
4. [ ] Font weight cân đối (không quá nhiều font 800/900).
5. [ ] Độ tương phản chữ đạt chuẩn WCAG AA (đọc rõ trong môi trường ánh sáng kho).
6. [ ] Khoảng cách padding/margin đồng bộ theo thang đo chuẩn 4px/8px/12px/16px/24px.
