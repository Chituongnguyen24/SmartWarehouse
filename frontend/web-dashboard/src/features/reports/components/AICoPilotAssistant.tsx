import React, { useState, useRef, useEffect } from 'react';
import {
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
  RefreshCw,
  Activity,
  Layers,
  MapPin,
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
  'Tìm tài xế rảnh gần nhất',
  'Kiểm tra lô hàng cận date 48h',
  'Đối soát quỹ thu COD',
  'Tóm tắt vận hành hôm nay',
  'Quy trình lập chứng từ nhập kho',
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
      text: 'Xin chào! Tôi là **Trợ Lý Điều Phối & Quản Trị Kho CityMart**. Tôi có thể hỗ trợ bạn tìm shipper khả dụng, kiểm tra lô hàng cận date, đối soát quỹ COD hoặc tra cứu báo cáo vận hành. Bạn cần hỗ trợ công việc gì?',
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

    // Processing query
    setTimeout(() => {
      const lower = query.toLowerCase();
      let aiResponseText = '';
      let actionButtons: { label: string; action: () => void; color?: string }[] | undefined;

      if (lower.includes('tài xế') || lower.includes('shipper') || lower.includes('giao gấp') || lower.includes('rảnh')) {
        aiResponseText = `**Kết quả định vị GPS đội xe:**\n\n• **Võ Minh Trí** (59-V1 888.99) - Cách Kho Gò Vấp **1.2 km** (Trạng thái: Sẵn sàng nhận đơn).\n• **Trần Quốc Bảo** (59-G2 678.90) - Cách Kho Gò Vấp **2.8 km** (Đang giao 1 đơn).\n\n*Khuyến nghị:* Điều phối tài xế **Võ Minh Trí** để đảm bảo thời gian nhận hàng dưới 8 phút.`;
        actionButtons = [
          { label: 'Mở Bảng Điều Phối', action: () => navigate('/order-dispatch'), color: '#0f766e' },
          { label: 'Xem Bản Đồ Giám Sát', action: () => navigate('/transport-optimization'), color: '#0284c7' },
        ];
      } else if (lower.includes('cận date') || lower.includes('hạn dùng') || lower.includes('fefo') || lower.includes('hết hạn')) {
        aiResponseText = `**Danh sách Lô Hàng Cận Hạn Sử Dụng (Ưu tiên xuất trước):**\n\n1. **Thịt heo xay CP** - Lô \`LOT-0828-C\` (Còn **2 ngày** - Tồn 15 khay).\n2. **Sữa tươi thanh trùng Đà Lạt Milk** - Lô \`LOT-0820-A\` (Còn **3 ngày** - Tồn 12 chai).\n3. **Rau xà lách thủy canh** - Lô \`LOT-0830-B\` (Còn **1 ngày** - Tồn 10 gói).\n\n*Hệ thống đã tự động gán ưu tiên xuất các lô này cho các đơn hàng tiếp theo.*`;
        actionButtons = [
          { label: 'Xem Sổ Nhập - Xuất - Tồn', action: () => navigate('/reports'), color: '#d97706' },
          { label: 'Kiểm Tra Tồn Kho', action: () => navigate('/inventory'), color: '#0f766e' },
        ];
      } else if (lower.includes('phiếu thu') || lower.includes('cod') || lower.includes('đối soát') || lower.includes('tiền')) {
        aiResponseText = `**Tổng hợp Quỹ Tiền Mặt COD trong ca:**\n\n• **Võ Minh Trí:** Thu hộ \`4.850.000đ\` (18 đơn hoàn tất) - *Đã nộp quỹ*\n• **Trần Quốc Bảo:** Thu hộ \`3.920.000đ\` (16 đơn) - *Đã nộp quỹ*\n• **Phạm Hoàng Nam:** Thu hộ \`3.450.000đ\` (14 đơn) - *Chờ thu ngân*\n\nTổng quỹ tiền mặt đã thu: **14.850.000đ**.`;
        actionButtons = [
          { label: 'Mở Sổ Quỹ & In Chứng Từ', action: () => navigate('/reports'), color: '#0f766e' },
        ];
      } else if (lower.includes('tóm tắt') || lower.includes('báo cáo') || lower.includes('vận hành') || lower.includes('hôm nay')) {
        aiResponseText = `**Tóm Tắt Vận Hành Toàn Hệ Thống:**\n\n• **Tổng đơn hàng:** 48 đơn (Hoàn tất: **45 đơn**, Đang giao: **3 đơn**).\n• **Tỷ lệ đúng hạn OTIF:** **98.8%**.\n• **Doanh thu:** \`31.250.000đ\` (VAT 8%: \`2.314.815đ\`).\n• **Thời gian xử lý trung bình:** **28.5 phút/đơn**.\n• **Quãng đường di chuyển:** **108.4 km** toàn đội xe.`;
        actionButtons = [
          { label: 'Mở Trung Tâm Báo Cáo', action: () => navigate('/reports'), color: '#0f766e' },
        ];
      } else if (lower.includes('nhập kho') || lower.includes('xuất kho') || lower.includes('chứng từ') || lower.includes('misa')) {
        aiResponseText = `**Quy Trình Nghiệp Vụ Kho Vận:**\n\n1. **Nhập Kho (Mẫu 01-VT):** Hỗ trợ 4 hình thức: *Nhập mua NCC, Khách hàng trả lại, Điều chuyển nội bộ, Nhập kiểm kê thừa*.\n2. **Xuất Kho (Mẫu 02-VT):** Hỗ trợ: *Xuất bán hàng FEFO, Xuất điều chuyển, Trả hàng NCC, Xuất tiêu hủy sản phẩm*.\n\nBạn có thể lập phiếu mới hoặc in chứng từ trực tiếp ngay bây giờ.`;
        actionButtons = [
          { label: 'Quản Lý Nhập Kho', action: () => navigate('/inbound-orders'), color: '#0f766e' },
          { label: 'Quản Lý Xuất Kho', action: () => navigate('/outbound-orders'), color: '#0284c7' },
        ];
      } else {
        aiResponseText = `Đã ghi nhận yêu cầu: "${query}".\n\nBạn có thể thực hiện nhanh các tác vụ: **Điều phối đơn hàng**, **Kiểm tra tồn kho theo hạn dùng (FEFO)**, **In chứng từ xuất nhập kho** hoặc **Xem báo cáo doanh thu**.`;
        actionButtons = [
          { label: 'Điều Phối Đơn Hàng', action: () => navigate('/order-dispatch'), color: '#0f766e' },
          { label: 'Xem Báo Cáo Vận Hành', action: () => navigate('/reports'), color: '#0284c7' },
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
    }, 450);
  };

  return (
    <>
      {/* Floating Launcher Button */}
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
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '8px 14px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bot size={18} color="#94a3b8" />
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#ffffff' }}>
              Trợ Lý Điều Phối
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Hỗ trợ vận hành kho
            </div>
          </div>
        </button>
      )}

      {/* Expanded Assistant Modal Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
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
              padding: '14px 18px',
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
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #334155',
                }}
              >
                <Bot size={18} color="#94a3b8" />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>
                  Trợ Lý Điều Phối Kho Hàng
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  CityMart Operations Assistant
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
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
              padding: '8px 12px',
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
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
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
                    backgroundColor: msg.sender === 'USER' ? '#0f766e' : '#ffffff',
                    color: msg.sender === 'USER' ? '#ffffff' : '#0f172a',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: msg.sender === 'USER' ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>

                {/* Optional Action Buttons attached to message */}
                {msg.actionButtons && msg.actionButtons.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {msg.actionButtons.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={btn.action}
                        style={{
                          backgroundColor: '#ffffff',
                          color: btn.color || '#0f766e',
                          border: `1px solid ${btn.color || '#0f766e'}`,
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
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

                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                <RefreshCw size={12} className="spin" />
                <span>Đang tra cứu dữ liệu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Nhập yêu cầu tra cứu hoặc điều phối..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12.5px',
                outline: 'none',
                color: '#0f172a',
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              style={{
                backgroundColor: inputMessage.trim() ? '#0f766e' : '#e2e8f0',
                color: inputMessage.trim() ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                cursor: inputMessage.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
