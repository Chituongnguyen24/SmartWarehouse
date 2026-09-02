import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Truck,
  Boxes,
  Receipt,
  Printer,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'AI' | 'USER';
  text: string;
  timestamp: string;
  actionButtons?: { label: string; action: () => void; color?: string }[];
}

const QUICK_PROMPTS = [
  '🛵 Tìm tài xế rảnh gần nhất giao gấp',
  '🥦 Kiểm tra các lô hàng cận date 48h',
  '💵 Đối soát & In phiếu thu COD',
  '📊 Tóm tắt tình hình vận hành hôm nay',
  '📥 Hướng dẫn lập phiếu nhập kho MISA',
];

export const AICoPilotAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'AI',
      text: 'Xin chào! Tôi là **Trợ Lý AI Điều Phối & Quản Trị Kho CityMart**. Tôi có thể giúp bạn tìm shipper gần nhất theo GPS, kiểm tra lô hàng cận date FEFO, in chứng từ MISA hoặc tra cứu báo cáo vận hành tức thì. Bạn cần hỗ trợ gì hôm nay?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // AI Logic processing query
    setTimeout(() => {
      const lower = query.toLowerCase();
      let aiResponseText = '';
      let actionButtons: { label: string; action: () => void; color?: string }[] | undefined;

      if (lower.includes('tài xế') || lower.includes('shipper') || lower.includes('giao gấp') || lower.includes('rảnh')) {
        aiResponseText = `🛰️ **Kết quả định vị GPS thời gian thực:**\n\n• **Võ Minh Trí** (59-V1 888.99) - Cách Kho Gò Vấp **1.2 km** (Trạng thái: 🟢 Sẵn sàng nhận đơn).\n• **Trần Quốc Bảo** (59-G2 678.90) - Cách Kho Gò Vấp **2.8 km** (Đang giao 1 đơn).\n\n💡 *Khuyến nghị:* Gán cho tài xế **Võ Minh Trí** để đảm bảo thời gian lấy hàng dưới 8 phút.`;
        actionButtons = [
          { label: '🚀 Mở Bảng Điều Phối', action: () => navigate('/order-dispatch'), color: '#2563eb' },
          { label: '🗺️ Xem Bản Đồ Control Tower', action: () => navigate('/transport-optimization'), color: '#059669' },
        ];
      } else if (lower.includes('cận date') || lower.includes('hạn dùng') || lower.includes('fefo') || lower.includes('hết hạn')) {
        aiResponseText = `🥦 **Cảnh báo Lô Hàng Cận Date (Chiến lược FEFO):**\n\n1. **Thịt heo xay CP** - Lô \`LOT-0828-C\` (Còn **2 ngày** - Tồn 15 khay).\n2. **Sữa tươi thanh trùng Đà Lạt Milk** - Lô \`LOT-0820-A\` (Còn **3 ngày** - Tồn 12 chai).\n3. **Rau xà lách thủy canh** - Lô \`LOT-0830-B\` (Còn **1 ngày** - Tồn 10 gói).\n\n💡 *Hệ thống đã tự động ưu tiên xuất các lô này cho các đơn hàng TMĐT tiếp theo.*`;
        actionButtons = [
          { label: '📋 Xem Sổ Nhập - Xuất - Tồn', action: () => navigate('/reports'), color: '#d97706' },
          { label: '📦 Kiểm Tra Kho Hàng', action: () => navigate('/inventory'), color: '#0f766e' },
        ];
      } else if (lower.includes('phiếu thu') || lower.includes('cod') || lower.includes('đối soát') || lower.includes('tiền')) {
        aiResponseText = `💵 **Tổng hợp Quỹ Tiền Mặt COD hôm nay:**\n\n• **Võ Minh Trí:** Thu hộ \`4.850.000đ\` (18 đơn hoàn tất) - *Đã nộp quỹ*\n• **Trần Quốc Bảo:** Thu hộ \`3.920.000đ\` (16 đơn) - *Đã nộp quỹ*\n• **Phạm Hoàng Nam:** Thu hộ \`3.450.000đ\` (14 đơn) - *Chờ thu ngân*\n\nTổng quỹ tiền mặt đã thu: **14.850.000đ** (Định khoản Nợ 1111 / Có 131).`;
        actionButtons = [
          { label: '💵 Mở Sổ Quỹ & In Phiếu Thu', action: () => navigate('/reports'), color: '#2563eb' },
        ];
      } else if (lower.includes('tóm tắt') || lower.includes('báo cáo') || lower.includes('vận hành') || lower.includes('hôm nay')) {
        aiResponseText = `📊 **Tóm Tắt Báo Cáo Toàn Hệ Thống:**\n\n• **Tổng đơn hàng:** 48 đơn (Hoàn tất: **45 đơn**, Đang giao: **3 đơn**).\n• **Tỷ lệ đúng hạn OTIF:** **98.8%**.\n• **Doanh thu:** \`31.250.000đ\` (VAT 8%: \`2.314.815đ\`).\n• **Thời gian xử lý trung bình:** **28.5 phút/đơn**.\n• **Quãng đường di chuyển:** **108.4 km** toàn đội xe.`;
        actionButtons = [
          { label: '📈 Mở Trung Tâm Báo Cáo', action: () => navigate('/reports'), color: '#059669' },
        ];
      } else if (lower.includes('misa') || lower.includes('nhập kho') || lower.includes('xuất kho')) {
        aiResponseText = `📥 **Quy Trình Nghiệp Vụ Chuẩn MISA AMIS:**\n\n1. **Nhập Kho (Mẫu 01-VT):** Hỗ trợ 4 loại chứng từ: *Nhập mua NCC (Nợ 1561/1331 - Có 331), Hàng trả lại (Nợ 1561 - Có 632), Điều chuyển nội bộ, Nhập kiểm kê thừa*.\n2. **Xuất Kho (Mẫu 02-VT):** Hỗ trợ: *Xuất bán lẻ FEFO (Nợ 632 - Có 1561), Xuất điều chuyển, Trả hàng NCC, Xuất hủy hết hạn*.\n\nBạn có thể lập phiếu mới hoặc in chứng từ trực tiếp ngay bây giờ.`;
        actionButtons = [
          { label: '📥 Mở Quản Lý Nhập Kho', action: () => navigate('/inbound-orders'), color: '#0f766e' },
          { label: '📤 Mở Quản Lý Xuất Kho', action: () => navigate('/outbound-orders'), color: '#2563eb' },
        ];
      } else {
        aiResponseText = `Tôi đã ghi nhận yêu cầu: "${query}".\n\nTôi có thể hỗ trợ bạn thực hiện các thao tác: **Điều phối giao hàng**, **Kiểm tra tồn kho FEFO**, **In chứng từ kế toán MISA** hoặc **Xuất báo cáo thuế GTGT**. Bạn có thể bấm chọn các phím tắt bên dưới để xử lý nhanh.`;
        actionButtons = [
          { label: '🚀 Điều Phối Đơn Hàng', action: () => navigate('/order-dispatch'), color: '#2563eb' },
          { label: '📊 Xem Báo Cáo', action: () => navigate('/reports'), color: '#059669' },
        ];
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionButtons,
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Launcher Button (Góc dưới bên phải) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 500,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '2px solid #38bdf8',
            borderRadius: '999px',
            padding: '10px 16px',
            boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Sparkles size={20} color="#38bdf8" />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.2px' }}>
              AI Co-Pilot Vận Hành
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
              Trợ lý điều phối & kho 24/7
            </div>
          </div>
        </button>
      )}

      {/* Expanded AI Co-Pilot Modal Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '600px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #38bdf8',
                }}
              >
                <Bot size={20} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>AI Operations Co-Pilot</span>
                  <span style={{ fontSize: '9px', backgroundColor: '#059669', color: '#ffffff', padding: '1px 6px', borderRadius: '999px', fontWeight: 800 }}>
                    PRO
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Hệ thống siêu thị CityMart • Real-time Active
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: 'none',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts Carousel */}
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    backgroundColor: msg.sender === 'USER' ? '#2563eb' : '#ffffff',
                    color: msg.sender === 'USER' ? '#ffffff' : '#0f172a',
                    padding: '12px 14px',
                    borderRadius: msg.sender === 'USER' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    border: msg.sender === 'AI' ? '1px solid #e2e8f0' : 'none',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.text}

                  {/* Action Buttons attached to AI response */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                      {msg.actionButtons.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => {
                            btn.action();
                            setIsOpen(false);
                          }}
                          style={{
                            backgroundColor: btn.color || '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>{btn.label}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', padding: '4px 8px' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>AI đang phân tích dữ liệu kho & định vị GPS...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Nhập câu lệnh điều phối, tìm xe, tra cứu lô..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                backgroundColor: '#f8fafc',
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              style={{
                backgroundColor: inputMessage.trim() ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
