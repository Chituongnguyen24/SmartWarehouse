"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Minimize2, 
  RefreshCw, 
  Phone, 
  ChevronRight,
  Package,
  Clock,
  HelpCircle,
  Truck,
  UserCheck,
  Headset,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Paperclip,
  Video,
  FileVideo
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store";
import { getApiHost } from "@/lib/api";

interface ProductCardData {
  id?: string;
  name: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  inStock?: boolean;
}

interface Message {
  id: string;
  sender: "bot" | "user" | "staff" | "system";
  staffName?: string;
  text: string;
  imageUrl?: string;
  time: string;
  productCard?: ProductCardData;
  options?: string[];
}

export default function CustomerFloatingActions() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    isVideo: boolean;
    filename: string;
    mimeType: string;
    compressedSizeText: string;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"AI_ACTIVE" | "WAITING_FOR_STAFF" | "STAFF_CONNECTED" | "RESOLVED">("AI_ACTIVE");
  const [assignedStaffName, setAssignedStaffName] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Xin chào quý khách! Tôi là Trợ lý AI C.T Mart. Tôi có thể hỗ trợ quý khách tìm kiếm sản phẩm, kiểm tra đơn hàng, tư vấn chính sách giao hàng 2h hoặc kết nối trực tiếp với Tư vấn viên Bán hàng (Saler) bất cứ lúc nào!",
      time: "Vừa xong",
      options: [
        "Chính sách giao hàng 2h",
        "Tra cứu tình trạng đơn hàng",
        "Sản phẩm khuyến mãi hôm nay",
        "Gặp nhân viên tư vấn bán hàng"
      ]
    }
  ]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Khởi tạo hoặc khôi phục Chat Session từ Backend
  const initChatSession = async () => {
    try {
      setIsInitializing(true);
      const savedSessionId = typeof window !== "undefined" ? localStorage.getItem("ctmart_chat_session_id") : null;
      
      // Tạo hoặc lấy mã thiết bị ẩn danh duy nhất cho khách vãng lai nếu chưa đăng nhập
      let guestDeviceId = "";
      if (typeof window !== "undefined") {
        guestDeviceId = localStorage.getItem("ctmart_guest_device_id") || "";
        if (!guestDeviceId) {
          guestDeviceId = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          localStorage.setItem("ctmart_guest_device_id", guestDeviceId);
        }
      }

      const effectiveCustomerId = user?.id || guestDeviceId || undefined;
      const effectiveCustomerName = user?.name || (guestDeviceId ? `Khách vãng lai #${guestDeviceId.slice(-4)}` : "Khách hàng Trực tuyến");
      const effectiveCustomerPhone = user?.phone || undefined;

      const payload: any = {
        sessionId: savedSessionId || undefined,
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
        customerId: effectiveCustomerId
      };

      const res = await fetch(`${getApiHost(3004)}/chat/sessions/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const activeSession = data.session || data;
        setSessionId(activeSession.id);
        setSessionStatus(activeSession.status);
        if (activeSession.assignedStaffName) {
          setAssignedStaffName(activeSession.assignedStaffName);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("ctmart_chat_session_id", activeSession.id);
        }

        // Nếu có lịch sử tin nhắn từ DB, cập nhật vào state
        const rawMessages = data.messages || activeSession.messages || [];
        if (rawMessages.length > 0) {
          const mappedMessages: Message[] = rawMessages.map((m: any) => {
            let senderType: "bot" | "user" | "staff" | "system" = "bot";
            if (m.sender === "CUSTOMER") senderType = "user";
            else if (m.sender === "STAFF") senderType = "staff";
            else if (m.sender === "SYSTEM") senderType = "system";

            const createdAt = new Date(m.createdAt);
            const timeStr = `${createdAt.getHours().toString().padStart(2, "0")}:${createdAt.getMinutes().toString().padStart(2, "0")}`;

            return {
              id: m.id,
              sender: senderType,
              staffName: m.senderName,
              text: m.text,
              imageUrl: m.imageUrl || m.image_url,
              time: timeStr,
              productCard: m.productCard,
              options: m.quickOptions
            };
          });

          setMessages(mappedMessages);
        }

        // Join room WebSocket
        if (socketRef.current) {
          socketRef.current.emit("join_chat_session", { sessionId: activeSession.id });
        }
      }
    } catch (err) {
      console.warn("Không thể kết nối API chat session:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Lưu trữ state trong Ref để event listener của Socket luôn đọc giá trị mới nhất mà KHÔNG cần reconnect socket
  const sessionIdRef = useRef<string | null>(sessionId);
  const sessionStatusRef = useRef<string>(sessionStatus);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    if (sessionId && socketRef.current?.connected) {
      socketRef.current.emit("join_chat_session", { sessionId });
    }
  }, [sessionId]);

  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);

  // Kết nối Socket.IO 2 chiều với Order-service Gateway (Port 3004) duy nhất 1 lần
  useEffect(() => {
    const socket = io(getApiHost(3004), {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const activeId = sessionIdRef.current || (typeof window !== "undefined" ? localStorage.getItem("ctmart_chat_session_id") : null);
      if (activeId) {
        socket.emit("join_chat_session", { sessionId: activeId });
      }
    });

    // Lắng nghe bot đang gõ
    socket.on("bot_typing", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data.sessionId && data.sessionId !== currentId) return;
      setIsTyping(Boolean(data.isTyping));
    });

    // Lắng nghe phản hồi từ AI Bot
    socket.on("bot_chat_reply", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data.sessionId && data.sessionId !== currentId) return;

      // NẾU PHIÊN ĐANG CÓ SALER HOẶC ĐANG CHỜ SALER -> KHÔNG NHẬN BOT CHAT REPLY ĐỂ TRÁNH XEN VÀO
      const currentStatus = sessionStatusRef.current;
      if (currentStatus === "STAFF_CONNECTED" || currentStatus === "WAITING_FOR_STAFF") {
        setIsTyping(false);
        return;
      }

      setIsTyping(false);
      const replyText =
        data.text ||
        data.message?.text ||
        (typeof data.message === "string" ? data.message : "") ||
        "";

      // Nếu không có nội dung và không có sản phẩm đính kèm thì bỏ qua để tránh bong bóng trống
      if (!replyText.trim() && !data.productCard && !data.message?.productCard) return;

      const productCard = data.productCard || data.message?.productCard;
      const options = data.quickOptions || data.message?.quickOptions;

      const replyMsg: Message = {
        id: data.message?.id || `bot-${Date.now()}`,
        sender: "bot",
        text: replyText.trim(),
        time: getCurrentTime(),
        productCard,
        options,
      };
      setMessages((prev) => [...prev, replyMsg]);
    });

    // Lắng nghe Saler tiếp nhận phiên tư vấn
    socket.on("staff_connected", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data.sessionId && data.sessionId !== currentId) return;

      setSessionStatus("STAFF_CONNECTED");
      setAssignedStaffName(data.staffName || "Tư vấn viên C.T Mart");
      setIsTyping(false);

      const sysMsg: Message = {
        id: `sys-${Date.now()}`,
        sender: "system",
        text: `Tư vấn viên ${data.staffName || "C.T Mart"} đã tiếp nhận phiên và đang trực tiếp hỗ trợ quý khách!`,
        time: getCurrentTime()
      };
      setMessages((prev) => [...prev, sysMsg]);
    });

    // Lắng nghe Saler phản hồi chat (Tức thời từ nhân viên bán hàng)
    socket.on("staff_chat_reply", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data.sessionId && data.sessionId !== currentId) return;

      // Tự động chuyển sang STAFF_CONNECTED ngay khi có tin nhắn từ nhân viên
      setSessionStatus("STAFF_CONNECTED");
      if (data.staffName) {
        setAssignedStaffName(data.staffName);
      }
      setIsTyping(false);

      const text = data.text || data.message?.text || "";
      const replyMsg: Message = {
        id: data.message?.id || `staff-${Date.now()}`,
        sender: "staff",
        staffName: data.staffName || "Tư vấn viên C.T Mart (Saler)",
        text,
        imageUrl: data.imageUrl || data.message?.imageUrl,
        time: data.time || getCurrentTime()
      };
      setMessages((prev) => [...prev, replyMsg]);
    });

    // Lắng nghe chuyển giao lại cho AI
    socket.on("hand_back_to_ai", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data?.sessionId && data.sessionId !== currentId) return;

      setSessionStatus("AI_ACTIVE");
      setAssignedStaffName(null);
      const sysMsg: Message = {
        id: `sys-${Date.now()}`,
        sender: "system",
        text: "Tư vấn viên đã hoàn tất hỗ trợ. Trợ lý AI C.T Mart sẵn sàng tiếp tục phục vụ quý khách!",
        time: getCurrentTime()
      };
      setMessages((prev) => [...prev, sysMsg]);
    });

    // Lắng nghe khi cuộc trò chuyện bị xóa bởi Saler
    socket.on("chat_session_deleted", (data: any) => {
      const currentId = sessionIdRef.current;
      if (currentId && data?.sessionId === currentId) {
        setSessionId(null);
        setSessionStatus("AI_ACTIVE");
        setAssignedStaffName(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("ctmart_chat_session_id");
        }
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            sender: "bot",
            text: "Cuộc trò chuyện trước đó đã được dọn dẹp. Trợ lý AI C.T Mart sẵn sàng bắt đầu phiên hỗ trợ mới cùng quý khách!",
            time: getCurrentTime(),
            options: [
              "Chính sách giao hàng 2h",
              "Tra cứu tình trạng đơn hàng",
              "Sản phẩm khuyến mãi hôm nay",
              "Gặp nhân viên tư vấn bán hàng"
            ]
          }
        ]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Khởi tạo session khi mở popup
  useEffect(() => {
    if (isOpen && !sessionId) {
      initChatSession();
    }
  }, [isOpen]);

  // Yêu cầu gặp nhân viên tư vấn bán hàng
  const handleRequestStaffHandoff = async () => {
    if (!sessionId) {
      await initChatSession();
    }

    setSessionStatus("WAITING_FOR_STAFF");
    setIsTyping(false);

    const userReqMsg: Message = {
      id: `user-req-${Date.now()}`,
      sender: "user",
      text: "Tôi muốn gặp nhân viên tư vấn bán hàng",
      time: getCurrentTime()
    };

    const sysMsg: Message = {
      id: `sys-waiting-${Date.now()}`,
      sender: "system",
      text: "Đã gửi yêu cầu kết nối tới Tư vấn viên Bán hàng (Saler). Bạn vui lòng đợi trong giây lát, nhân viên trực ban sẽ nhận phiên ngay!",
      time: getCurrentTime()
    };

    setMessages((prev) => [...prev, userReqMsg, sysMsg]);

    // Gửi tín hiệu Socket (hoặc fallback REST nếu socket ngắt kết nối)
    if (socketRef.current && socketRef.current.connected && sessionId) {
      socketRef.current.emit("request_human_handoff", {
        sessionId,
        customerName: user?.name || "Khách hàng Trực tuyến"
      });
    } else if (sessionId) {
      try {
        await fetch(`${getApiHost(3004)}/chat/sessions/${sessionId}/request-handoff`, {
          method: "POST"
        });
      } catch (err) {
        console.error("Lỗi gửi handoff request:", err);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(file.name);
    if (isVideo) {
      if (file.size > 30 * 1024 * 1024) {
        alert("Video vượt quá 30MB! Vui lòng chọn video ngắn hơn để tối ưu bộ nhớ lưu trữ S3.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setSelectedMedia({
          file,
          previewUrl: URL.createObjectURL(file),
          base64: reader.result as string,
          isVideo: true,
          filename: file.name,
          mimeType: file.type || "video/mp4",
          compressedSizeText: `Video • ${sizeMb} MB`,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // Nén ảnh tự động bằng HTML5 Canvas để tiết kiệm bộ nhớ AWS S3
    try {
      const originalKb = Math.round(file.size / 1024);
      const { base64, mimeType } = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new (window as any).Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxDim = 1280;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ base64: ev.target?.result as string, mimeType: file.type });
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const format = file.type === "image/png" && file.size < 400000 ? "image/png" : "image/jpeg";
            const compressed = canvas.toDataURL(format, 0.78);
            resolve({ base64: compressed, mimeType: format });
          };
          img.onerror = reject;
          img.src = ev.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const approxKb = Math.round((base64.length * 3) / 4 / 1024);
      setSelectedMedia({
        file,
        previewUrl: base64,
        base64,
        isVideo: false,
        filename: file.name,
        mimeType,
        compressedSizeText: `Đã nén ${originalKb}KB → ${approxKb}KB`,
      });
    } catch (err) {
      console.error("Lỗi nén ảnh:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text && !selectedMedia) return;
    if (isUploadingMedia) return;

    if (text === "Gặp nhân viên tư vấn bán hàng" || text.toLowerCase().includes("gặp nhân viên") || text.toLowerCase().includes("gặp saler")) {
      handleRequestStaffHandoff();
      if (!textToSend) setInputMessage("");
      return;
    }

    let s3MediaUrl: string | undefined = undefined;
    let isVideoMsg = false;

    // Upload lên Amazon S3 trước khi gửi để tối ưu WebSocket
    if (selectedMedia) {
      try {
        setIsUploadingMedia(true);
        isVideoMsg = selectedMedia.isVideo;
        const uploadRes = await fetch(`${getApiHost(3004)}/chat/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaBase64: selectedMedia.base64,
            filename: selectedMedia.filename,
            mimeType: selectedMedia.mimeType,
          }),
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          s3MediaUrl = data.url;
        } else {
          s3MediaUrl = selectedMedia.base64;
        }
      } catch (err) {
        console.error("Lỗi upload media S3:", err);
        s3MediaUrl = selectedMedia.base64;
      } finally {
        setIsUploadingMedia(false);
      }
    }

    const defaultTag = s3MediaUrl ? (isVideoMsg ? "[Video]" : "[Hình ảnh]") : "";

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: text || defaultTag,
      imageUrl: s3MediaUrl,
      time: getCurrentTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setSelectedMedia(null);

    // Nếu đang kết nối AI thì hiển thị typing
    if (sessionStatus === "AI_ACTIVE") {
      setIsTyping(true);
    }

    // Gửi tin nhắn qua Socket.IO (chỉ mang S3 URL cực nhẹ)
    if (socketRef.current) {
      let guestDeviceId = "";
      if (typeof window !== "undefined") {
        guestDeviceId = localStorage.getItem("ctmart_guest_device_id") || "";
      }
      const effectiveCustomerId = user?.id || guestDeviceId || undefined;
      const effectiveCustomerName = user?.name || (guestDeviceId ? `Khách vãng lai #${guestDeviceId.slice(-4)}` : "Khách hàng Trực tuyến");

      socketRef.current.emit("customer_chat_message", {
        sessionId: sessionId || undefined,
        customerId: effectiveCustomerId,
        customerName: effectiveCustomerName,
        customerPhone: user?.phone || undefined,
        text: text || defaultTag,
        imageUrl: s3MediaUrl,
        time: getCurrentTime()
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Buttons Hub */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
        {/* Nút Chatbot AI & CSKH */}
        <div className="relative group">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              isOpen 
                ? "bg-slate-800 hover:bg-slate-900 ring-2 ring-slate-400" 
                : "bg-teal-700 hover:bg-teal-800 ring-4 ring-teal-100"
            }`}
            title="Chat trực tiếp với AI & CSKH C.T Mart"
            aria-label="Mở Trợ lý mua sắm AI"
          >
            {isOpen ? <X size={20} /> : <Bot size={22} />}
          </button>
          {!isOpen && (
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none font-medium flex items-center gap-1.5 border border-slate-700">
              <Sparkles size={12} className="text-teal-400" />
              Trợ lý AI & Tư vấn viên Trực ban
            </span>
          )}
        </div>

        {/* Nút Chat Zalo */}
        <div className="relative group">
          <a
            href="https://zalo.me"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 border border-gray-100 p-2"
            title="Chat Zalo hỗ trợ"
            aria-label="Chat Zalo"
          >
            <div className="relative w-full h-full">
              <Image
                src="/social/zalo.png"
                alt="Zalo Official"
                fill
                sizes="48px"
                className="object-contain"
              />
            </div>
          </a>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none font-medium border border-gray-200">
            Hỗ trợ qua Zalo
          </span>
        </div>

        {/* Nút Hotline */}
        <div className="relative group">
          <a
            href="tel:1900555568"
            className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-slate-900 hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            title="Hotline: 1900 5555 68"
            aria-label="Gọi hotline"
          >
            <Phone size={19} />
          </a>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none font-medium border border-gray-200">
            Hotline: 1900 5555 68
          </span>
        </div>
      </div>

      {/* Cửa sổ Chatbot AI & CSKH Trực Tuyến */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-teal-800/80 flex items-center justify-center border border-teal-500/30">
                {sessionStatus === "STAFF_CONNECTED" ? (
                  <Headset size={18} className="text-teal-300" />
                ) : (
                  <Bot size={19} className="text-teal-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm leading-tight text-white">
                    {sessionStatus === "STAFF_CONNECTED"
                      ? assignedStaffName || "Tư vấn viên C.T Mart"
                      : "Trợ lý AI C.T Mart"}
                  </span>
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    sessionStatus === "STAFF_CONNECTED" 
                      ? "bg-teal-400 animate-pulse" 
                      : sessionStatus === "WAITING_FOR_STAFF"
                      ? "bg-amber-400 animate-ping"
                      : "bg-emerald-400"
                  }`} />
                </div>
                <p className="text-[11px] text-slate-300 font-normal">
                  {sessionStatus === "STAFF_CONNECTED"
                    ? "Đang trò chuyện trực tiếp 2 chiều với nhân viên"
                    : sessionStatus === "WAITING_FOR_STAFF"
                    ? "Đang điều phối nhân viên bán hàng..."
                    : "Hỗ trợ 24/7 • Tra cứu kho hàng & Giao 2h"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={initChatSession}
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
                title="Làm mới cuộc trò chuyện"
              >
                <RefreshCw size={14} className={isInitializing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Banner chuyển đổi trạng thái Handoff */}
          <div className={`px-3.5 py-1.5 text-xs flex items-center justify-between border-b ${
            sessionStatus === "STAFF_CONNECTED"
              ? "bg-teal-50 text-teal-800 border-teal-100"
              : sessionStatus === "WAITING_FOR_STAFF"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-slate-50 text-slate-600 border-slate-100"
          }`}>
            <div className="flex items-center gap-1.5 font-medium">
              {sessionStatus === "STAFF_CONNECTED" ? (
                <>
                  <UserCheck size={13} className="text-teal-600" />
                  <span>Tư vấn viên trực tiếp: {assignedStaffName}</span>
                </>
              ) : sessionStatus === "WAITING_FOR_STAFF" ? (
                <>
                  <Clock size={13} className="text-amber-600 animate-spin" />
                  <span>Đang chờ Saler nhận phiên...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-teal-600" />
                  <span>Trí tuệ nhân tạo Gemini & RAG Kho Hàng</span>
                </>
              )}
            </div>

            {sessionStatus === "AI_ACTIVE" && (
              <button
                onClick={handleRequestStaffHandoff}
                className="text-[11px] bg-white text-teal-700 hover:bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1"
              >
                <Headset size={12} /> Gặp Saler
              </button>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/60">
            {messages
              .filter((msg) => msg.text?.trim() || msg.imageUrl || msg.productCard)
              .map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user"
                    ? "items-end"
                    : msg.sender === "system"
                    ? "items-center"
                    : "items-start"
                }`}
              >
                {/* System Message */}
                {msg.sender === "system" ? (
                  <div className="my-1.5 text-center max-w-[90%]">
                    <span className="text-[11px] bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md inline-block border border-slate-300/50">
                      {(msg.text || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\*\*/g, '')}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2 max-w-[88%]">
                      {msg.sender === "bot" && (
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 border border-teal-200">
                          <Bot size={13} className="text-teal-700" />
                        </div>
                      )}

                      {msg.sender === "staff" && (
                        <div className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0">
                          <Headset size={13} />
                        </div>
                      )}

                      <div
                        className={`rounded-xl px-3 py-2 text-xs sm:text-[13px] leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-teal-700 text-white rounded-br-none shadow-xs"
                            : msg.sender === "staff"
                            ? "bg-teal-50 text-teal-950 border border-teal-200 rounded-bl-none shadow-xs"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs"
                        }`}
                      >
                        {msg.sender === "staff" && (
                          <div className="text-[10px] font-semibold text-teal-700 mb-1 flex items-center gap-1 border-b border-teal-100 pb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                            {msg.staffName || "Tư vấn viên C.T Mart (Saler)"}
                          </div>
                        )}
                        <div className="whitespace-pre-line">
                          {(msg.text || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/#{1,6}\s+/g, '').replace(/\*\*/g, '').trim()}
                        </div>

                        {/* Phương tiện đính kèm nếu có (Ảnh hoặc Video) */}
                        {msg.imageUrl && (
                          <div className="mt-1.5">
                            {msg.imageUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i) ? (
                              <video
                                src={msg.imageUrl}
                                controls
                                playsInline
                                className="max-h-48 max-w-full rounded-lg border border-black/10 bg-black/10"
                              />
                            ) : (
                              <img
                                src={msg.imageUrl}
                                alt="Ảnh đính kèm"
                                onClick={() => setPreviewModalUrl(msg.imageUrl || null)}
                                className="max-h-40 max-w-full rounded-lg cursor-pointer object-cover border border-black/10 hover:opacity-95 transition-opacity"
                                title="Bấm để xem ảnh phóng to"
                              />
                            )}
                          </div>
                        )}

                        {/* Thẻ Sản Phẩm Tương Tác Nếu Có */}
                        {msg.productCard && (
                          <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 flex items-center gap-2.5 text-slate-800 shadow-2xs">
                            <div className="relative w-12 h-12 bg-slate-100 rounded overflow-hidden shrink-0">
                              <img
                                src={msg.productCard.imageUrl || "/images/placeholder.png"}
                                alt={msg.productCard.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as any).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200";
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-xs text-slate-900 truncate">
                                {msg.productCard.name}
                              </h5>
                              <div className="text-teal-700 font-bold text-xs mt-0.5">
                                {msg.productCard.price ? msg.productCard.price.toLocaleString("vi-VN") + " đ" : "Liên hệ"}
                              </div>
                            </div>
                            {msg.productCard.id && (
                              <Link
                                href={`/san-pham/${msg.productCard.id}`}
                                className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded transition-colors"
                                title="Xem chi tiết"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.time}
                    </span>

                    {/* Quick Suggestions */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                        {msg.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(opt)}
                            className="text-[11px] bg-white text-teal-800 hover:bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1 shadow-2xs"
                          >
                            <ChevronRight size={11} className="text-teal-500" />
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 border border-teal-200">
                  <Bot size={13} className="text-teal-700" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl rounded-bl-none px-3 py-1.5 text-xs text-slate-500 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  <span className="text-[11px] ml-1 text-slate-400">Trợ lý AI đang soạn câu trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick FAQ Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage("Kiểm tra thời gian giao hàng")}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1 border border-slate-200"
            >
              <Truck size={12} /> Giao 2h
            </button>
            <button
              onClick={() => handleSendMessage("Tra cứu tình trạng đơn hàng")}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1 border border-slate-200"
            >
              <Package size={12} /> Đơn mua
            </button>
            <button
              onClick={() => handleSendMessage("Các khuyến mãi đang áp dụng")}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1 border border-slate-200"
            >
              <Sparkles size={12} /> Khuyến mãi
            </button>
            {sessionStatus === "AI_ACTIVE" && (
              <button
                onClick={handleRequestStaffHandoff}
                className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors flex items-center gap-1 font-medium border border-teal-200"
              >
                <Headset size={12} /> Gặp Saler
              </button>
            )}
          </div>

          {/* Xem trước tệp đính kèm (Ảnh / Video) */}
          {selectedMedia && (
            <div className="px-3 py-1.5 bg-teal-50/90 border-t border-teal-200 flex items-center gap-2">
              {selectedMedia.isVideo ? (
                <div className="w-9 h-9 rounded bg-teal-800 text-white flex items-center justify-center shrink-0 border border-teal-300">
                  <FileVideo size={18} />
                </div>
              ) : (
                <img src={selectedMedia.previewUrl} alt="Preview" className="w-9 h-9 object-cover rounded border border-teal-200" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-teal-900 font-medium truncate max-w-[180px]">
                  {selectedMedia.filename}
                </span>
                <span className="text-[10px] text-teal-700">
                  {selectedMedia.compressedSizeText}
                </span>
              </div>
              {isUploadingMedia ? (
                <div className="ml-auto flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                  <Loader2 size={13} className="animate-spin text-teal-600" /> Đang tải lên S3...
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  className="ml-auto text-slate-400 hover:text-slate-600 p-1"
                  title="Hủy chọn tệp"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Input Box */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                selectedMedia
                  ? "bg-teal-100 text-teal-700 border border-teal-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
              }`}
              title="Đính kèm ảnh hoặc video (tự động nén & lưu S3)"
            >
              <Paperclip size={14} />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                sessionStatus === "STAFF_CONNECTED"
                  ? "Nhắn trực tiếp với nhân viên..."
                  : sessionStatus === "WAITING_FOR_STAFF"
                  ? "Nhắn tin (đang chờ nhân viên nhận phiên)..."
                  : "Hỏi AI về sản phẩm, khuyến mãi, giao 2h..."
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputMessage.trim() && !selectedMedia) || isUploadingMedia}
              className="w-8 h-8 rounded-lg bg-teal-700 hover:bg-teal-800 active:scale-95 disabled:bg-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-xs shrink-0"
              title="Gửi tin nhắn"
            >
              {isUploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Xem Ảnh / Video Phóng To */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-60 p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[90vh] cursor-default flex items-center justify-center"
          >
            {previewModalUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i) ? (
              <video
                src={previewModalUrl}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl bg-black"
              />
            ) : (
              <img
                src={previewModalUrl}
                alt="Ảnh phóng to"
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              />
            )}
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg border border-slate-200 hover:bg-slate-100"
              title="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
