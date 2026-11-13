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
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
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
    ];
    const isExplicitHandoff = explicitHandoffWords.some(w => lower.includes(w));

    if (isExplicitHandoff) {
      return {
        text: 'Dạ, em đã tiếp nhận yêu cầu của Quý khách! Em đang chuyển ngay cuộc trò chuyện đến Tư vấn viên bán hàng (Saler) trực ban của C.T Mart. Quý khách vui lòng chờ trong giây lát, nhân viên sẽ phản hồi trực tiếp ngay tại đây ạ.',
        handoffRequested: true,
        handoffReason: 'Khách hàng chủ động yêu cầu gặp tư vấn viên trực tiếp',
        quickOptions: ['Xem đơn hàng gần nhất', 'Chính sách đổi trả 48h'],
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
   * Fallback quy tắc nội bộ khi mạng chập chờn (Tuyệt đối không dùng dấu **)
   */
  private fallbackRuleBasedReply(userMessage: string, products: ProductCatalogItem[], recentOrders: any[] = []): AiReplyResult {
    const lower = userMessage.toLowerCase();
    let text =
      'Dạ, C.T Mart xin chào Quý khách! Em có thể hỗ trợ Quý khách kiểm tra hàng tồn, chương trình khuyến mãi hôm nay hoặc lộ trình giao hàng siêu tốc 2h ạ.';
    let productCard: ProductCatalogItem | undefined = undefined;

    if (lower.includes('đơn hàng') || lower.includes('tra cứu') || lower.includes('đang mua') || lower.includes('bao gồm')) {
      if (recentOrders && recentOrders.length > 0) {
        const latest = recentOrders[0];
        const items = (latest.items || []).map((i: any) => `${i.productName} (x${i.quantity})`).join(', ');
        const stText = latest.status === 'PENDING' ? 'Chờ duyệt' : latest.status === 'SHIPPED' ? 'Đang giao hàng' : 'Đang xử lý';
        text = `Dạ, em kiểm tra thấy đơn hàng gần nhất của Quý khách #${latest.id
          .slice(0, 8)
          .toUpperCase()} gồm có: ${items}. Tổng giá trị thanh toán: ${Number(latest.totalAmount).toLocaleString(
          'vi-VN',
        )} đ, hiện trạng thái đơn đang là "${stText}" ạ!`;
      } else {
        text =
          'Dạ, để tra cứu đơn hàng, Quý khách vui lòng cung cấp Số điện thoại đặt hàng hoặc Mã đơn hàng (VD: ORD-...) để em kiểm tra tiến độ đóng gói và xe giao ngay ạ.';
      }
    } else {
      const matched = products.find(p => lower.includes(p.name.toLowerCase()));
      if (matched) {
        text = `Dạ, siêu thị C.T Mart hiện có sẵn sản phẩm "${matched.name}" với giá ưu đãi ${matched.price.toLocaleString(
          'vi-VN',
        )} đ/${matched.unit}. Sản phẩm tươi mới được bảo quản lạnh chuẩn tiêu chuẩn kho.`;
        productCard = matched;
      } else if (lower.includes('giao hàng') || lower.includes('2h') || lower.includes('phí') || lower.includes('freeship')) {
        text =
          'Dạ, C.T Mart áp dụng chính sách giao hàng hỏa tốc trong 2 giờ tại khu vực nội thành. Mọi đơn hàng từ 300.000đ trở lên đều được miễn phí vận chuyển 100% ạ!';
      } else if (lower.includes('đổi trả') || lower.includes('bảo hành') || lower.includes('hỏng')) {
        text =
          'Dạ, C.T Mart cam kết chính sách đổi trả 1-đổi-1 trong vòng 48 giờ đối với bất kỳ thực phẩm tươi sống nào bị hư hỏng, dập nát hoặc có lỗi từ vận chuyển kho ạ!';
      }
    }

    return {
      text,
      handoffRequested: false,
      productCard,
      quickOptions: ['Tra cứu đơn hàng', 'Chính sách giao 2h', 'Gặp nhân viên tư vấn'],
    };
  }
}
