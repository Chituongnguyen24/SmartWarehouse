"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCartStore } from '@/lib/store';
import { getApiHost } from '@/lib/api';
import { Zap, X } from 'lucide-react';

export default function RealtimeProductSync() {
  const socketRef = useRef<Socket | null>(null);
  const [toastMsg, setToastMsg] = useState<{ name: string; price: number; discount?: number } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = io(getApiHost(3004), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log('[RealtimeProductSync] Connected to order-service realtime gateway');
    });

    const handleProductUpdated = (payload: any) => {
      if (!payload) return;
      // console.log('[RealtimeProductSync] Received product_updated event:', payload);

      const targetId = payload.id || payload.productId;
      const targetSku = payload.sku;
      const newPrice = Number(payload.price);
      const newOrigPrice = payload.originalPrice ? Number(payload.originalPrice) : undefined;

      // 1. Đồng bộ giá giỏ hàng ngay lập tức (<1s)
      if (targetId || targetSku) {
        useCartStore.getState().updateProductPrice(targetId || targetSku, newPrice, newOrigPrice);
      }

      // 2. Phát sự kiện nội bộ cho tất cả các trang / components đang hiển thị
      window.dispatchEvent(new CustomEvent('sfwms:product_updated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('sfwms:product_refresh', { detail: payload }));

      // 3. Hiển thị thông báo cập nhật giá tức thời
      if (payload.name && newPrice) {
        setToastMsg({
          name: payload.name,
          price: newPrice,
          discount: payload.discountPercent,
        });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setToastMsg(null);
        }, 4000);
      }
    };

    socket.on('product_updated', handleProductUpdated);
    socket.on('product_created', handleProductUpdated);
    socket.on('product_deleted', (payload: any) => {
      window.dispatchEvent(new CustomEvent('sfwms:product_deleted', { detail: payload }));
      window.dispatchEvent(new CustomEvent('sfwms:product_refresh', { detail: payload }));
    });

    return () => {
      socket.disconnect();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (!toastMsg) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 max-w-sm">
        <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-md shrink-0">
          <Zap size={16} />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="font-semibold text-slate-200 truncate">Giá sản phẩm vừa cập nhật:</div>
          <div className="text-slate-400 truncate">{toastMsg.name}</div>
          <div className="font-bold text-amber-400 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {toastMsg.price.toLocaleString('vi-VN')}đ {toastMsg.discount ? `(-${toastMsg.discount}%)` : ''}
          </div>
        </div>
        <button
          onClick={() => setToastMsg(null)}
          className="text-slate-400 hover:text-white p-1 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

