import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chat Support & AI Co-Pilot')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions/init')
  @ApiOperation({ summary: 'Khởi tạo hoặc khôi phục phiên chat khách hàng' })
  async initSession(
    @Body() body: { customerPhone?: string; customerName?: string; customerId?: string; sessionId?: string },
  ) {
    return this.chatService.initOrGetSession(body.customerPhone, body.customerName, body.customerId, body.sessionId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Lấy danh sách các phiên chat cho nhân viên bán hàng' })
  async getSessions(@Query('status') status?: string) {
    return this.chatService.getAllSessions(status);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload hình ảnh hoặc video tin nhắn chat lên Amazon S3' })
  async uploadMedia(
    @Body() body: { mediaBase64: string; filename?: string; mimeType?: string },
  ) {
    return this.chatService.uploadMedia(body.mediaBase64, body.filename, body.mimeType);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử tin nhắn của một phiên chat' })
  async getMessages(@Param('id') sessionId: string) {
    return this.chatService.getSessionMessages(sessionId);
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn trong phiên chat' })
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() body: { sender: 'CUSTOMER' | 'STAFF'; text: string; staffId?: string; staffName?: string; customerName?: string },
  ) {
    if (body.sender === 'STAFF') {
      return this.chatService.saveStaffReply(sessionId, body.staffId || 'staff-1', body.staffName || 'Tư vấn viên', body.text);
    } else {
      const saved = await this.chatService.saveCustomerMessage(sessionId, body.text, body.customerName);
      const session = await this.chatService.initOrGetSession(undefined, undefined, undefined, sessionId);
      
      // Nếu khách đã yêu cầu gặp Saler hoặc Saler đang trực tiếp tư vấn -> Tuyệt đối không để AI xen vào
      if (session.status === 'STAFF_CONNECTED' || session.status === 'WAITING_FOR_STAFF') {
        return { customerMessage: saved, session, aiReply: null };
      }

      const aiReply = await this.chatService.processAiReply(sessionId, body.text);
      return { customerMessage: saved, aiReply: aiReply.message, session: aiReply.session };
    }
  }

  @Post('sessions/:id/takeover')
  @ApiOperation({ summary: 'Nhân viên bán hàng tiếp nhận phiên chat' })
  async takeover(
    @Param('id') sessionId: string,
    @Body() body: { staffId: string; staffName: string },
  ) {
    return this.chatService.staffTakeover(sessionId, body.staffId, body.staffName);
  }

  @Post('sessions/:id/request-handoff')
  @ApiOperation({ summary: 'Khách hàng yêu cầu gặp nhân viên tư vấn' })
  async requestHandoff(
    @Param('id') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    return this.chatService.requestHandoff(sessionId, body.reason);
  }

  @Post('sessions/:id/handback')
  @ApiOperation({ summary: 'Chuyển lại quyền hỗ trợ cho Trợ lý AI' })
  async handback(@Param('id') sessionId: string) {
    return this.chatService.handBackToAi(sessionId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Xóa vĩnh viễn phiên chat và giải phóng bộ nhớ' })
  async deleteSession(@Param('id') sessionId: string) {
    await this.chatService.deleteSession(sessionId);
    return { success: true, message: `Phiên chat ${sessionId} đã được xóa thành công` };
  }
}

