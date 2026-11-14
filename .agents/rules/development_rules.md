# QUY TẮC PHÁT TRIỂN & TỐI ƯU HÓA TÀI NGUYÊN (DEVELOPMENT RULES)

> **MỤC TIÊU BẮT BUỘC**: Tối ưu hóa triệt để hiệu năng, bảo vệ RAM/CPU cho máy cấu hình yếu (Low Performance), tiết kiệm token context window, loại bỏ hoàn toàn các tác vụ ngầm và tuân thủ cơ chế phê duyệt trước khi chạm vào mã nguồn.

---

## 1. BỐI CẢNH DỰ ÁN (PROJECT CONTEXT)
- **Hệ thống**: Smart Food Warehouse Management System (SmartWarehouse - Monorepo).
- **Công nghệ chính**: 
  - Backend: NestJS microservices, TypeORM, PostgreSQL, Redis, MQTT/Mosquitto, AWS S3.
  - Frontend: React (Vite / Next.js), React Native (Expo), Tailwind CSS, Lucide Icons.
- **Tiêu chuẩn cấu trúc**: Folder `/src` tiêu chuẩn cho từng workspace app/service.
- **Ngôn ngữ giao tiếp**: Tiếng Việt (ngắn gọn, chính xác, thuật ngữ nghiệp vụ chuẩn B2B).

---

## 2. HẠN CHẾ TERMINAL & BẢO VỆ RAM (MÁY CẤU HÌNH YẾU)

- **TUYỆT ĐỐI KHÔNG TỰ Ý CHẠY TERMINAL**:
  - CẤM tự ý kích hoạt các lệnh khởi động server (`npm run dev`, `npm run start`, `npm run backend:all`, `expo start`, v.v.).
  - CẤM tự ý chạy lệnh build (`npm run build`, `gradlew`, v.v.) hoặc lệnh test (`vitest`, `jest`) trừ khi có yêu cầu bằng văn bản rõ ràng từ người dùng.
- **CẤM TÁC VỤ NỀN & QUÉT HỆ THỐNG**:
  - Không khởi chạy các process watch code liên tục (`--watch`), daemon background task hoặc lệnh polling tiêu tốn RAM và làm nóng máy.
  - Không chạy lệnh tìm kiếm quét đệ quy sâu toàn bộ ổ cứng hoặc thư mục `node_modules`.
- **CƠ CHẾ XÁC NHẬN RÕ RÀNG**:
  - Khi cần thiết phải thực thi lệnh terminal, PHẢI giải thích rõ lệnh đó làm gì và xin xác nhận (Y/N) từ người dùng trước khi chạy.
  - Ưu tiên cung cấp câu lệnh mẫu trong phản hồi để người dùng tự copy và chạy thủ công khi máy rảnh.
- **TƯ DUY TĨNH (STATIC ANALYSIS) TRÊN HẾT**:
  - Thay vì chạy code thử nghiệm để mò lỗi, hãy đọc kỹ code, suy luận luồng dữ liệu (Data Flow) và kiểm tra logic bằng mắt trước khi chỉnh sửa.

---

## 3. KIỂM SOÁT PHẠM VI (TIẾT KIỆM TOKEN & GIẢM TẢI)

- **PHẠM VI CỤC BỘ (LOCAL SCOPE ONLY)**:
  - Chỉ đọc và sửa chính xác những file liên quan trực tiếp đến tính năng/lỗi được yêu cầu.
  - Tuyệt đối KHÔNG quét toàn bộ repository (`no global codebase scanning`).
- **KHÔNG SINH FILE RÁC**:
  - Không tự ý tạo thêm file log, file ghi chú tạm, file clone dự phòng hoặc file test ngoài phạm vi yêu cầu.
  - Giữ cây thư mục dự án sạch sẽ và đúng cấu trúc ban đầu.
- **TỐI ƯU HÓA HIỂN THỊ CODE**:
  - Không in lại toàn bộ file mã nguồn dài hàng trăm dòng trong câu trả lời.
  - Chỉ hiển thị đúng đoạn code cần thay đổi, vị trí hàm cần sửa hoặc dạng code diff ngắn gọn để tiết kiệm tối đa token context.

---

