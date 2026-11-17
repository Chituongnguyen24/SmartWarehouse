import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  unit: string;
  imageUrl?: string;
  stock: number;
}

export interface AiReplyResult {
  text: string;
  handoffRequested: boolean;
  handoffReason?: string;
  productCard?: ProductCatalogItem;
  quickOptions?: string[];
}

@Injectable()
export class GeminiChatService {
  private readonly logger = new Logger(GeminiChatService.name);
  private readonly apiKey: string;
  private readonly models = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
  ];
  private productCache: ProductCatalogItem[] = [];
  private lastCacheTime = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly vectorStore: VectorStoreService,
  ) {
    this.apiKey =
      this.config.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';
  }

  /**
   * Lấy danh mục sản phẩm tươi mới từ product-service và đồng bộ vào Vector DB
   */
  private async getFreshProducts(): Promise<ProductCatalogItem[]> {
    const now = Date.now();
    if (this.productCache.length > 0 && now - this.lastCacheTime < 300000) {
      return this.productCache;
    }
    try {
      const res = await fetch('http://127.0.0.1:3010/products?limit=100', {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        this.productCache = items.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          price: Number(p.price) || 0,
          originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
          unit: p.unit || 'Kg',
          imageUrl: p.imageUrl,
          stock: Number(p.stock) || 0,
        }));
        this.lastCacheTime = now;

        // Đồng bộ sản phẩm vào Vector DB để phục vụ Semantic Search
        this.vectorStore.syncProductsToVectorDb(this.productCache).catch(err => {
          this.logger.warn(`Lỗi khi sync sản phẩm vào Vector DB: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not refresh products for AI context: ${err.message}`);
    }
    return this.productCache;
  }

  /**
   * Gọi Gemini API với cơ chế tự động thử lại các model dự phòng
   */
  private async callGemini(contents: any[]): Promise<string> {
    let lastError: any = null;

    for (const model of this.models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          }),
          signal: AbortSignal.timeout(10000),
        });

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text.trim();
        }

        lastError = data.error || new Error(`Status ${res.status}`);
        this.logger.warn(`Model ${model} returned: ${JSON.stringify(lastError?.message || lastError)}`);
      } catch (e: any) {
        lastError = e;
        this.logger.warn(`Model ${model} failed with: ${e.message}`);
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
  }

  /**
   * Sinh câu trả lời thông minh kết hợp Vector DB Semantic Search & RAG Context
   */
  async generateAiReply(
    userMessage: string,
    customerInfo: { name?: string; phone?: string; customerId?: string },
    recentHistory: Array<{ sender: string; text: string }> = [],
    recentOrders: any[] = [],
  ): Promise<AiReplyResult> {
    const products = await this.getFreshProducts();
    const lower = userMessage.toLowerCase();

    // 1. TRUY VẤN TRI THỨC NGỮ NGHĨA TỪ VECTOR DATABASE (VECTOR SEARCH / RAG)
    let vectorContext = '';
    try {
      const vectorMatches = await this.vectorStore.searchSimilar(userMessage, 4);
      if (vectorMatches.length > 0) {
        this.logger.log(
          `Vector DB tìm thấy ${vectorMatches.length} tri thức phù hợp: ${vectorMatches
            .map(m => `${m.doc.title} (${(m.score * 100).toFixed(0)}%)`)
            .join(', ')}`,
        );
        vectorContext = this.vectorStore.formatKnowledgeContext(vectorMatches);
      }
    } catch (vErr: any) {
      this.logger.warn(`Lỗi tìm kiếm Vector DB: ${vErr.message}`);
    }

    // 2. TỔNG HỢP DANH MỤC SẢN PHẨM PHÙ HỢP
    const queryTokens = lower.split(/\s+/).filter(w => w.length > 1);
    const relevantProducts = products.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      return queryTokens.some(t => pName.includes(t) || pCat.includes(t));
    });
    const catalogSubset = Array.from(new Set([...relevantProducts.slice(0, 15), ...products.slice(0, 20)]));
    const productCatalogSummary = catalogSubset
      .map(p => `- [${p.sku}] ${p.name} (${p.category}): ${p.price.toLocaleString('vi-VN')} đ/${p.unit} (Còn ${p.stock})`)
      .join('\n');

    // 3. TỔNG HỢP LỊCH SỬ ĐƠN HÀNG CỦA KHÁCH HÀNG
    const ordersSummary =
      recentOrders && recentOrders.length > 0
        ? recentOrders
            .map(o => {
              const itemsStr = (o.items || [])
                .map((it: any) => `${it.productName} (SL: ${it.quantity}, Đơn giá: ${Number(it.price).toLocaleString('vi-VN')} đ)`)
                .join(', ');
              const statusText =
                o.status === 'PENDING'
                  ? 'Chờ xác nhận'
                  : o.status === 'CONFIRMED'
                  ? 'Đã duyệt, chuẩn bị lấy hàng'
                  : o.status === 'PROCESSING'
                  ? 'Đang đóng gói'
                  : o.status === 'SHIPPED'
                  ? 'Đang giao hàng hỏa tốc'
                  : o.status === 'DELIVERED'
                  ? 'Đã giao thành công'
                  : o.status;
              return `- Đơn hàng #${o.id.slice(0, 8).toUpperCase()}: Trạng thái "${statusText}". Tổng thanh toán: ${Number(
                o.totalAmount,
              ).toLocaleString('vi-VN')} đ. Sản phẩm: [${itemsStr}]. Đặt lúc: ${new Date(o.createdAt).toLocaleString(
                'vi-VN',
              )}. Địa chỉ nhận: ${o.customerAddress}`;
            })
            .join('\n')
        : 'Khách hàng chưa có đơn hàng nào trước đây.';

    // Kiểm tra yêu cầu gặp người thật một cách rõ ràng
    const explicitHandoffWords = [
      'gặp nhân viên',
      'gặp saler',
      'nhân viên tư vấn',
      'người thật',
      'tư vấn viên',
      'khiếu nại',
      'bồi thường',
      'nói chuyện với người',
      'gặp điều phối',
      'điều phối viên',
      'controller',
      'nhân viên hỗ trợ',
      'chăm sóc khách hàng',
      'cskh',
    ];
    const isExplicitHandoff = explicitHandoffWords.some(w => lower.includes(w));

    if (isExplicitHandoff) {
      return {
        text: 'Dạ, em đã tiếp nhận yêu cầu của Quý khách! Em đang chuyển cuộc trò chuyện đến Điều phối viên / Nhân viên hỗ trợ trực ban của C.T Mart. Quý khách vui lòng chờ trong giây lát, nhân viên sẽ trực tiếp hỗ trợ ngay tại đây ạ.',
        handoffRequested: true,
        handoffReason: 'Khách hàng chủ động yêu cầu kết nối Điều phối viên / Nhân viên hỗ trợ',
        quickOptions: ['Tra cứu đơn hàng', 'Chính sách giao 2h', 'Chính sách đổi trả 48h'],
      };
    }

    // XÂY DỰNG SYSTEM PROMPT KÈM TRI THỨC TỪ VECTOR DATABASE
    const systemInstruction = `Bạn là Trợ lý AI Bán Hàng & Chăm Sóc Khách Hàng của Siêu Thị C.T Mart (Chuỗi thực phẩm sạch & logistics thông minh).
Khách hàng đang trò chuyện tên: ${customerInfo.name || 'Quý khách'}.

=== QUY TẮC ĐỊNH DẠNG VĂN BẢN (BẮT BUỘC - KHÔNG ĐƯỢC PHÉP VI PHẠM) ===
1. TUYỆT ĐỐI KHÔNG SỬ DỤNG DẤU HOA THỊ (**) HOẶC (*) ĐỂ IN ĐẬM HOẶC IN NGHIÊNG.
2. TUYỆT ĐỐI KHÔNG SỬ DỤNG DẤU GẠCH DƯỚI (__) HOẶC DẤU THĂNG (#, ##, ###).
3. Sử dụng văn bản thuần túy (plain text) trang nhã, phân đoạn rõ ràng bằng dấu xuống dòng.
4. Khi liệt kê danh sách, dùng dấu gạch đầu dòng (-) hoặc số thứ tự thông thường (1., 2.).
Ví dụ đúng chuẩn:
- Miễn phí vận chuyển (FreeShip): Áp dụng cho mọi đơn hàng từ 300.000đ trở lên.
- Giao hàng hỏa tốc: Cam kết giao nhanh trong 2 giờ tại nội thành TP.HCM.
- Cam kết tươi ngon: Chính sách đổi trả 1-đổi-1 trong vòng 48 giờ đối với thực phẩm tươi sống có lỗi từ kho hoặc vận chuyển.

=== NGUỒN TRI THỨC XÁC THỰC TỪ VECTOR DATABASE (RAG KNOWLEDGE RETRIEVAL) ===
${vectorContext || 'Áp dụng các chính sách tiêu chuẩn của chuỗi siêu thị C.T Mart.'}

=== THÔNG TIN ĐƠN HÀNG THỰC TẾ CỦA KHÁCH HÀNG ===
${ordersSummary}

=== DANH MỤC SẢN PHẨM SẴN CÓ TRONG KHO ===
${productCatalogSummary}

QUY TẮC PHỤC VỤ NGHIỆP VỤ:
1. Xưng hô nhã nhặn, chuyên nghiệp, tận tâm: "Dạ, C.T Mart xin chào Quý khách!", "Dạ, em xin phép thông tin đến Quý khách...".
2. Trả lời chính xác dựa trên nguồn tri thức từ Vector Database ở trên (Chính sách giao 2h, FreeShip 300k, đổi trả 48h, kho lạnh HACCP, mã ưu đãi...).
3. Nếu khách hỏi tra cứu đơn hàng, báo rõ mã đơn, tên từng món hàng và trạng thái đơn hiện tại.
4. Nếu khách hỏi mua sản phẩm có trong danh mục, giới thiệu rõ tên, giá bán, đơn vị tính và tình trạng tươi mới. Kèm mã [TAG_PRODUCT: MÃ_SKU] ở cuối câu để giao diện hiển thị thẻ mua nhanh.
5. Nếu khách hàng khiếu nại, muốn mua sỉ B2B lớn, hoặc câu hỏi ngoài phạm vi, đề xuất gặp tư vấn viên và thêm [TAG_HANDOFF: LÝ_DO] ở cuối câu.
6. Giữ câu trả lời ngắn gọn (dưới 140 từ), súc tích, dễ đọc.`;

    const contents: any[] = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }],
      },
      {
        role: 'model',
        parts: [
          {
            text: 'Dạ, tôi đã nắm rõ toàn bộ nguồn tri thức từ Vector Database, cam kết không dùng dấu ** hay markdown in đậm, chỉ dùng văn bản thuần túy và sẵn sàng phục vụ Quý khách!',
          },
        ],
      },
    ];

    // Nạp lịch sử đối thoại gần nhất (tối đa 4 tin)
    for (const msg of recentHistory.slice(-4)) {
      contents.push({
        role: msg.sender === 'CUSTOMER' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      });
    }

    // Tin nhắn hiện tại của khách
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    try {
      const rawReply = await this.callGemini(contents);

      let cleanText = rawReply;
      let handoffRequested = false;
      let handoffReason: string | undefined = undefined;
      let productCard: ProductCatalogItem | undefined = undefined;

      // Trích xuất TAG_HANDOFF
      const handoffMatch = cleanText.match(/\[TAG_HANDOFF:\s*(.*?)\]/i);
      if (handoffMatch) {
        handoffRequested = true;
        handoffReason = handoffMatch[1].trim() || 'Cần hỗ trợ chuyên sâu từ nhân viên';
        cleanText = cleanText.replace(/\[TAG_HANDOFF:\s*.*?\]/gi, '').trim();
      }

      // Trích xuất TAG_PRODUCT
      const productMatch = cleanText.match(/\[TAG_PRODUCT:\s*([A-Za-z0-9_-]+)\]/i);
      if (productMatch) {
        const targetSku = productMatch[1].trim();
        const found = products.find(p => p.sku === targetSku || p.sku.includes(targetSku));
        if (found) {
          productCard = found;
        }
        cleanText = cleanText.replace(/\[TAG_PRODUCT:\s*[A-Za-z0-9_-]+\]/gi, '').trim();
      } else {
        // Tự động tìm sản phẩm nếu khách hỏi trực tiếp tên (VD: dưa hấu, cải ngọt, dưa leo)
        const matched = products.find(p => lower.includes(p.name.toLowerCase()));
        if (matched) {
          productCard = matched;
        }
      }

      // XỬ LÝ LÀM SẠCH TRIỆT ĐỂ MỌI DẤU ** HOẶC MARKDOWN
      cleanText = cleanText
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bỏ **in đậm**
        .replace(/\*(.*?)\*/g, '$1')     // Bỏ *in nghiêng*
        .replace(/__(.*?)__/g, '$1')     // Bỏ __in đậm__
        .replace(/#{1,6}\s+/g, '')       // Bỏ dấu tiêu đề ###
        .replace(/\*\*/g, '')            // Bỏ dấu ** sót lại
        .trim();

      return {
        text: cleanText,
        handoffRequested,
        handoffReason,
        productCard,
        quickOptions: handoffRequested
          ? ['Gặp nhân viên tư vấn ngay', 'Xem khuyến mãi khác']
          : ['Tra cứu đơn hàng', 'Chính sách giao 2h', 'Gặp nhân viên tư vấn'],
      };
    } catch (err: any) {
      this.logger.error(`Gemini reply failed: ${err.message}. Falling back to rule-based assistance.`);
      return this.fallbackRuleBasedReply(userMessage, products, recentOrders);
    }
  }

  /**
   * Tóm tắt ngắn gọn 2 dòng bằng AI để nhân viên Saler nắm bắt ngữ cảnh ngay khi vào phòng chat
   */
  async generateAiSummary(messages: Array<{ sender: string; text: string }>): Promise<string> {
    if (messages.length === 0) return 'Khách hàng mới bắt đầu cuộc trò chuyện.';
    try {
      const dialog = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const prompt = `Hãy tóm tắt ngắn gọn trong 1 đến 2 câu ngắn nhu cầu cốt lõi và vấn đề của khách hàng sau đây để nhân viên bán hàng (Saler) đọc trong 3 giây là hiểu ngay (không dùng dấu **):\n\n${dialog}`;

      const summary = await this.callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
      return summary.replace(/\*\*/g, '').slice(0, 200);
    } catch {
      return 'Khách hàng đang cần tư vấn về sản phẩm và chính sách bán hàng của siêu thị.';
    }
  }

  /**
   * Động cơ AI nội bộ (Smart Rule & NLP Domain Engine) phục vụ khách hàng thông minh
   * Đảm bảo chatbot phản hồi sâu sát nghiệp vụ siêu thị C.T Mart và Logistics kho lạnh.
   */
  private fallbackRuleBasedReply(userMessage: string, products: ProductCatalogItem[], recentOrders: any[] = []): AiReplyResult {
    const lower = userMessage.toLowerCase().trim();
    let text = '';
    let productCard: ProductCatalogItem | undefined = undefined;
    let quickOptions: string[] = ['Tra cứu đơn hàng', 'Chính sách giao 2h', 'Gặp điều phối viên'];

    // 1. TRA CỨU ĐƠN HÀNG (TOÀN BỘ HOẶC ĐƠN GẦN NHẤT)
    if (
      lower.includes('đơn hàng') ||
      lower.includes('tra cứu') ||
      lower.includes('đang mua') ||
      lower.includes('đơn mua') ||
      lower.includes('các đơn') ||
      lower.includes('lịch sử đơn') ||
      lower.includes('kiểm tra đơn')
    ) {
      if (recentOrders && recentOrders.length > 0) {
        const isAllQuery = lower.includes('tất cả') || lower.includes('toàn bộ') || lower.includes('các đơn') || lower.includes('danh sách');
        if (isAllQuery && recentOrders.length > 1) {
          const orderLines = recentOrders.slice(0, 4).map((o, idx) => {
            const items = (o.items || []).map((i: any) => `${i.productName} (x${i.quantity})`).join(', ');
            const stText =
              o.status === 'PENDING' ? 'Chờ xác nhận' :
              o.status === 'CONFIRMED' ? 'Đã duyệt kho' :
              o.status === 'PROCESSING' ? 'Đang soạn & đóng gói' :
              o.status === 'SHIPPED' ? 'Đang giao hàng hỏa tốc' :
              o.status === 'DELIVERED' ? 'Đã giao thành công' : o.status;
            return `${idx + 1}. Đơn #${o.id.slice(0, 8).toUpperCase()}: Trạng thái "${stText}" - Tổng tiền: ${Number(o.totalAmount).toLocaleString('vi-VN')} đ\n   Sản phẩm: ${items}`;
          }).join('\n\n');

          text = `Dạ, C.T Mart xin phép gửi thông tin chi tiết các đơn hàng của Quý khách:\n\n${orderLines}\n\nĐơn hàng đang được điều phối viên giám sát nhiệt độ và tiến độ giao sát sao ạ!`;
          quickOptions = ['Chi tiết đơn mới nhất', 'Chính sách giao 2h', 'Gặp điều phối viên'];
        } else {
          const latest = recentOrders[0];
          const items = (latest.items || []).map((i: any) => `${i.productName} (x${i.quantity})`).join(', ');
          const stText =
            latest.status === 'PENDING' ? 'Chờ xác nhận' :
            latest.status === 'CONFIRMED' ? 'Đã duyệt kho, chuẩn bị lấy hàng' :
            latest.status === 'PROCESSING' ? 'Đang soạn & đóng gói' :
            latest.status === 'SHIPPED' ? 'Đang giao hàng hỏa tốc' :
            latest.status === 'DELIVERED' ? 'Đã giao thành công' : latest.status;
          text = `Dạ, C.T Mart kiểm tra thấy đơn hàng gần nhất của Quý khách #${latest.id.slice(0, 8).toUpperCase()}:\n- Trạng thái hiện tại: "${stText}"\n- Sản phẩm: ${items}\n- Tổng giá trị thanh toán: ${Number(latest.totalAmount).toLocaleString('vi-VN')} đ (COD)\n- Địa chỉ nhận hàng: ${latest.customerAddress || 'Theo địa chỉ đã đăng ký'}\n\nĐội ngũ giao hàng đang thực hiện đóng gói bảo quản mát để giao tận tay Quý khách đúng hẹn ạ!`;
          quickOptions = ['Xem tất cả các đơn', 'Chính sách đổi trả 48h', 'Gặp điều phối viên'];
        }
      } else {
        text = 'Dạ, hiện tại hệ thống chưa ghi nhận đơn hàng nào của Quý khách. Quý khách có thể cung cấp Mã đơn hàng (VD: ORD-...) hoặc Số điện thoại để em kiểm tra tiến độ đóng gói và điều phối xe giao ngay ạ!';
        quickOptions = ['Sản phẩm khuyến mãi', 'Chính sách giao 2h', 'Gặp điều phối viên'];
      }
    }

    // 2. CHƯƠNG TRÌNH KHUYẾN MÃI & MÃ GIẢM GIÁ
    else if (
      lower.includes('khuyến mãi') ||
      lower.includes('voucher') ||
      lower.includes('mã giảm') ||
      lower.includes('ưu đãi') ||
      lower.includes('giảm giá') ||
      lower.includes('sale') ||
      lower.includes('flash sale')
    ) {
      text = `Dạ, siêu thị C.T Mart hiện đang áp dụng các chương trình ưu đãi đặc biệt hôm nay:\n\n1. FREESHIP2H: Miễn phí vận chuyển 100% cho mọi đơn hàng từ 300.000đ trở lên (Cam kết giao nhanh trong 2 giờ).\n2. CTMART10: Giảm ngay 10.000đ cho đơn hàng thực phẩm tươi sống từ 150.000đ.\n3. VEGGIE-FRESH: Ưu đãi giảm 10% - 15% cho nhóm hàng rau củ sạch & trái cây nhiệt đới trong ngày.\n4. ƯU ĐÃI B2B: Chiết khấu trực tiếp từ 5% đến 8% cho nhà hàng, quán ăn và đối tác siêu thị mua sỉ.\n\nQuý khách chỉ cần nhập mã tại bước thanh toán giỏ hàng là sẽ được áp dụng ngay ạ!`;
      quickOptions = ['Rau củ tươi hôm nay', 'Tra cứu đơn hàng', 'Gặp điều phối viên'];
    }

    // 3. TƯ VẤN ẨM THỰC & GỢI Ý MÓN ĂN / NẤU NƯỚNG
    else if (
      lower.includes('nấu lẩu') ||
      lower.includes('lẩu thái') ||
      lower.includes('lẩu hải sản') ||
      lower.includes('hôm nay ăn gì') ||
      lower.includes('gợi ý món') ||
      lower.includes('nấu món gì') ||
      lower.includes('canh chua') ||
      lower.includes('món xào') ||
      lower.includes('ăn kiêng') ||
      lower.includes('eat clean') ||
      lower.includes('healthy')
    ) {
      if (lower.includes('lẩu')) {
        text = `Dạ, để chuẩn bị một nồi lẩu thơm ngon trọn vị, C.T Mart gợi ý Quý khách combo nguyên liệu tươi có sẵn trong kho:\n- Hải sản tươi: Tôm càng xanh, Mực ống (bảo quản lạnh 0-4°C)\n- Rau nấm ăn lẩu: Nấm kim châm, cải thảo, rau muống, bắp ngọt\n- Gói gia vị lẩu thái chua cay chuẩn vị\n\nEm xin gửi thông tin sản phẩm hải sản tươi có sẵn để Quý khách bấm mua nhanh bên dưới ạ!`;
        productCard = products.find(p => p.name.toLowerCase().includes('mực') || p.name.toLowerCase().includes('tôm')) || products[0];
      } else if (lower.includes('canh chua')) {
        text = `Dạ, món Canh chua thanh mát rất thích hợp cho bữa cơm gia đình! C.T Mart có sẵn đầy đủ nguyên liệu tươi ngon:\n- Cá tươi ngon / cá hồi phi lê\n- Thơm (dứa), cà chua, bạc hà, đậu bắp & giá đỗ sạch\n- Nước cốt me chua thanh tự nhiên\n\nQuý khách xem thông tin sản phẩm tươi sạch bên dưới nhé ạ!`;
        productCard = products.find(p => p.name.toLowerCase().includes('cà chua') || p.name.toLowerCase().includes('dưa')) || products[0];
      } else if (lower.includes('ăn kiêng') || lower.includes('eat clean') || lower.includes('healthy')) {
        text = `Dạ, thực đơn Eat Clean & Giảm cân lành mạnh hôm nay của C.T Mart gồm có:\n- Ức gà tươi sạch giàu protein\n- Khoai lang mật Đà Lạt hấp ngọt bùi\n- Dưa leo & xà lách sạch chuẩn VietGAP\n\nCác sản phẩm đều được kiểm định chất lượng và bảo quản đúng tiêu chuẩn kho mát ạ!`;
        productCard = products.find(p => p.name.toLowerCase().includes('khoai lang') || p.name.toLowerCase().includes('dưa leo')) || products[0];
      } else {
        text = `Dạ, hôm nay C.T Mart gợi ý Quý khách thực đơn ấm cúng:\n1. Món chính: Thịt heo xào rau củ tươi hoặc Cá chiên giòn sốt cà\n2. Món canh: Canh bí đỏ thịt bằm hoặc Canh cải ngọt tôm khô\n3. Tráng miệng: Dưa hấu ruột đỏ ngọt lịm\n\nToàn bộ nguyên liệu đều có sẵn trong kho mát hôm nay với giá ưu đãi ạ!`;
        productCard = products.find(p => p.name.toLowerCase().includes('dưa hấu')) || products[0];
      }
      quickOptions = ['Xem sản phẩm khuyến mãi', 'Chính sách giao 2h', 'Gặp điều phối viên'];
    }

    // 4. TÌM KIẾM THEO TẦM GIÁ HOẶC GIÁ RẺ
    else if (lower.includes('dưới 50k') || lower.includes('dưới 100k') || lower.includes('giá rẻ') || lower.includes('tiết kiệm')) {
      const maxPrice = lower.includes('dưới 50k') ? 50000 : 100000;
      const affordable = products.filter(p => p.price > 0 && p.price <= maxPrice).slice(0, 5);
      if (affordable.length > 0) {
        const lines = affordable.map(p => `- ${p.name}: ${p.price.toLocaleString('vi-VN')} đ/${p.unit} (Còn ${p.stock})`).join('\n');
        text = `Dạ, C.T Mart gợi ý các sản phẩm tươi ngon giá tiết kiệm dưới ${maxPrice.toLocaleString('vi-VN')}đ hôm nay:\n\n${lines}\n\nQuý khách có thể xem chi tiết sản phẩm tiêu biểu bên dưới ạ!`;
        productCard = affordable[0];
      } else {
        text = `Dạ, C.T Mart hiện có rất nhiều mặt hàng rau củ sạch và thực phẩm thiết yếu với mức giá rất hợp lý. Quý khách có thể tham khảo danh mục sản phẩm trên trang chủ ạ!`;
      }
      quickOptions = ['Sản phẩm rau củ', 'Sản phẩm thịt cá', 'Gặp điều phối viên'];
    }

    // 5. CHÍNH SÁCH GIAO HÀNG & LOGISTICS KHO THÔNG MINH
    else if (lower.includes('giao hàng') || lower.includes('2h') || lower.includes('phí ship') || lower.includes('freeship') || lower.includes('vận chuyển')) {
      text = `Dạ, C.T Mart cam kết dịch vụ vận chuyển thông minh chuẩn WMS:\n- Giao hàng siêu tốc trong 2 giờ: Áp dụng tại toàn bộ các quận nội thành TP.HCM.\n- Miễn phí vận chuyển (FreeShip 100%): Cho mọi đơn hàng từ 300.000đ trở lên.\n- Đơn dưới 300.000đ: Phí giao đồng giá chỉ 20.000đ.\n- Đội xe chuyên dụng: Xe máy và xe tải thùng giữ nhiệt lạnh HACCP giúp rau củ và thịt cá luôn tươi ngon đến tận tay khách hàng!`;
      quickOptions = ['Tra cứu đơn hàng', 'Chính sách đổi trả 48h', 'Gặp điều phối viên'];
    }

    // 6. CHÍNH SÁCH ĐỔI TRẢ & BẢO HÀNH CHẤT LƯỢNG
    else if (lower.includes('đổi trả') || lower.includes('bảo hành') || lower.includes('hỏng') || lower.includes('dập') || lower.includes('khiếu nại')) {
      text = `Dạ, C.T Mart áp dụng chính sách Cam kết chất lượng 1-đổi-1 trong vòng 48 giờ:\n- Nếu thực phẩm tươi sống có bất kỳ dấu hiệu hư hỏng, dập nát hoặc giao sai sản phẩm, siêu thị đổi mới ngay lập tức hoặc hoàn tiền 100%.\n- Quý khách chỉ cần gửi hình ảnh chụp sản phẩm qua khung chat này hoặc liên hệ hotline, nhân viên chăm sóc khách hàng sẽ xử lý trong 15 phút!`;
      quickOptions = ['Gặp điều phối viên ngay', 'Tra cứu đơn hàng'];
    }

    // 7. PHƯƠNG THỨC THANH TOÁN & HÓA ĐƠN VAT
    else if (lower.includes('thanh toán') || lower.includes('tiền mặt') || lower.includes('cod') || lower.includes('chuyển khoản') || lower.includes('vnpay') || lower.includes('hóa đơn')) {
      text = `Dạ, C.T Mart hỗ trợ đa dạng phương thức thanh toán thuận tiện:\n1. Thanh toán tiền mặt khi nhận hàng (COD).\n2. Chuyển khoản ngân hàng tức thời qua mã QR.\n3. Thanh toán qua ví điện tử VNPay / Thẻ ngân hàng.\n4. Xuất hóa đơn đỏ điện tử (VAT) đầy đủ cho doanh nghiệp B2B và khách hàng cá nhân.`;
      quickOptions = ['Sản phẩm khuyến mãi', 'Chính sách giao 2h', 'Gặp điều phối viên'];
    }

    // 8. TÌM KIẾM TRỰC TIẾP TÊN SẢN PHẨM HOẶC NGÀNH HÀNG
    else {
      const matched = products.find(p => lower.includes(p.name.toLowerCase()));
      if (matched) {
        text = `Dạ, siêu thị C.T Mart hiện có sẵn sản phẩm "${matched.name}":\n- Giá ưu đãi: ${matched.price.toLocaleString('vi-VN')} đ/${matched.unit}\n- Tồn kho khả dụng: ${matched.stock} ${matched.unit}\n- Điều kiện bảo quản: Tiêu chuẩn kho mát C.T Mart tươi mới mỗi ngày.\n\nQuý khách có thể bấm mua nhanh ngay tại thẻ sản phẩm bên dưới ạ!`;
        productCard = matched;
        quickOptions = ['Thêm vào giỏ hàng', 'Chính sách giao 2h', 'Xem sản phẩm khác'];
      } else {
        // Tìm theo danh mục
        const categoryMatch = products.filter(p => lower.includes(p.category.toLowerCase())).slice(0, 4);
        if (categoryMatch.length > 0) {
          const catLines = categoryMatch.map(p => `- ${p.name}: ${p.price.toLocaleString('vi-VN')} đ/${p.unit}`).join('\n');
          text = `Dạ, siêu thị C.T Mart hiện có các sản phẩm thuộc nhóm này với chất lượng tươi sạch:\n\n${catLines}\n\nQuý khách xem thông tin sản phẩm nổi bật bên dưới nhé ạ!`;
          productCard = categoryMatch[0];
          quickOptions = ['Sản phẩm khuyến mãi', 'Chính sách giao 2h', 'Gặp điều phối viên'];
        } else {
          // Lời chào thông minh và điều hướng rõ ràng
          text = `Dạ, C.T Mart xin chào Quý khách! Em là Trợ lý Thông minh của siêu thị C.T Mart. Em có thể hỗ trợ Quý khách:\n\n1. Tra cứu chi tiết tiến độ các đơn hàng đã đặt.\n2. Tìm kiếm giá bán, tồn kho và gợi ý combo thực phẩm tươi ngon hôm nay.\n3. Cung cấp mã giảm giá, chính sách giao hàng 2h và đổi trả 48h.\n4. Kết nối trực tiếp với Điều phối viên kho bất cứ lúc nào.\n\nQuý khách có thể bấm chọn nhanh các gợi ý bên dưới hoặc gửi câu hỏi để em giải đáp ngay ạ!`;
          quickOptions = ['Tra cứu đơn hàng của tôi', 'Các khuyến mãi đang áp dụng', 'Gợi ý món ăn hôm nay', 'Gặp điều phối viên'];
        }
      }
    }

    return {
      text,
      handoffRequested: false,
      productCard,
      quickOptions,
    };
  }
}
