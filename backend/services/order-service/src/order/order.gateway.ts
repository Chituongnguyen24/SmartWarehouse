import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 5e7, // 50MB
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('OrderGateway');

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('customer_chat_message')
  async handleCustomerChatMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`Customer Chat Message received: ${data?.customerName || 'Customer'} - ${data?.text}`);
    try {
      const customerPhone = data.customerPhone || undefined;
      const customerName = data.customerName || 'Khách hàng Trực tuyến';
      const customerId = data.customerId || undefined;
      const text = data.text;

      // 1. Get or init session
      const session = await this.chatService.initOrGetSession(customerPhone, customerName, customerId, data.sessionId);

      // 2. Save customer message
      const savedCustomerMsg = await this.chatService.saveCustomerMessage(session.id, text, customerName, data.imageUrl);
      
      // Báo lại cho client gửi và phát sóng cho bàn điều phối Saler
      client.emit('customer_message_saved', {
        sessionId: session.id,
        message: savedCustomerMsg,
      });

      this.server.emit('customer_chat_message', {
        sessionId: session.id,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        text: savedCustomerMsg.text,
        imageUrl: savedCustomerMsg.imageUrl,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        message: savedCustomerMsg,
      });

      // 3. Kiểm tra xem phiên có người thật trực tiếp quản lý hay không:
      // Khi session ở trạng thái STAFF_CONNECTED hoặc WAITING_FOR_STAFF -> AI tuyệt đối KHÔNG xen vào!
      // Khi session ở trạng thái AI_ACTIVE (khởi tạo ban đầu hoặc Saler đã ấn bàn giao lại cho AI) -> AI tự động xử lý.
      const isManagedByStaff =
        session.status === 'STAFF_CONNECTED' ||
        session.status === 'WAITING_FOR_STAFF';

      if (isManagedByStaff) {
        const targetStatus = session.assignedStaffId ? 'STAFF_CONNECTED' : 'WAITING_FOR_STAFF';
        if (session.status !== targetStatus) {
          session.status = targetStatus;
          await this.chatService.updateSessionStatus(session.id, targetStatus as any);
        }

        this.logger.log(`Session ${session.id} is managed by staff (${session.status}). Muting AI completely.`);

        this.server.emit('staff_chat_incoming', {
          sessionId: session.id,
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          text: savedCustomerMsg.text,
          imageUrl: savedCustomerMsg.imageUrl,
          message: savedCustomerMsg,
          session,
        });
      } else {
        // Chỉ kích hoạt trợ lý AI Gemini khi phiên thuần túy ở trạng thái tự động (AI_ACTIVE)
        client.emit('bot_typing', { isTyping: true, sessionId: session.id });

        const aiResult = await this.chatService.processAiReply(session.id, text);

        client.emit('bot_typing', { isTyping: false, sessionId: session.id });

        // Phát sóng câu trả lời của AI cho cả Khách hàng và Bàn điều phối Saler
        this.server.emit('bot_chat_reply', {
          sessionId: session.id,
          text: aiResult.message.text,
          productCard: aiResult.message.productCard,
          quickOptions: aiResult.message.quickOptions,
          message: aiResult.message,
          session: aiResult.session,
          handoffRequested: aiResult.handoffRequested,
        });

        // If handoff was requested by AI, notify Salers
        if (aiResult.handoffRequested) {
          this.server.emit('staff_handoff_alert', {
            sessionId: session.id,
            customerName: session.customerName,
            customerPhone: session.customerPhone,
            aiSummary: aiResult.session.aiSummary,
            reason: aiResult.handoffReason,
            session: aiResult.session,
          });
        }
      }

      // Broadcast session update to update Saler live chat list
      this.server.emit('chat_session_updated', session);
    } catch (err: any) {
      this.logger.error(`Error processing customer_chat_message: ${err.message}`);
      client.emit('bot_typing', { isTyping: false });
    }
  }

  @SubscribeMessage('request_human_handoff')
  async handleRequestHumanHandoff(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`Human handoff requested for session: ${data.sessionId}`);
    try {
      const result = await this.chatService.requestHandoff(data.sessionId, data.reason);
      client.emit('bot_chat_reply', {
        sessionId: result.session.id,
        message: result.systemMessage,
        session: result.session,
        handoffRequested: true,
      });

      this.server.emit('staff_handoff_alert', {
        sessionId: result.session.id,
        customerName: result.session.customerName,
        customerPhone: result.session.customerPhone,
        aiSummary: result.session.aiSummary,
        reason: data.reason || 'Khách hàng bấm gặp nhân viên tư vấn',
        session: result.session,
      });
      this.server.emit('chat_session_updated', result.session);
    } catch (err: any) {
      this.logger.error(`Error in request_human_handoff: ${err.message}`);
    }
  }

  @SubscribeMessage('staff_takeover_session')
  async handleStaffTakeover(@MessageBody() data: any) {
    this.logger.log(`Staff ${data.staffName} taking over session: ${data.sessionId}`);
    try {
      const result = await this.chatService.staffTakeover(data.sessionId, data.staffId, data.staffName);
      this.server.emit('staff_connected', {
        sessionId: result.session.id,
        staffName: data.staffName,
        systemMessage: result.systemMessage,
        session: result.session,
      });
      this.server.emit('chat_session_updated', result.session);
    } catch (err: any) {
      this.logger.error(`Error in staff_takeover_session: ${err.message}`);
    }
  }

  @SubscribeMessage('staff_chat_reply')
  async handleStaffChatReply(@MessageBody() data: any) {
    this.logger.log(`Staff Chat Reply sent: ${data?.staffName || 'Staff'} -> ${data?.text}`);
    try {
      const saved = await this.chatService.saveStaffReply(
        data.sessionId,
        data.staffId || 'staff-1',
        data.staffName || 'Tư vấn viên C.T Mart',
        data.text,
        data.imageUrl,
      );
      this.server.emit('staff_chat_reply', {
        sessionId: data.sessionId,
        message: saved,
        staffName: data.staffName || 'Tư vấn viên C.T Mart',
        text: saved.text,
        imageUrl: saved.imageUrl,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
      this.server.emit('chat_session_updated', {
        id: data.sessionId,
        status: 'STAFF_CONNECTED',
        assignedStaffId: data.staffId || 'staff-1',
        assignedStaffName: data.staffName || 'Tư vấn viên C.T Mart',
        lastMessage: data.text,
      });
    } catch (err: any) {
      this.logger.error(`Error in staff_chat_reply: ${err.message}`);
    }
  }

  @SubscribeMessage('hand_back_to_ai')
  async handleHandBackToAi(@MessageBody() data: any) {
    this.logger.log(`Handing session ${data.sessionId} back to AI`);
    try {
      const result = await this.chatService.handBackToAi(data.sessionId);
      this.server.emit('hand_back_to_ai', {
        sessionId: result.session.id,
        systemMessage: result.systemMessage,
        session: result.session,
      });
      this.server.emit('chat_session_updated', result.session);
    } catch (err: any) {
      this.logger.error(`Error in hand_back_to_ai: ${err.message}`);
    }
  }

  @SubscribeMessage('delete_chat_session')
  async handleDeleteChatSession(@MessageBody() data: any) {
    this.logger.log(`Delete chat session requested: ${data?.sessionId}`);
    try {
      if (data?.sessionId) {
        await this.chatService.deleteSession(data.sessionId);
        this.server.emit('chat_session_deleted', { sessionId: data.sessionId });
      }
    } catch (err: any) {
      this.logger.error(`Error deleting chat session: ${err.message}`);
    }
  }

  emitNewOrder(orderData: any) {
    if (this.server) {
      this.server.emit('new_order', orderData);
      this.server.emit('outbound_order_created', orderData);
      this.server.emit('all_alerts', { channel: 'outbound_order_created', data: orderData, timestamp: new Date().toISOString() });
      this.logger.log(`Emitted new_order & outbound_order_created event for Order ID: ${orderData.id}`);
    }
  }

  emitOrderStatusUpdated(orderData: any) {
    if (this.server) {
      this.server.emit('order_status_updated', orderData);
      this.server.emit('outbound_order_updated', orderData);
      this.server.emit('all_alerts', { channel: 'order_status_updated', data: orderData, timestamp: new Date().toISOString() });
      this.logger.log(`Emitted order_status_updated for Order ID: ${orderData.id}, Status: ${orderData.status}`);
    }
  }

  broadcastEvent(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
      this.server.emit('all_alerts', { channel: event, data: payload, timestamp: new Date().toISOString() });
      this.logger.log(`Broadcasted "${event}" event: ${JSON.stringify(payload)}`);
    }
  }
}