## 4. QUY TRÌNH TIẾP NHẬN TASK & XÁC NHẬN BẮT BUỘC (PLAN & CONFIRMATION POLICY)

1. **CẤM CHỈNH SỬA / VIẾT CODE NGAY**:
   - Khi nhận mô tả sơ sài hoặc yêu cầu tính năng từ người dùng, KHÔNG ĐƯỢC phép tự ý chỉnh sửa file hay viết code ngay lập tức.
2. **BƯỚC 1 - LẬP KẾ HOẠCH (PLANNING)**:
   - Dựa trên mô tả sơ lược, phân tích và đưa ra một "Kế hoạch thực thi" (Execution Plan) rõ ràng bao gồm:
     - Danh sách chính xác các file dự kiến sẽ đọc/sửa.
     - Các câu hỏi làm rõ (nếu mô tả của người dùng còn mơ hồ, thiếu logic nghiệp vụ).
     - Giải pháp kiến trúc sơ bộ (Ví dụ: sẽ tạo hook mới hay sửa component cũ, dùng state cục bộ hay global context).
3. **BƯỚC 2 - XIN PHÉP & DỪNG LẠI (CONFIRMATION)**:
   - Hiển thị Kế hoạch thực thi bằng một danh sách ngắn gọn, súc tích và **DỪNG LẠI tại đó**.
   - **RÀNG BUỘC PHỦ ĐỊNH TUYỆT ĐỐI**: CẤM thực hiện bất kỳ hành động viết code, tạo file hay chạy lệnh terminal nào ở bước này.
   - Bắt buộc đặt câu hỏi chốt:
     > *"Bạn có đồng ý với kế hoạch này không? Vui lòng phản hồi 'Chấp nhận' hoặc cho thêm ý kiến."*
4. **BƯỚC 3 - THỰC THI (EXECUTION)**:
   - **CHỈ KHI VÀ CHỈ KHI** người dùng gửi phản hồi chứa các từ khóa đồng ý: `"Accept"`, `"Chấp nhận"`, `"Ok"`, `"Đồng ý"` hoặc yêu cầu tiến hành, Agent mới được phép bắt đầu can thiệp và chỉnh sửa file theo đúng kế hoạch đã duyệt.

---

## 5. QUY TRÌNH LÀM VIỆC TINH GỌN (LEAN WORKFLOW)

- **Bước 1: Nhận diện & Khoanh vùng**:
  - Đọc kỹ yêu cầu người dùng và xác định chính xác danh sách file mục tiêu cần thao tác.
- **Bước 2: Phân tích & Viết nháp trong tư duy**:
  - Phân tích logic trong luồng suy nghĩ.
  - Tự kiểm tra cú pháp, kiểu dữ liệu TypeScript (types, interfaces, imports) bằng mắt trước khi áp dụng.
- **Bước 3: Chỉnh sửa dứt điểm một lần**:
  - Sử dụng công cụ chỉnh sửa file chính xác ngay từ lần đầu tiên.
  - Tránh sửa đi sửa lại nhiều lần làm phình to lịch sử hội thoại và tiêu tốn token.
- **Bước 4: Báo cáo & Hướng dẫn thủ công**:
  - Trả lời súc tích bằng tiếng Việt về những gì đã sửa đổi.
  - Liệt kê các câu lệnh cần thiết (nếu có) dưới dạng code block để người dùng tự quyết định thời điểm chạy thủ công.

---

## 6. RÀNG BUỘC PHỦ ĐỊNH NGHIÊM NGẶT (NEGATIVE CONSTRAINTS)

1. **KHÔNG** tự ý chạy `npm install` hoặc thêm dependencies mới khi chưa có sự đồng ý của người dùng.
2. **KHÔNG** dùng kiểu dữ liệu `any` bừa bãi làm suy giảm tính an toàn kiểu và tăng thời gian biên dịch của TypeScript Compiler.
3. **KHÔNG** giải thích lý thuyết dông dài, không mở đầu bằng các câu chào hỏi sáo rỗng hoặc lặp lại kiến thức cơ bản.
4. **KHÔNG** dùng emoji bừa bãi trong code giao diện, tuân thủ nghiêm ngặt quy tắc UI/UX Enterprise (theo `GEMINI.md`).
