import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VectorDocument {
  id: string;
  category: 'POLICY' | 'LOGISTICS' | 'STORAGE' | 'PROMOTION' | 'B2B' | 'PRODUCT' | 'FAQ';
  title: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  doc: VectorDocument;
  score: number;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly apiKey: string;
  private readonly embeddingModel = 'gemini-embedding-001';

  // Kho lưu trữ tri thức vector dạng In-Memory Vector DB
  private documents: Map<string, VectorDocument> = new Map();
  // Bộ nhớ đệm vector để tránh gọi API trùng lặp cho cùng một đoạn văn bản
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(private readonly config: ConfigService) {
    this.apiKey =
      this.config.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';
  }

  async onModuleInit() {
    this.logger.log('Khởi tạo Vector DB & Seed kho tri thức vận hành C.T Mart...');
    this.seedDefaultKnowledgeBase();
    // Tạo embedding cho tri thức tĩnh ở chế độ nền để không làm nghẽn khởi động
    setTimeout(() => {
      this.indexAllDocuments().catch(err => {
        this.logger.warn(`Lỗi khi tạo index vector nền: ${err.message}`);
      });
    }, 2000);
  }

  /**
   * Bộ tri thức chuyên sâu về siêu thị C.T Mart và Logistics kho thông minh
   */
  private seedDefaultKnowledgeBase() {
    const knowledgeDocs: Omit<VectorDocument, 'embedding'>[] = [
      {
        id: 'kb-shipping-policy',
        category: 'LOGISTICS',
        title: 'Chính sách vận chuyển & Giao hàng hỏa tốc 2 giờ',
        content:
          'Siêu thị C.T Mart áp dụng chính sách giao hàng hỏa tốc trong 2 giờ cho toàn bộ các quận nội thành TP.HCM (Quận 1, 3, 5, 7, 10, Gò Vấp, Bình Thạnh, Tân Bình, Phú Nhuận, TP. Thủ Đức). Mọi đơn hàng có giá trị từ 300.000đ trở lên được miễn phí vận chuyển (FreeShip) 100%. Đơn dưới 300.000đ có phí giao đồng giá chỉ 20.000đ. Đội xe giao hàng trang bị thùng giữ nhiệt lạnh chuyên dụng bảo đảm độ tươi.',
      },
      {
        id: 'kb-return-policy',
        category: 'POLICY',
        title: 'Chính sách bảo hành & Đổi trả 1-đổi-1 trong 48 giờ',
        content:
          'C.T Mart cam kết 100% thực phẩm tươi ngon đạt chuẩn vệ sinh an toàn. Khách hàng được quyền đồng kiểm kiểm tra hàng trước khi thanh toán. Nếu thực phẩm có lỗi dập nát, ôi hỏng, héo úa hoặc không đúng đơn đặt, C.T Mart hỗ trợ đổi hàng mới 1-đổi-1 hoặc hoàn tiền 100% trong vòng 48 giờ kể từ khi nhận hàng mà không mất thêm bất kỳ chi phí nào.',
      },
      {
        id: 'kb-cold-chain-storage',
        category: 'STORAGE',
        title: 'Quy chuẩn bảo quản lạnh & Kiểm soát chất lượng kho thông minh (Cold Chain)',
        content:
          'Hệ thống kho SmartWarehouse áp dụng chuỗi cung ứng lạnh chuẩn quốc tế HACCP và VietGAP: Kho mát duy trì 4°C đến 8°C bảo quản rau củ quả tươi và sữa chua. Kho đông duy trì -18°C đến -22°C bảo quản hải sản tươi, thịt bò, thịt heo tươi vô trùng. Kho khô duy trì 20°C đến 25°C độ ẩm dưới 60% cho ngũ cốc và gia vị. Toàn bộ vị trí kệ kho được giám sát cảm biến IoT nhiệt độ tự động 24/7.',
      },
      {
        id: 'kb-fefo-clearance',
        category: 'PROMOTION',
        title: 'Quy tắc xuất kho FEFO & Giải pháp xả hàng cận hạn (Flash Sale)',
        content:
          'C.T Mart quản trị hàng tồn theo nguyên tắc FEFO (First-Expired, First-Out - Lô hàng cận hạn nhất được xuất kho trước). Đối với các mặt hàng rau củ quả tươi sống còn hạn dùng từ 2 đến 3 ngày, siêu thị mở chương trình Flash Sale giảm giá sâu từ 20% đến 50% mỗi ngày để đảm bảo người tiêu dùng mua được thực phẩm sạch giá tốt nhất và chống lãng phí thực phẩm.',
      },
      {
        id: 'kb-promotions-vouchers',
        category: 'PROMOTION',
        title: 'Chương trình ưu đãi & Mã giảm giá hiện hành',
        content:
          'Các mã ưu đãi hiện đang áp dụng tại C.T Mart: FREESHIP300 (Miễn phí ship cho đơn từ 300.000đ). FRESH10 (Giảm 10% tối đa 30.000đ cho đơn hàng rau củ quả VietGAP). HEALTHY50 (Giảm 50.000đ cho đơn hàng từ 500.000đ). COMBO_TIETKIEM (Mua combo rau củ gia đình tặng kèm rau thơm). Khách hàng có thể nhập mã voucher trực tiếp tại bước thanh toán.',
      },
      {
        id: 'kb-b2b-wholesale',
        category: 'B2B',
        title: 'Chính sách bán sỉ B2B cho Nhà hàng, Trường học, Bếp ăn',
        content:
          'C.T Mart cung cấp thực phẩm giá sỉ cho khách hàng doanh nghiệp B2B với mức chiết khấu từ 15% đến 25% tùy sản lượng. Hỗ trợ giao hàng định kỳ mỗi sáng sớm từ 05:00 đến 06:30, cung cấp đầy đủ chứng từ xuất xứ VietGAP, hóa đơn VAT điện tử trong ngày và cho phép thanh toán công nợ cuối tháng đối với khách hàng hợp đồng.',
      },
      {
        id: 'kb-payment-methods',
        category: 'FAQ',
        title: 'Phương thức thanh toán & Giờ hoạt động siêu thị',
        content:
          'C.T Mart hỗ trợ đa dạng phương thức thanh toán linh hoạt: Thanh toán tiền mặt khi nhận hàng (COD), Chuyển khoản qua mã QR VietQR tự động, Thanh toán thẻ Visa/Mastercard nội địa, Ví MoMo và VNPAY. Giờ nhận đơn hàng trực tuyến: 24/7. Khung giờ giao hàng: Từ 07:00 sáng đến 21:30 tối mỗi ngày kể cả thứ 7 và Chủ nhật.',
      },
      {
        id: 'kb-order-tracking-help',
        category: 'FAQ',
        title: 'Hướng dẫn tra cứu đơn hàng và hỗ trợ khách hàng',
        content:
          'Khách hàng có thể tra cứu đơn hàng bằng cách hỏi trực tiếp Trợ lý AI hoặc Saler với Mã đơn hàng (VD: #3163AB0E) hoặc Số điện thoại. Quy trình xử lý đơn gồm 4 bước: Tiếp nhận đơn -> Soạn hàng & Pick-to-Light -> Đóng gói kiểm tra Cold Chain -> Tài xế giao hỏa tốc 2h. Khi cần thay đổi địa chỉ hoặc hủy đơn, vui lòng kết nối trực tiếp với nhân viên tư vấn trước khi đơn được xuất kho.',
      },
    ];

    for (const doc of knowledgeDocs) {
      this.documents.set(doc.id, doc);
    }
  }

  /**
   * Gọi API sinh Vector Embedding qua Gemini embedding model
   */
  async getEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return [];

    // Kiểm tra cache trước
    if (this.embeddingCache.has(cleanText)) {
      return this.embeddingCache.get(cleanText)!;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            parts: [{ text: cleanText.slice(0, 1000) }],
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const vector: number[] = data.embedding?.values || [];
        if (vector.length > 0) {
          this.embeddingCache.set(cleanText, vector);
          return vector;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Embedding API call failed for text "${cleanText.slice(0, 30)}...": ${err.message}`);
    }

    // Fallback nếu API embedding không phản hồi: sinh vector giả lập dựa trên hash từ vựng
    return this.generateFallbackEmbedding(cleanText);
  }

  /**
   * Fallback tạo vector từ vựng (Bag of Words / Character N-gram Hash) khi mạng lỗi
   */
  private generateFallbackEmbedding(text: string, dim = 256): number[] {
    const vector = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vector[idx] += 1;
    }
    // Chuẩn hóa L2 norm
    let sumSq = 0;
    for (let i = 0; i < dim; i++) sumSq += vector[i] * vector[i];
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < dim; i++) vector[i] /= norm;
    return vector;
  }

  /**
   * Tính độ tương đồng Cosine Similarity giữa 2 vector
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Tạo vector embedding cho toàn bộ tài liệu trong Vector DB
   */
  async indexAllDocuments() {
    this.logger.log(`Bắt đầu đánh chỉ mục Vector cho ${this.documents.size} tài liệu tri thức...`);
    let count = 0;
    for (const [id, doc] of this.documents.entries()) {
      if (!doc.embedding || doc.embedding.length === 0) {
        const textToIndex = `${doc.title}. ${doc.content}`;
        const emb = await this.getEmbedding(textToIndex);
        doc.embedding = emb;
        this.documents.set(id, doc);
        count++;
        // Giảm tải tránh hit rate limit
        await new Promise(r => setTimeout(r, 150));
      }
    }
    this.logger.log(`Hoàn tất đánh chỉ mục Vector cho ${count} tài liệu vào Vector DB.`);
  }

  /**
   * Đồng bộ sản phẩm từ Product Service vào Vector DB
   */
  async syncProductsToVectorDb(products: any[]) {
    if (!products || products.length === 0) return;

    for (const p of products.slice(0, 40)) {
      const docId = `prod-${p.id || p.sku}`;
      const title = `Sản phẩm: ${p.name} (${p.category || 'Thực phẩm sạch'})`;
      const content = `Mã SKU [${p.sku}]. Giá bán niêm yết: ${Number(p.price).toLocaleString('vi-VN')} đ/${p.unit || 'Kg'}. Số lượng tồn kho sẵn có: ${p.stock || 0}. Bảo quản kho: ${p.storageZone || 'Kho mát tiêu chuẩn'}. Đặc điểm: Sản phẩm tươi sạch chất lượng cao của chuỗi C.T Mart.`;

      if (!this.documents.has(docId)) {
        this.documents.set(docId, {
          id: docId,
          category: 'PRODUCT',
          title,
          content,
          metadata: { sku: p.sku, price: p.price, unit: p.unit, stock: p.stock },
        });
      }
    }
  }

  /**
   * Tìm kiếm ngữ nghĩa bằng Vector Cosine Similarity
   */
  async searchSimilar(queryText: string, topK = 4, threshold = 0.35): Promise<SearchResult[]> {
    if (!queryText || queryText.trim().length === 0) return [];

    const queryVector = await this.getEmbedding(queryText);
    const results: SearchResult[] = [];

    const lowerQuery = queryText.toLowerCase();
    const queryTokens = lowerQuery.split(/\s+/).filter(w => w.length > 1);

    for (const doc of this.documents.values()) {
      let score = 0;
      if (doc.embedding && doc.embedding.length > 0 && queryVector.length > 0) {
        score = this.cosineSimilarity(queryVector, doc.embedding);
      }

      // Semantic Keyword Boosting để tăng độ chính xác khi câu hỏi chứa từ khóa cốt lõi
      const docText = `${doc.title} ${doc.content}`.toLowerCase();
      let keywordHits = 0;
      for (const token of queryTokens) {
        if (docText.includes(token)) keywordHits++;
      }
      if (keywordHits > 0) {
        score += Math.min(0.25, (keywordHits / queryTokens.length) * 0.25);
      }

      if (score >= threshold) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Định dạng tri thức tìm được thành đoạn context sạch để đưa vào Gemini prompt
   */
  formatKnowledgeContext(results: SearchResult[]): string {
    if (!results || results.length === 0) {
      return 'Không tìm thấy tài liệu liên quan đặc thù trong Vector DB.';
    }

    return results
      .map((r, idx) => {
        return `[Tri thức #${idx + 1} - ${r.doc.title} (Độ phù hợp: ${(r.score * 100).toFixed(0)}%)]\n${r.doc.content}`;
      })
      .join('\n\n');
  }
}

