import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from './entities/chat-session.entity';
import { ChatMessage, ChatSenderType } from './entities/chat-message.entity';
import { Order } from '../order/entities/order.entity';
import { GeminiChatService, AiReplyResult } from './gemini-chat.service';
import { S3StorageService } from '../storage/s3-storage.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly geminiService: GeminiChatService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  /**
   * Upload hình ảnh / video chat lên Amazon S3
   */
  async uploadMedia(base64Data: string, filename?: string, mimeType?: string) {
    return this.s3StorageService.uploadChatMedia(base64Data, filename, mimeType);
  }

  /**
   * Khởi tạo hoặc khôi phục phiên chat của khách hàng
   * ƯU TIÊN TUYỆT ĐỐI THEO:
   * 1. sessionId (Phiên UUID hiện tại của khách)
   * 2. customerId (ID tài khoản hoặc ID thiết bị ẩn danh duy nhất guest_xxx - KHÔNG BAO GIỜ BỊ TRÙNG)
   * 3. customerPhone (Số điện thoại thật)
   */
  async initOrGetSession(customerPhone?: string, customerName?: string, customerId?: string, sessionId?: string): Promise<ChatSession> {
    const cleanId = customerId?.trim() || null;
    const cleanPhone = customerPhone?.trim() || null;
    const name = customerName?.trim() || (cleanId?.startsWith('guest-') ? `Khách vãng lai #${cleanId.slice(-4)}` : 'Khách hàng Trực tuyến');

    // 1. Nếu có sessionId cụ thể, ưu tiên tìm theo id trước
    if (sessionId) {
      const byId = await this.sessionRepo.findOne({
        where: { id: sessionId },
        relations: ['messages'],
      });
      if (byId) {
        // Tự động liên kết customerId hoặc phone nếu session trước đó là guest mà nay khách đã đăng nhập
        let needsUpdate = false;
        if (cleanId && byId.customerId !== cleanId) {
          byId.customerId = cleanId;
          needsUpdate = true;
        }
        if (cleanPhone && byId.customerPhone !== cleanPhone) {
          byId.customerPhone = cleanPhone;
          needsUpdate = true;
        }
        if (customerName && byId.customerName !== customerName) {
          byId.customerName = customerName;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.sessionRepo.update(byId.id, {
            customerId: byId.customerId,
            customerPhone: byId.customerPhone,
            customerName: byId.customerName,
          });
        }

        if (byId.messages) {
          byId.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return byId;
      }
    }

    // 2. Tìm theo customerId trước (ƯU TIÊN TUYỆT ĐỐI THEO ID TÀI KHOẢN HOẶC GUEST DEVICE ID)
    let session: ChatSession | null = null;
    if (cleanId) {
      session = await this.sessionRepo.findOne({
        where: [
          { customerId: cleanId, status: 'STAFF_CONNECTED' },
          { customerId: cleanId, status: 'WAITING_FOR_STAFF' },
          { customerId: cleanId, status: 'AI_ACTIVE' },
        ],
        order: { lastMessageAt: 'DESC' },
        relations: ['messages'],
      });
    }

    // 3. Nếu chưa tìm thấy và có Số điện thoại thực tế (không phải số ảo)
    if (!session && cleanPhone && cleanPhone !== '0909000111' && cleanPhone !== '0909 000 111') {
      session = await this.sessionRepo.findOne({
        where: [
          { customerPhone: cleanPhone, status: 'STAFF_CONNECTED' },
          { customerPhone: cleanPhone, status: 'WAITING_FOR_STAFF' },
          { customerPhone: cleanPhone, status: 'AI_ACTIVE' },
        ],
        order: { lastMessageAt: 'DESC' },
        relations: ['messages'],
      });
    }

    if (!session) {
      session = this.sessionRepo.create({
        customerId: cleanId || undefined,
        customerName: name,
        customerPhone: cleanPhone || '',
        status: 'AI_ACTIVE',
        lastMessage: 'Khởi tạo cuộc trò chuyện',
        lastMessageAt: new Date(),
      });
      session = await this.sessionRepo.save(session);

      // Thêm tin nhắn chào mừng từ AI
      const welcomeMsg = this.messageRepo.create({
        sessionId: session.id,
        sender: 'AI_BOT',
        senderName: 'Trợ lý AI C.T Mart',
        text: `Dạ, C.T Mart xin chào Quý khách ${name}! Em là Trợ lý AI siêu thị thông minh. Em có thể hỗ trợ Quý khách tra cứu giá thực phẩm tươi sống, kiểm tra tồn kho, gợi ý mã giảm giá hoặc kết nối trực tiếp với Tư vấn viên bán hàng ạ.`,
        quickOptions: [
          'Sản phẩm khuyến mãi hôm nay',
          'Tra cứu đơn hàng của tôi',
          'Chính sách giao hàng 2h',
          'Gặp nhân viên tư vấn bán hàng',
        ],
      });
      await this.messageRepo.save(welcomeMsg);
      session.messages = [welcomeMsg];
    } else {
      // Sắp xếp tin nhắn theo thời gian tăng dần
      if (session.messages) {
        session.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    }

    return session;
  }

  /**
   * Lưu tin nhắn của khách hàng
   */
  async saveCustomerMessage(sessionId: string, text: string, customerName?: string, imageUrl?: string): Promise<ChatMessage> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const isVideo = (imageUrl || '').match(/\.(mp4|webm|mov|avi)(\?|$)/i);
    const cleanText = text?.trim() || (imageUrl ? (isVideo ? '[Video]' : '[Hình ảnh]') : '');
    const msg = this.messageRepo.create({
      sessionId,
      session,
      sender: 'CUSTOMER',
      senderName: customerName || session.customerName,
      text: cleanText,
      imageUrl: imageUrl || null,
    });
    const saved = await this.messageRepo.save(msg);

    await this.sessionRepo.update(sessionId, {
      lastMessage: cleanText,
      lastMessageAt: new Date(),
      unreadCount: (session.unreadCount || 0) + 1,
    });

    return saved;
  }

  /**
   * Xử lý sinh phản hồi từ Gemini AI và cập nhật cờ Handoff nếu cần
   */
  async processAiReply(sessionId: string, userText: string): Promise<{
    message: ChatMessage;
    session: ChatSession;
    handoffRequested: boolean;
    handoffReason?: string;
  }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['messages'],
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // NGUYÊN TẮC BẢO VỆ: Nếu phiên đang do nhân viên phụ trách hoặc đang đợi Saler, AI tuyệt đối không xen lời!
    if (session.status === 'STAFF_CONNECTED' || session.status === 'WAITING_FOR_STAFF') {
      this.logger.warn(`[AI BLOCKED] Session ${sessionId} is in status ${session.status}. AI reply aborted.`);
      return {
        message: null as any,
        session,
        handoffRequested: false,
      };
    }

    // Lấy lịch sử gần nhất
    const recent = (session.messages || [])
      .slice(-6)
      .map(m => ({ sender: m.sender, text: m.text }));

    // Lấy danh sách đơn hàng gần đây của khách hàng để phục vụ tra cứu đơn hàng & giỏ hàng
    let recentOrders: any[] = [];
    try {
      const conditions: any[] = [];
      if (session.customerPhone) conditions.push({ customerPhone: session.customerPhone });
      if (session.customerId) conditions.push({ customerId: session.customerId });
      if (conditions.length > 0) {
        recentOrders = await this.orderRepo.find({
          where: conditions,
          order: { createdAt: 'DESC' },
          take: 3,
          relations: ['items'],
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not load customer orders: ${err.message}`);
    }

    const aiResult = await this.geminiService.generateAiReply(
      userText,
      { name: session.customerName, phone: session.customerPhone, customerId: session.customerId },
      recent,
      recentOrders,
    );

    // Lưu tin nhắn AI vào CSDL
    const botMsg = this.messageRepo.create({
      sessionId: session.id,
      session,
      sender: 'AI_BOT',
      senderName: 'Trợ lý AI C.T Mart',
      text: aiResult.text,
      productCard: aiResult.productCard,
      quickOptions: aiResult.quickOptions,
    });
    const savedMsg = await this.messageRepo.save(botMsg);

    session.lastMessage = aiResult.text;
    session.lastMessageAt = new Date();

    if (aiResult.handoffRequested && session.status === 'AI_ACTIVE') {
      session.status = 'WAITING_FOR_STAFF';
      // Sinh tóm tắt ngữ cảnh cho Saler
      session.aiSummary = await this.geminiService.generateAiSummary([
        ...recent,
        { sender: 'CUSTOMER', text: userText },
      ]);
    }

    await this.sessionRepo.update(session.id, {
      lastMessage: session.lastMessage,
      lastMessageAt: session.lastMessageAt,
      status: session.status,
      aiSummary: session.aiSummary,
    });

    return {
      message: savedMsg,
      session,
      handoffRequested: aiResult.handoffRequested,
      handoffReason: aiResult.handoffReason,
    };
  }

  /**
   * Khách hàng hoặc hệ thống chủ động yêu cầu chuyển tiếp sang nhân viên bán hàng
   */
  async requestHandoff(sessionId: string, reason = 'Khách hàng yêu cầu hỗ trợ trực tiếp'): Promise<{ session: ChatSession; systemMessage: ChatMessage }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['messages'],
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Chống duplicate: Nếu phiên đã là WAITING_FOR_STAFF và tin nhắn cuối là thông báo chờ
    const msgs = session.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (session.status === 'WAITING_FOR_STAFF' && lastMsg && lastMsg.sender === 'SYSTEM' && lastMsg.text.includes('Tư vấn viên bán hàng')) {
      return { session, systemMessage: lastMsg };
    }

    session.status = 'WAITING_FOR_STAFF';
    const recent = msgs.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
    session.aiSummary = await this.geminiService.generateAiSummary(recent);

    const sysMsg = this.messageRepo.create({
      sessionId: session.id,
      session,
      sender: 'SYSTEM',
      senderName: 'Hệ Thống C.T Mart',
      text: 'Yêu cầu kết nối với Tư vấn viên bán hàng đã được chuyển đến Saler trực ban. Nhân viên sẽ tham gia cuộc trò chuyện ngay ạ!',
    });
    await this.messageRepo.save(sysMsg);

    session.lastMessage = sysMsg.text;
    session.lastMessageAt = new Date();
    await this.sessionRepo.update(session.id, {
      status: session.status,
      aiSummary: session.aiSummary,
      lastMessage: session.lastMessage,
      lastMessageAt: session.lastMessageAt,
    });

    return { session, systemMessage: sysMsg };
  }

  /**
   * Nhân viên bán hàng tiếp nhận phiên chat (Takeover)
   */
  async staffTakeover(sessionId: string, staffId: string, staffName: string): Promise<{ session: ChatSession; systemMessage: ChatMessage }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId }, relations: ['messages'] });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Chống duplicate: Nếu đã tiếp nhận và tin nhắn cuối cùng là tiếp nhận
    const msgs = session.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (session.status === 'STAFF_CONNECTED' && session.assignedStaffId === staffId && lastMsg && lastMsg.sender === 'SYSTEM' && lastMsg.text.includes('đã tham gia cuộc trò chuyện')) {
      return { session, systemMessage: lastMsg };
    }

    session.status = 'STAFF_CONNECTED';
    session.assignedStaffId = staffId;
    session.assignedStaffName = staffName;
    session.unreadCount = 0;

    const sysMsg = this.messageRepo.create({
      sessionId: session.id,
      session,
      sender: 'SYSTEM',
      senderName: 'Hệ Thống C.T Mart',
      text: `Tư vấn viên ${staffName} (Bộ phận Bán hàng C.T Mart) đã tham gia cuộc trò chuyện.`,
    });
    await this.messageRepo.save(sysMsg);

    session.lastMessage = sysMsg.text;
    session.lastMessageAt = new Date();
    await this.sessionRepo.update(session.id, {
      status: session.status,
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      unreadCount: 0,
      lastMessage: session.lastMessage,
      lastMessageAt: session.lastMessageAt,
    });

    return { session, systemMessage: sysMsg };
  }

  /**
   * Lưu tin nhắn phản hồi của nhân viên bán hàng
   * Tự động gán nhân viên và chuyển trạng thái sang STAFF_CONNECTED
   */
  async saveStaffReply(sessionId: string, staffId: string, staffName: string, text: string, imageUrl?: string): Promise<ChatMessage> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const isVideo = (imageUrl || '').match(/\.(mp4|webm|mov|avi)(\?|$)/i);
    const cleanText = text?.trim() || (imageUrl ? (isVideo ? '[Video]' : '[Hình ảnh]') : '');
    const msg = this.messageRepo.create({
      sessionId,
      session,
      sender: 'STAFF',
      senderName: staffName || session.assignedStaffName || 'Tư vấn viên C.T Mart',
      text: cleanText,
      imageUrl: imageUrl || null,
    });
    const saved = await this.messageRepo.save(msg);

    // Tự động chuyển session sang STAFF_CONNECTED khi nhân viên bán hàng trả lời khách
    session.status = 'STAFF_CONNECTED';
    session.assignedStaffId = staffId || session.assignedStaffId || 'staff-1';
    session.assignedStaffName = staffName || session.assignedStaffName || 'Tư vấn viên C.T Mart';
    session.lastMessage = cleanText;
    session.lastMessageAt = new Date();
    session.unreadCount = 0;

    await this.sessionRepo.update(session.id, {
      status: 'STAFF_CONNECTED',
      assignedStaffId: session.assignedStaffId,
      assignedStaffName: session.assignedStaffName,
      lastMessage: session.lastMessage,
      lastMessageAt: session.lastMessageAt,
      unreadCount: 0,
    });

    return saved;
  }

  /**
   * Chuyển lại quyền hỗ trợ cho AI sau khi nhân viên giải quyết xong
   */
  async handBackToAi(sessionId: string): Promise<{ session: ChatSession; systemMessage: ChatMessage }> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId }, relations: ['messages'] });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Chống duplicate nếu vừa bấm bàn giao lại cho AI
    const msgs = session.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (session.status === 'AI_ACTIVE' && lastMsg && lastMsg.sender === 'SYSTEM' && lastMsg.text.includes('chuyển lại cho Trợ lý AI')) {
      return { session, systemMessage: lastMsg };
    }

    session.status = 'AI_ACTIVE';
    const sysMsg = this.messageRepo.create({
      sessionId: session.id,
      session,
      sender: 'SYSTEM',
      senderName: 'Hệ Thống C.T Mart',
      text: 'Cuộc trò chuyện đã được chuyển lại cho Trợ lý AI C.T Mart. AI sẵn sàng hỗ trợ Quý khách 24/7!',
    });
    await this.messageRepo.save(sysMsg);

    session.lastMessage = sysMsg.text;
    session.lastMessageAt = new Date();
    await this.sessionRepo.update(session.id, {
      status: session.status,
      lastMessage: session.lastMessage,
      lastMessageAt: session.lastMessageAt,
    });

    return { session, systemMessage: sysMsg };
  }

  /**
   * Lấy danh sách các phiên chat mà khách hàng yêu cầu gặp Saler (Human Escalation)
   */
  async getAllSessions(statusFilter?: string): Promise<ChatSession[]> {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoinAndSelect('session.messages', 'messages')
      .orderBy('session.lastMessageAt', 'DESC');

    // Mặc định hiển thị các phiên khách cần Saler (WAITING_FOR_STAFF, STAFF_CONNECTED)
    // HOẶC các phiên mà Saler đã từng tiếp nhận và chuyển lại cho AI (để Saler vẫn theo dõi được)
    if (statusFilter && statusFilter !== 'ALL') {
      qb.where('session.status = :status', { status: statusFilter });
    } else {
      qb.where('(session.status IN (:...statuses) OR session.assignedStaffId IS NOT NULL)', {
        statuses: ['WAITING_FOR_STAFF', 'STAFF_CONNECTED'],
      });
    }

    const sessions = await qb.getMany();
    
    // Khử trùng lặp: ưu tiên gom nhóm theo customerId -> customerPhone -> id để không bị đẻ nhiều dòng cho cùng 1 khách
    const uniqueSessions: ChatSession[] = [];
    const seenKeys = new Set<string>();

    for (const s of sessions) {
      const key = s.customerId || (s.customerPhone && s.customerPhone !== '0909000111' && s.customerPhone !== '0909 000 111' ? s.customerPhone : null) || s.id;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        if (s.messages) {
          s.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        uniqueSessions.push(s);
      }
    }

    return uniqueSessions;
  }

  /**
   * Cập nhật nhanh trạng thái phiên chat
   */
  async updateSessionStatus(sessionId: string, status: ChatSessionStatus): Promise<void> {
    await this.sessionRepo.update(sessionId, { status });
  }

  /**
   * Lấy chi tiết lịch sử tin nhắn của một phiên
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Xóa vĩnh viễn phiên chat và toàn bộ tin nhắn liên quan để giải phóng bộ nhớ
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Xóa toàn bộ tin nhắn thuộc phiên này
    await this.messageRepo.delete({ sessionId });

    // Xóa phiên chat
    await this.sessionRepo.delete(sessionId);
    this.logger.log(`Session ${sessionId} and all its messages deleted successfully.`);
    return true;
  }
}
