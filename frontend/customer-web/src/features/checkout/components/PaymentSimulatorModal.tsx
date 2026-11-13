"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  X, 
  CheckCircle2, 
  Loader2, 
  QrCode, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  Smartphone,
  Copy,
  AlertCircle
} from "lucide-react";

interface PaymentSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: "vnpay" | "momo" | "card" | "cod";
  totalAmount: number;
  orderInfo: {
    customerName: string;
    customerPhone: string;
    address: string;
  };
  onPaymentSuccess: (transactionDetails: {
    transactionId: string;
    paidAt: string;
    method: string;
  }) => void;
}

export default function PaymentSimulatorModal({
  isOpen,
  onClose,
  method,
  totalAmount,
  orderInfo,
  onPaymentSuccess,
}: PaymentSimulatorModalProps) {
  const [step, setStep] = useState<"scanning" | "processing" | "success">("scanning");
  const [countdown, setCountdown] = useState(120); // 2 minutes countdown for QR
  const [copied, setCopied] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardHolder, setCardHolder] = useState(orderInfo.customerName || "LE CONG CHUNG");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("888");

  useEffect(() => {
    if (!isOpen) {
      setStep("scanning");
      setCountdown(120);
      return;
    }

    if (method === "card") {
      setStep("scanning"); // Show card form
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, method]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  const handleSimulatePayment = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        onPaymentSuccess({
          transactionId: "TXN" + Date.now().toString().slice(-8),
          paidAt: new Date().toISOString(),
          method: method.toUpperCase(),
        });
      }, 1200);
    }, 1800);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between text-white ${
          method === "vnpay" ? "bg-[#005BAA]" :
          method === "momo" ? "bg-[#A50064]" :
          "bg-slate-900"
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
              <img 
                src={
                  method === "vnpay" ? "/payments/vnpay.png" :
                  method === "momo" ? "/payments/momo.png" :
                  "/payments/visa.png"
                }
                alt={method}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {method === "vnpay" && "Cổng thanh toán VNPAY-QR"}
                {method === "momo" && "Cổng thanh toán Ví điện tử MoMo"}
                {method === "card" && "Thanh toán Thẻ Quốc Tế (Visa/Mastercard)"}
              </h3>
              <p className="text-[11px] opacity-80 font-normal">Cổng thanh toán điện tử giả lập (Sandbox Demo)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-4 text-emerald-600 animate-pulse">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Đang xử lý giao dịch...</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Hệ thống đang kết nối bảo mật tới cổng {method.toUpperCase()} để xác nhận số dư và trừ tiền.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mb-4 text-emerald-600 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="font-bold text-emerald-700 text-lg">Thanh toán thành công!</h4>
              <p className="text-xs text-slate-600 mt-1">
                Giao dịch của quý khách đã được ghi nhận vào hệ thống kho vận CityMart.
              </p>
              <div className="mt-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono">
                Số tiền: <strong className="text-slate-900">{formatPrice(totalAmount)}</strong>
              </div>
            </div>
          )}

          {step === "scanning" && (
            <>
              {/* Order quick summary */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Số tiền thanh toán:</span>
                  <div className="text-base font-bold text-emerald-700">
                    {formatPrice(totalAmount)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Khách hàng:</span>
                  <div className="font-semibold text-slate-800 line-clamp-1 max-w-[160px]">
                    {orderInfo.customerName}
                  </div>
                </div>
              </div>

              {/* QR Code view for VNPAY & MOMO */}
              {(method === "vnpay" || method === "momo") && (
                <div className="flex flex-col items-center">
                  <div className="relative p-3 bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-xs mb-3">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`CITYMART-${method.toUpperCase()}-${totalAmount}-USER-${orderInfo.customerPhone}`)}`}
                      alt="Payment QR"
                      className="w-48 h-48 rounded-lg object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white shadow-md p-1.5 flex items-center justify-center border border-slate-100">
                        <img 
                          src={method === "vnpay" ? "/payments/vnpay.png" : "/payments/momo.png"}
                          alt="logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium text-center">
                    Mở App ngân hàng hoặc <strong className="uppercase">{method}</strong> quét mã để thanh toán
                  </p>

                  <div className="text-[11px] text-slate-400 mt-1">
                    Mã QR hết hạn sau: <span className="font-semibold text-red-500">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}</span>
                  </div>

                  <div className="w-full mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={handleSimulatePayment}
                      className={`w-full py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
                        method === "vnpay" ? "bg-[#005BAA] hover:bg-[#004785]" : "bg-[#A50064] hover:bg-[#850050]"
                      }`}
                    >
                      <Smartphone size={16} />
                      [Giả lập] Quét mã & Xác nhận thanh toán thành công
                    </button>
                  </div>
                </div>
              )}

              {/* Card form view for VISA / MASTERCARD */}
              {method === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số thẻ (Demo)
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <CreditCard size={16} className="absolute right-3 top-2.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên in trên thẻ
                    </label>
                    <input 
                      type="text" 
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full text-xs uppercase font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hạn thẻ (MM/YY)
                      </label>
                      <input 
                        type="text" 
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>CVV/CVC</span>
                        <Lock size={11} className="text-slate-400" />
                      </label>
                      <input 
                        type="password" 
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength={4}
                        className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSimulatePayment}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={16} className="text-emerald-400" />
                      [Giả lập] Xác nhận thanh toán {formatPrice(totalAmount)}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock size={12} className="text-emerald-600" />
            <span>Mã hóa TLS 256-bit chuẩn PCI DSS</span>
          </div>
          <span className="font-semibold text-slate-700">CityMart Gateway</span>
        </div>
      </div>
    </div>
  );
}
