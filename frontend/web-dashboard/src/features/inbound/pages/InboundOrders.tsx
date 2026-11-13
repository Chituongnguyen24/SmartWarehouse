import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { BarcodeQRScannerModal } from '@/shared';
import { 
  Download, PackageCheck, AlertCircle, ArrowRight, CheckCircle2, 
  Layers, Plus, X, Search, FileText, ScanBarcode, Printer,
  ChevronLeft, ChevronRight, RefreshCw, Warehouse, ShieldCheck,
  MapPin, Check, Box
} from 'lucide-react';
import { WarehouseMap3D } from '@/features/warehouse';
import { InboundReceiptModal } from '../components/InboundReceiptModal';
import { CreateInboundModal } from '../components/CreateInboundModal';

const API_BASE = 'http://localhost:3006'; // inbound-service
const INVENTORY_API = 'http://localhost:3011'; // inventory-service

interface InboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unit?: string;
  unitPrice?: number;
  expiryDate: string;
  status: string;
  lotCode?: string;
  assignedZone?: string;
  assignedSlotId?: string;
}

interface InboundOrder {
  id: string;
  orderCode: string;
  supplierId: string;
  supplierName: string;
  warehouseCode?: string;
  warehouseName?: string;
  invoiceNumber?: string;
  delivererName?: string;
  requestedBy?: string;
  status: string;
  expectedDate: string;
  receivedDate?: string;
  totalItems: number;
  totalQuantity: number;
  qualityCheckPassed: boolean;
  notes?: string;
  createdAt: string;
  items: InboundOrderItem[];
}

// ── PHÂN LOẠI HÌNH THỨC NHẬP KHO (INBOUND LOGISTICS) ──
export type InboundTransactionType = 'NHAP_MUA_NCC' | 'HANG_TRA_LAI' | 'DIEU_CHUYEN' | 'KIEM_KE_THUA';

export const INBOUND_TYPE_CONFIG: Record<InboundTransactionType, { label: string; bg: string; color: string; border: string }> = {
  NHAP_MUA_NCC: { label: 'Nhập mua NCC', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  HANG_TRA_LAI: { label: 'Khách hàng trả lại', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  DIEU_CHUYEN:  { label: 'Điều chuyển chi nhánh', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  KIEM_KE_THUA: { label: 'Nhập kiểm kê thừa', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
};

export function detectInboundClassification(order: InboundOrder | null): InboundTransactionType {
  if (!order) return 'NHAP_MUA_NCC';
  const text = `${order.orderCode || ''} ${order.supplierName || ''} ${order.notes || ''}`.toLowerCase();
  if (text.includes('trả lại') || text.includes('hoàn') || text.includes('return') || text.includes('tra hang')) return 'HANG_TRA_LAI';
  if (text.includes('điều chuyển') || text.includes('chuyển kho') || text.includes('transfer') || text.includes('chi nhánh')) return 'DIEU_CHUYEN';
  if (text.includes('kiểm kê') || text.includes('thừa') || text.includes('audit')) return 'KIEM_KE_THUA';
  return 'NHAP_MUA_NCC';
}

// ── DANH MỤC 26 DÃY KỆ THỰC TẾ TRONG KHO (8 KHO MÁT, 8 KHO ĐÔNG, 10 KHO KHÔ) ──
export interface WarehouseStorageShelf {
  id: string;
  name: string;
  zone: 'COOL' | 'FROZEN' | 'DRY';
  zoneLabel: string;
  temperature: string;
  freePct: number;
}

export const WAREHOUSE_SHELVES: WarehouseStorageShelf[] = [
  // 1. KHO KHÔ THƯỜNG (+25°C) - Kệ C1 đến C10
  { id: 'shelf-C5', name: 'Kệ C5 (Bánh Kẹo, Chocolate & Snack Giòn)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+24.5°C', freePct: 85 },
  { id: 'shelf-C9', name: 'Kệ C9 (Nước Tương, Tương Ớt & Sốt Ướp, Cốt Lẩu)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.5°C', freePct: 78 },
  { id: 'shelf-C1', name: 'Kệ C1 (Mì Ăn Liền, Phở & Miến Khô)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.2°C', freePct: 65 },
  { id: 'shelf-C2', name: 'Kệ C2 (Gạo Thơm ST25, Nếp & Đậu Hạt)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+24.8°C', freePct: 70 },
  { id: 'shelf-C3', name: 'Kệ C3 (Dầu Ăn & Nước Mắm Truyền Thống)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.0°C', freePct: 75 },
  { id: 'shelf-C4', name: 'Kệ C4 (Đường, Muối & Bột Nêm Gia Vị)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.1°C', freePct: 80 },
  { id: 'shelf-C6', name: 'Kệ C6 (Cà Phê Hòa Tan & Trà Khô Túi Lọc)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.3°C', freePct: 72 },
  { id: 'shelf-C7', name: 'Kệ C7 (Nước Giải Khát & Nước Suối Đóng Chai)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.0°C', freePct: 68 },
  { id: 'shelf-C8', name: 'Kệ C8 (Bột Làm Bánh, Ngũ Cốc & Hạt)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.0°C', freePct: 67 },
  { id: 'shelf-C10', name: 'Kệ C10 (Đồ Ăn Liền, Rong Biển & Bánh Quy)', zone: 'DRY', zoneLabel: 'Kho Khô (+25°C)', temperature: '+25.3°C', freePct: 88 },

  // 2. KHO MÁT (0°C ~ +4°C) - Kệ A1 đến A8
  { id: 'shelf-A1', name: 'Kệ A1 (Thịt Tươi Sống & Gia Cầm CP)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+2.4°C', freePct: 68 },
  { id: 'shelf-A2', name: 'Kệ A2 (Sữa Tươi TH, Đà Lạt Milk & Bơ Sữa)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+3.1°C', freePct: 63 },
  { id: 'shelf-A3', name: 'Kệ A3 (Rau Củ Quả Hữu Cơ & Thủy Canh)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+4.0°C', freePct: 58 },
  { id: 'shelf-A4', name: 'Kệ A4 (Trái Cây Nhập Khẩu & Nội Địa)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+3.5°C', freePct: 72 },
  { id: 'shelf-A5', name: 'Kệ A5 (Sữa Chua, Váng Sữa & Probiotic)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+2.8°C', freePct: 75 },
  { id: 'shelf-A6', name: 'Kệ A6 (Đậu Hũ, Bún Tươi & Kim Chi)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+3.0°C', freePct: 80 },
  { id: 'shelf-A7', name: 'Kệ A7 (Nước Ép Trái Cây & Trà Lạnh)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+3.2°C', freePct: 70 },
  { id: 'shelf-A8', name: 'Kệ A8 (Salad Đóng Gói & Sốt Lạnh)', zone: 'COOL', zoneLabel: 'Kho Mát (0°C ~ +4°C)', temperature: '+2.5°C', freePct: 65 },

  // 3. HẦM ĐÔNG LẠNH (-18°C ~ -22°C) - Kệ B1 đến B8
  { id: 'shelf-B1', name: 'Kệ B1 (Thịt Bò Mỹ & Úc Cắt Sẵn)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-19.5°C', freePct: 75 },
  { id: 'shelf-B2', name: 'Kệ B2 (Hải Sản Đông Lạnh, Cá Hồi, Tôm)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-20.2°C', freePct: 82 },
  { id: 'shelf-B3', name: 'Kệ B3 (Kem Hộp & Kem Cây Nhập Khẩu)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-21.0°C', freePct: 60 },
  { id: 'shelf-B4', name: 'Kệ B4 (Viên Thả Lẩu & Bánh Xếp Mandu)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-18.8°C', freePct: 70 },
  { id: 'shelf-B5', name: 'Kệ B5 (Khoai Tây Chiên & Thực Phẩm Chế Biến)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-19.0°C', freePct: 85 },
  { id: 'shelf-B6', name: 'Kệ B6 (Cá & Thủy Sản Tươi Đông Lạnh)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-20.0°C', freePct: 78 },
  { id: 'shelf-B7', name: 'Kệ B7 (Pizza & Bánh Đông Lạnh Nướng Sẵn)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-18.5°C', freePct: 90 },
  { id: 'shelf-B8', name: 'Kệ B8 (Rau Củ Hỗn Hợp Đông Lạnh)', zone: 'FROZEN', zoneLabel: 'Hầm Đông (-18°C ~ -22°C)', temperature: '-19.2°C', freePct: 68 },
];

export const getRecommendedShelfForItem = (productName: string = '', sku: string = ''): WarehouseStorageShelf => {
  const q = `${productName} ${sku}`.toLowerCase();

  // Bánh kẹo, Snack, Xylitol, Mochi, Chocolate -> Kệ C5 (Kho Khô)
  if (q.includes('kẹo') || q.includes('xylitol') || q.includes('mochi') || q.includes('bánh') || q.includes('snack') || q.includes('chocolate') || q.includes('chocopie')) {
    return WAREHOUSE_SHELVES[0]; // shelf-C5
  }
  // Cốt lẩu, sốt ướp, tương ớt, nước tương -> Kệ C9 (Kho Khô)
  if (q.includes('lẩu') || q.includes('haidilao') || q.includes('sốt') || q.includes('tương') || q.includes('nước mắm') || q.includes('chin-su') || q.includes('cholimex')) {
    return WAREHOUSE_SHELVES[1]; // shelf-C9
  }
  // Mì, phở, miến -> Kệ C1 (Kho Khô)
  if (q.includes('mì') || q.includes('phở') || q.includes('miến') || q.includes('hảo hảo')) {
    return WAREHOUSE_SHELVES[2]; // shelf-C1
  }
  // Gạo, nếp, đậu -> Kệ C2 (Kho Khô)
  if (q.includes('gạo') || q.includes('st25') || q.includes('nếp') || q.includes('đậu hạt')) {
    return WAREHOUSE_SHELVES[3]; // shelf-C2
  }
  // Dầu ăn -> Kệ C3 (Kho Khô)
  if (q.includes('dầu ăn') || q.includes('simply') || q.includes('neptune')) {
    return WAREHOUSE_SHELVES[4]; // shelf-C3
  }
  // Đường, muối, bột ngọt -> Kệ C4 (Kho Khô)
  if (q.includes('đường') || q.includes('muối') || q.includes('bột nêm') || q.includes('gia vị') || q.includes('knoor')) {
    return WAREHOUSE_SHELVES[5]; // shelf-C4
  }
  // Cà phê, trà -> Kệ C6 (Kho Khô)
  if (q.includes('cà phê') || q.includes('coffee') || q.includes('trà') || q.includes('lipton') || q.includes('nescafe')) {
    return WAREHOUSE_SHELVES[6]; // shelf-C6
  }
  // Nước ngọt, nước khoáng -> Kệ C7 (Kho Khô)
  if (q.includes('nước ngọt') || q.includes('coca') || q.includes('pepsi') || q.includes('aquafina') || q.includes('nước suối')) {
    return WAREHOUSE_SHELVES[7]; // shelf-C7
  }
  // Bột, ngũ cốc -> Kệ C8 (Kho Khô)
  if (q.includes('bột') || q.includes('ngũ cốc') || q.includes('yến mạch') || q.includes('hạt điều')) {
    return WAREHOUSE_SHELVES[8]; // shelf-C8
  }

  // Thịt tươi sống, gia cầm -> Kệ A1 (Kho Mát 0-4°C)
  if (q.includes('thịt tươi') || q.includes('thịt heo') || q.includes('gà tươi') || q.includes('cp') || q.includes('sườn non')) {
    return WAREHOUSE_SHELVES[10]; // shelf-A1
  }
  // Sữa tươi, bơ sữa thanh trùng -> Kệ A2 (Kho Mát 0-4°C)
  if (q.includes('sữa tươi') || q.includes('th true') || q.includes('đà lạt milk') || q.includes('vinamilk') || q.includes('bơ nhạt') || q.includes('anchor') || q.includes('phô mai')) {
    return WAREHOUSE_SHELVES[11]; // shelf-A2
  }
  // Rau củ quả hữu cơ -> Kệ A3 (Kho Mát 0-4°C)
  if (q.includes('rau') || q.includes('xà lách') || q.includes('cà chua') || q.includes('nấm') || q.includes('bông cải') || q.includes('dưa leo') || q.includes('ớt chuông')) {
    return WAREHOUSE_SHELVES[12]; // shelf-A3
  }
  // Trái cây -> Kệ A4 (Kho Mát 0-4°C)
  if (q.includes('trái cây') || q.includes('táo') || q.includes('cam') || q.includes('nho') || q.includes('chuối') || q.includes('dưa hấu')) {
    return WAREHOUSE_SHELVES[13]; // shelf-A4
  }
  // Sữa chua, váng sữa -> Kệ A5 (Kho Mát 0-4°C)
  if (q.includes('sữa chua') || q.includes('váng sữa') || q.includes('probi') || q.includes('monte') || q.includes('yogurt')) {
    return WAREHOUSE_SHELVES[14]; // shelf-A5
  }

  // Thịt bò đông lạnh -> Kệ B1 (Hầm Đông -18°C)
  if (q.includes('bò mỹ') || q.includes('bò úc') || q.includes('thịt đông') || q.includes('thăn bò') || q.includes('dẻ sườn')) {
    return WAREHOUSE_SHELVES[18]; // shelf-B1
  }
  // Hải sản đông lạnh -> Kệ B2 (Hầm Đông -18°C)
  if (q.includes('hải sản') || q.includes('cá hồi') || q.includes('tôm') || q.includes('mực') || q.includes('bạch tuộc') || q.includes('cua')) {
    return WAREHOUSE_SHELVES[19]; // shelf-B2
  }
  // Kem -> Kệ B3 (Hầm Đông -18°C)
  if (q.includes('kem') || q.includes('celano') || q.includes('merino') || q.includes('haagen-dazs')) {
    return WAREHOUSE_SHELVES[20]; // shelf-B3
  }
  // Viên thả lẩu, mandu -> Kệ B4 (Hầm Đông -18°C)
  if (q.includes('viên thả lẩu') || q.includes('bò viên') || q.includes('cá viên') || q.includes('mandu') || q.includes('há cảo') || q.includes('sủi cảo')) {
    return WAREHOUSE_SHELVES[21]; // shelf-B4
  }

  // Mặc định: Kho Khô Kệ C1
  return WAREHOUSE_SHELVES[2]; // shelf-C1
};

const STEPS = [
  { key: 'PENDING', label: '1. Lập chứng từ', icon: <FileText size={16} /> },
  { key: 'RECEIVING', label: '2. Nhận hàng', icon: <Download size={16} /> },
  { key: 'QUALITY_CHECK', label: '3. Kiểm định QC', icon: <AlertCircle size={16} /> },
  { key: 'STORING', label: '4. Lưu kho & Gán Lô', icon: <Layers size={16} /> },
  { key: 'COMPLETED', label: '5. Hoàn tất & Ghi sổ', icon: <CheckCircle2 size={16} /> }
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Chờ nhận hàng', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  RECEIVING: { label: 'Đang nhận hàng', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  QUALITY_CHECK: { label: 'Kiểm định (QC)', bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  STORING: { label: 'Đang lưu kho', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  STORED: { label: 'Đã lưu kho', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  COMPLETED: { label: 'Đã hoàn tất', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  REJECTED: { label: 'Từ chối (Lỗi QC)', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  DAMAGED: { label: 'Hàng lỗi / Hư hại', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  CANCELLED: { label: 'Đã hủy', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
};

const InboundOrders: React.FC = () => {
  const { token, user } = useAuth();
  const { warehouses, selectedWarehouseCode } = useWarehouse();
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<InboundOrder | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOrderId) setSelectedOrderId(null);
        setShowMapModal(null);
        setShowScanner(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrderId]);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const isManager = user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const myWarehouseCode = user?.warehouseCode || (user?.email?.includes('govap') ? 'WH-006' : 'WH-006');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(() => {
    if (isManager) return myWarehouseCode;
    return selectedWarehouseCode || 'ALL';
  });
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [inboundTypeFilter, setInboundTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isManager) {
      setSelectedWhFilter(myWarehouseCode);
    } else if (selectedWarehouseCode) {
      setSelectedWhFilter(selectedWarehouseCode);
    }
  }, [isManager, myWarehouseCode, selectedWarehouseCode]);

  const activeWh = isManager ? myWarehouseCode : selectedWhFilter;

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMapModal, setShowMapModal] = useState<string | null>(null);

  // Storage Assignment state per SKU (itemId -> assignment info)
  const [itemAssignments, setItemAssignments] = useState<Record<string, { shelfId: string; zone: string; slotLabel: string; lotCode: string; expiryDate: string }>>({});

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const url = activeWh && activeWh !== 'ALL'
        ? `${API_BASE}/inbound-orders?warehouseCode=${encodeURIComponent(activeWh)}`
        : `${API_BASE}/inbound-orders`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch inbound orders:', error);
    } finally {
      setInitialLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, [token, activeWh]);

  useEffect(() => {
    fetchOrders(false);
    const timer = setInterval(() => {
      fetchOrders(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  // Selected Order memo
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Initialize and keep item assignments in sync with selected order
  useEffect(() => {
    if (!selectedOrder?.items || selectedOrder.items.length === 0) return;
    setItemAssignments(prev => {
      const next = { ...prev };
      selectedOrder.items.forEach((item, idx) => {
        if (!next[item.id]) {
          const rec = getRecommendedShelfForItem(item.productName, item.sku);
          const zoneKey = rec.zone === 'DRY' ? 'Z-DRY' : rec.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN';
          const defaultSlot = item.assignedSlotId || `${rec.id.replace('shelf-', '')}-01`;
          const defaultLot = item.lotCode || `LOT-2026-${(idx + 1).toString().padStart(3, '0')}`;
          const defaultDays = rec.zone === 'COOL' ? 14 : rec.zone === 'FROZEN' ? 180 : 365;
          const defaultExpiry = item.expiryDate 
            ? new Date(item.expiryDate).toISOString().split('T')[0]
            : new Date(Date.now() + defaultDays * 86400000).toISOString().split('T')[0];
          
          next[item.id] = {
            shelfId: item.assignedSlotId ? (WAREHOUSE_SHELVES.find(s => item.assignedSlotId?.includes(s.id.replace('shelf-', '')))?.id || rec.id) : rec.id,
            zone: item.assignedZone || zoneKey,
            slotLabel: defaultSlot,
            lotCode: defaultLot,
            expiryDate: defaultExpiry
          };
        }
      });
      return next;
    });
  }, [selectedOrder]);

  // Advance Inbound state
  const advanceState = useCallback(async (orderId: string, action: string, body?: any) => {
    const nextStatus = 
      action === 'receive' ? 'RECEIVING' :
      action === 'quality-check' ? 'QUALITY_CHECK' :
      action === 'store' ? 'STORING' :
      action === 'complete' ? 'COMPLETED' : 'PENDING';

    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    if (action === 'complete') {
      showToast('Đã hoàn tất nhập kho. Hàng hóa và lô đã được ghi nhận vào hệ thống.', 'success');
    } else if (action === 'quality-check') {
      showToast('Kiểm định chất lượng (QC) đạt chuẩn 100%.', 'success');
    } else {
      showToast(`Đã chuyển trạng thái: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`, 'info');
    }

    // If completing, sync all items to inventory-service (:3011) so they exist in food_lots and 3D map!
    if (action === 'complete') {
      const currentOrder = orders.find(o => o.id === orderId);
      if (currentOrder?.items) {
        for (let idx = 0; idx < currentOrder.items.length; idx++) {
          const item = currentOrder.items[idx];
          const rec = getRecommendedShelfForItem(item.productName, item.sku);
          const asgn = itemAssignments[item.id] || {
            shelfId: rec.id,
            zone: rec.zone === 'DRY' ? 'Z-DRY' : rec.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN',
            slotLabel: item.assignedSlotId || `${rec.id.replace('shelf-', '')}-01`,
            lotCode: item.lotCode || `LOT-2026-${(idx + 1).toString().padStart(3, '0')}`
          };

          // 1. Update inbound_order_items
          try {
            await fetch(`${API_BASE}/inbound-orders/items/${item.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                assignedZone: asgn.zone,
                assignedSlotId: asgn.slotLabel,
                lotCode: asgn.lotCode,
                expiryDate: asgn.expiryDate ? new Date(asgn.expiryDate).toISOString() : (item.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString()),
                status: 'STORED'
              })
            });
          } catch (err) {
            console.error(err);
          }

          // 2. Sync lot to inventory-service (:3011) for 3D map & Inventory search
          try {
            await fetch(`${INVENTORY_API}/inventory/lots/import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                lotCode: asgn.lotCode,
                sku: item.sku,
                quantity: item.receivedQuantity || item.expectedQuantity || 10,
                zone: asgn.zone?.replace('Z-', '') || 'DRY',
                location: asgn.slotLabel || item.assignedSlotId || 'shelf-C1',
                warehouseCode: currentOrder.warehouseCode || 'WH-006',
                expiryDate: asgn.expiryDate ? new Date(asgn.expiryDate).toISOString() : (item.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString()),
                supplierId: currentOrder.supplierId || 'SUP-001'
              })
            });
          } catch (invErr) {
            console.warn('[INVENTORY SYNC] Error importing lot:', invErr);
          }

          // 3. Sync live stock to product-service (:3010) so customer-web updates immediately (<1s)
          try {
            await fetch(`http://localhost:3010/products/sync-stock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sku: item.sku })
            });
          } catch (stockErr) {
            console.warn('[PRODUCT STOCK SYNC] Error syncing stock:', stockErr);
          }
        }
        globalDataCache.invalidate('products');
      }
    }

    try {
      const res = await fetch(`${API_BASE}/inbound-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus, qualityCheckPassed: true })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      } else {
        await fetch(`${API_BASE}/inbound-orders/${orderId}/${action}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: body ? JSON.stringify(body) : undefined
        });
      }
    } catch (error) {
      console.error(error);
    }
  }, [token, showToast, orders, itemAssignments]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch(`${API_BASE}/inbound-orders/${selectedOrderId}/receive-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ barcode })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === selectedOrderId ? updated : o));
        showToast(`Quét nhận mã ${barcode} thành công!`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedOrderId, token, showToast]);

  // Assign single item storage
  const assignStorage = useCallback(async (orderId: string, itemId: string) => {
    const item = selectedOrder?.items?.find(i => i.id === itemId);
    const rec = getRecommendedShelfForItem(item?.productName, item?.sku);
    const assignment = itemAssignments[itemId] || {
      shelfId: rec.id,
      zone: rec.zone === 'DRY' ? 'Z-DRY' : rec.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN',
      slotLabel: `${rec.id.replace('shelf-', '')}-01`,
      lotCode: `LOT-2026-${Date.now().toString().slice(-4)}`
    };

    try {
      const res = await fetch(`${API_BASE}/inbound-orders/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          assignedZone: assignment.zone,
          assignedSlotId: assignment.slotLabel,
          lotCode: assignment.lotCode,
          expiryDate: assignment.expiryDate ? new Date(assignment.expiryDate).toISOString() : item?.expiryDate,
          status: 'STORED'
        })
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setOrders(prev => prev.map(o => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: o.items?.map(it => it.id === itemId ? { ...it, ...updatedItem, assignedSlotId: assignment.slotLabel, assignedZone: assignment.zone, lotCode: assignment.lotCode, expiryDate: updatedItem.expiryDate || assignment.expiryDate } : it)
          };
        }));

        // Immediately sync lot to inventory-service for instant 3D search
        try {
          await fetch(`${INVENTORY_API}/inventory/lots/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              lotCode: assignment.lotCode,
              sku: item?.sku,
              quantity: item?.receivedQuantity || item?.expectedQuantity || 10,
              zone: assignment.zone?.replace('Z-', '') || 'DRY',
              location: assignment.slotLabel || 'shelf-C1',
              warehouseCode: selectedOrder?.warehouseCode || 'WH-006',
              expiryDate: assignment.expiryDate ? new Date(assignment.expiryDate).toISOString() : (item?.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString()),
              supplierId: selectedOrder?.supplierId || 'SUP-001'
            })
          });

          // Sync product stock to product-service
          fetch(`http://localhost:3010/products/sync-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: item?.sku })
          }).catch(() => {});
        } catch (invErr) {
          console.warn('[INVENTORY SYNC] Error importing lot:', invErr);
        }

        showToast(`Đã lưu "${item?.productName || itemId}" vào ${assignment.slotLabel} & cập nhật Tồn Kho 3D!`, 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi lưu vị trí kệ!', 'error');
    }
  }, [selectedOrder, itemAssignments, token, showToast]);

  // 1-Click Batch auto-assign all items to matching vacant shelves
  const handleBatchAutoAssign = useCallback(async (order: InboundOrder) => {
    if (!order.items || order.items.length === 0) return;
    
    let updatedCount = 0;
    const updatedAssignments = { ...itemAssignments };

    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx];
      const rec = getRecommendedShelfForItem(item.productName, item.sku);
      const zoneKey = rec.zone === 'DRY' ? 'Z-DRY' : rec.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN';
      const slot = `${rec.id.replace('shelf-', '')}-${(idx + 1).toString().padStart(2, '0')}`;
      const defaultExp = item.expiryDate ? (typeof item.expiryDate === 'string' && item.expiryDate.includes('T') ? item.expiryDate.split('T')[0] : item.expiryDate) : new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      const lot = item.lotCode || `LOT-${item.sku || 'SKU'}-${Date.now().toString().slice(-4)}`;

      updatedAssignments[item.id] = {
        shelfId: rec.id,
        zone: zoneKey,
        slotLabel: slot,
        lotCode: lot,
        expiryDate: defaultExp
      };

      try {
        await fetch(`${API_BASE}/inbound-orders/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            assignedZone: zoneKey,
            assignedSlotId: slot,
            lotCode: lot,
            expiryDate: asgn?.expiryDate ? new Date(asgn.expiryDate).toISOString() : item.expiryDate,
            status: 'STORED'
          })
        });

        // Sync to inventory-service
        await fetch(`${INVENTORY_API}/inventory/lots/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            lotCode: lot,
            sku: item.sku,
            quantity: item.receivedQuantity || item.expectedQuantity || 10,
            zone: zoneKey.replace('Z-', ''),
            location: slot,
            warehouseCode: order.warehouseCode || 'WH-006',
            expiryDate: asgn?.expiryDate ? new Date(asgn.expiryDate).toISOString() : (item.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString()),
            supplierId: order.supplierId || 'SUP-001'
          })
        });

        // Sync live stock to product-service
        fetch(`http://localhost:3010/products/sync-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: item.sku })
        }).catch(() => {});

        updatedCount++;
      } catch (err) {
        console.error(err);
      }
    }

    setItemAssignments(updatedAssignments);
    
    setOrders(prev => prev.map(o => {
      if (o.id !== order.id) return o;
      return {
        ...o,
        items: o.items?.map(it => {
          const asgn = updatedAssignments[it.id];
          return asgn ? { ...it, assignedSlotId: asgn.slotLabel, assignedZone: asgn.zone, lotCode: asgn.lotCode } : it;
        })
      };
    }));

    showToast(`Đã phân bổ vị trí lưu kho cho ${updatedCount} mặt hàng thành công.`, 'success');
  }, [itemAssignments, token, showToast]);

  // Memoized KPIs
  const kpiStats = useMemo(() => {
    const relevant = orders.filter(o => {
      if (!activeWh || activeWh === 'ALL') return true;
      return o.warehouseCode === activeWh;
    });

    const total = relevant.length;
    const pending = relevant.filter(o => o.status === 'PENDING').length;
    const receiving = relevant.filter(o => o.status === 'RECEIVING').length;
    const qc = relevant.filter(o => o.status === 'QUALITY_CHECK').length;
    const storing = relevant.filter(o => o.status === 'STORING').length;
    const completed = relevant.filter(o => o.status === 'COMPLETED' || o.status === 'STORED').length;

    return { total, pending, receiving, qc, storing, completed };
  }, [orders, activeWh]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        (o.delivererName && o.delivererName.toLowerCase().includes(q)) ||
        o.items?.some(i => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));

      // Warehouse filter
      let matchWh = true;
      if (activeWh && activeWh !== 'ALL') {
        matchWh = o.warehouseCode === activeWh;
      }

      // Status tab filter
      let matchStatus = true;
      if (statusTab !== 'ALL') {
        if (statusTab === 'COMPLETED') {
          matchStatus = o.status === 'COMPLETED' || o.status === 'STORED';
        } else if (statusTab === 'STORED') {
          matchStatus = o.status === 'STORED';
        } else if (statusTab === 'STORING') {
          matchStatus = o.status === 'STORING';
        } else {
          matchStatus = o.status === statusTab;
        }
      }

      // Date filter
      let matchDate = true;
      if (dateFilter !== 'ALL' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchDate = orderDate >= sevenDaysAgo;
        }
      }

      // Inbound Type filter
      let matchType = true;
      if (inboundTypeFilter !== 'ALL') {
        const cls = detectInboundClassification(o);
        matchType = cls === inboundTypeFilter;
      }

      return matchSearch && matchWh && matchStatus && matchDate && matchType;
    });
  }, [orders, searchQuery, activeWh, statusTab, dateFilter, inboundTypeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const renderStepper = (status: string) => {
    const isOrderDone = status === 'COMPLETED' || status === 'STORED';
    const currentIndex = isOrderDone ? 4 : STEPS.findIndex(s => s.key === status);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }}>
          <div style={{ height: '100%', background: '#0f766e', width: `${Math.max(0, currentIndex) * 25}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || isOrderDone;
          const isCurrent = idx === currentIndex && !isOrderDone;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '20%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? '#0f766e' : isCurrent ? '#fff' : '#f8fafc',
                border: `2px solid ${isCompleted || isCurrent ? '#0f766e' : '#cbd5e1'}`,
                color: isCompleted ? '#fff' : isCurrent ? '#0f766e' : '#94a3b8',
                marginBottom: '0.4rem', fontWeight: 700
              }}>
                {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0f766e' : '#64748b' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#0f766e' : toastMessage.type === 'error' ? '#be123c' : '#1e293b',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 700,
          animation: 'slideIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f0fdfa', padding: '10px', borderRadius: '12px', color: '#0f766e' }}>
              <PackageCheck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản lý Nhập Kho (Inbound)
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Quy trình tiếp nhận hàng từ NCC, quét mã vạch kiểm tra, kiểm định chất lượng (QC), lưu kho và in Phiếu nhập kho Mẫu 01-VT.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isManager && (
            <select
              value={selectedWhFilter}
              onChange={e => setSelectedWhFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #0f766e',
                background: '#f0fdfa',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả các Kho ({orders.length} phiếu)</option>
              {warehouses.map(w => (
                <option key={w.id || w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          )}

          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Toàn thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="WEEK">7 ngày qua</option>
          </select>

          <button 
            className="btn btn-primary" 
            style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }} 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Tạo Yêu Cầu Nhập Kho
          </button>

          <button
            onClick={() => fetchOrders(true)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TỔNG PHIẾU NHẬP</span>
            <FileText size={16} color="#3b82f6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: '8px 0 0 0' }}>{kpiStats.total}</p>
        </div>

        <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>CHỜ TIẾP NHẬN</span>
            <Download size={16} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', margin: '8px 0 0 0' }}>{kpiStats.pending}</p>
        </div>

        <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG NHẬN HÀNG</span>
            <ScanBarcode size={16} color="#0284c7" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '8px 0 0 0' }}>{kpiStats.receiving}</p>
        </div>

        <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>KIỂM ĐỊNH (QC)</span>
            <ShieldCheck size={16} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 0 0' }}>{kpiStats.qc}</p>
        </div>

        <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '14px', border: '1px solid #99f6e4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG LƯU KHO</span>
            <Layers size={16} color="#0f766e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f766e', margin: '8px 0 0 0' }}>{kpiStats.storing}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>HOÀN TẤT NHẬP</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '8px 0 0 0' }}>{kpiStats.completed}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Row: Status Tabs & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: 'Tất cả trạng thái' },
              { key: 'PENDING', label: 'Chờ nhận' },
              { key: 'RECEIVING', label: 'Đang nhận' },
              { key: 'QUALITY_CHECK', label: 'Kiểm định (QC)' },
              { key: 'STORING', label: 'Đang lưu kho' },
              { key: 'STORED', label: 'Đã lưu kho' },
              { key: 'COMPLETED', label: 'Hoàn tất' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: statusTab === tab.key ? '#0f766e' : '#f1f5f9',
                  color: statusTab === tab.key ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', minWidth: '280px' }}>
            <Search size={15} color="#64748b" />
            <input 
              type="text" 
              placeholder="Tìm mã phiếu, nhà cung cấp, số HĐ, người giao, mã sản phẩm..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Inbound Type Filter Bar */}
        <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Hình thức nhập kho:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả hình thức' },
            { key: 'NHAP_MUA_NCC', label: 'Nhập mua từ NCC' },
            { key: 'HANG_TRA_LAI', label: 'Khách hàng trả lại' },
            { key: 'DIEU_CHUYEN', label: 'Điều chuyển chi nhánh' },
            { key: 'KIEM_KE_THUA', label: 'Nhập kiểm kê thừa' },
          ].map(typeTab => (
            <button
              key={typeTab.key}
              onClick={() => setInboundTypeFilter(typeTab.key)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: inboundTypeFilter === typeTab.key ? '1px solid #0f766e' : '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: inboundTypeFilter === typeTab.key ? '#0f766e' : '#fff',
                color: inboundTypeFilter === typeTab.key ? '#fff' : '#334155',
              }}
            >
              {typeTab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Số Phiếu Nhập</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Hình Thức Nhập</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Kho Nhận Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Nhà Cung Cấp / HĐ</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Tổng Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Trạng Thái</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Đang tải danh sách phiếu nhập kho...
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <PackageCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy phiếu nhập kho nào</p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => {
                const statusCfg = STATUS_CONFIG[o.status] || { label: o.status, bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
                const isGoVap = o.warehouseCode === 'WH-006' || !o.warehouseCode;
                const cls = detectInboundClassification(o);
                const typeCfg = INBOUND_TYPE_CONFIG[cls] || INBOUND_TYPE_CONFIG.NHAP_MUA_NCC;

                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{o.orderCode}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: typeCfg.bg, color: typeCfg.color, fontWeight: 600, border: `1px solid ${typeCfg.border}`, whiteSpace: 'nowrap' }}>
                        {typeCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ 
                        fontSize: '0.8rem', padding: '3px 8px', borderRadius: '8px',
                        background: isGoVap ? '#f0fdfa' : '#f1f5f9',
                        color: isGoVap ? '#0f766e' : '#475569',
                        fontWeight: 700, border: `1px solid ${isGoVap ? '#99f6e4' : '#e2e8f0'}`
                      }}>
                        {o.warehouseCode === 'WH-006' ? 'Kho Gò Vấp (WH-006)' : o.warehouseCode || 'Kho Hàng Gò Vấp'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.supplierName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {o.invoiceNumber ? `HĐ: ${o.invoiceNumber}` : 'HĐ: 1C26TCM-0012'}
                        {o.delivererName ? ` • Giao: ${o.delivererName}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                      {o.totalItems || o.items?.length || 1} mặt hàng
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                        SL: {o.totalQuantity || o.items?.reduce((s, i) => s + (i.expectedQuantity || 1), 0) || 1} sp
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px',
                        background: statusCfg.bg, color: statusCfg.color, fontWeight: 700,
                        border: `1px solid ${statusCfg.border}`
                      }}>
                        {statusCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600 }} 
                          onClick={() => setSelectedOrderId(o.id)}
                        >
                          Chi tiết
                        </button>
                        <button 
                          style={{ 
                            padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, 
                            background: '#f0fdfa', color: '#0f766e', 
                            border: '1px solid #99f6e4', borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                          }} 
                          onClick={() => setReceiptOrder(o)}
                          title="In Phiếu Nhập Kho Mẫu số 01 - VT (Thông tư Bộ Tài Chính)"
                        >
                          <Printer size={14} /> In Phiếu 01-VT
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontSize: '0.85rem', color: '#64748b' }}>
            <div>
              Hiển thị <b>{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredOrders.length, currentPage * pageSize)}</b> trên tổng số <b>{filteredOrders.length}</b> phiếu nhập
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ChevronLeft size={16} /> Trước
              </button>

              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                Trang {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inbound Detail Modal */}
      {selectedOrder && (
        <div 
          onClick={() => setSelectedOrderId(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '880px', maxWidth: '94%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Chi tiết phiếu nhập: {selectedOrder.orderCode}
                  </h3>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 12px', borderRadius: '8px',
                      background: '#0f766e', color: '#fff',
                      border: 'none', fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} /> Mẫu số 01 - VT
                  </button>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
                  Nhà cung cấp: <b>{selectedOrder.supplierName}</b> {selectedOrder.invoiceNumber ? `(HĐ: ${selectedOrder.invoiceNumber})` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedOrderId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            {renderStepper(selectedOrder.status)}

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Danh mục sản phẩm tiếp nhận</h4>
                {selectedOrder.status === 'RECEIVING' && (
                  <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowScanner(true)}>
                    <ScanBarcode size={16} /> Quét mã Barcode nhận hàng
                  </button>
                )}
              </div>

              {/* Step 4 Smart AI Allocation Banner */}
              {selectedOrder.status === 'STORING' && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>
                        Phân Bổ Kệ Lưu Kho & Gán Lô Tự Động Theo Từng Loại Hàng
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                        Hệ thống tự động đề xuất dải nhiệt độ bảo quản chuẩn (Kho Khô / Mát / Đông) và chọn dãy kệ còn trống dung lượng cao nhất.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBatchAutoAssign(selectedOrder)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: '#059669',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(5,150,105,0.2)'
                    }}
                  >
                    <Layers size={14} /> Gán Vị Trí Kệ Tự Động (Putaway)
                  </button>
                </div>
              )}
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Mã & Tên Sản Phẩm</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>SL Chứng Từ</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>SL Thực Nhập</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Vị Trí Kệ Lưu Kho</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>HSD / Lô</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => {
                      const recShelf = getRecommendedShelfForItem(item.productName, item.sku);
                      const curAssign = itemAssignments[item.id] || {
                        shelfId: recShelf.id,
                        zone: recShelf.zone === 'DRY' ? 'Z-DRY' : recShelf.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN',
                        slotLabel: item.assignedSlotId || `${recShelf.id.replace('shelf-', '')}-01`,
                        lotCode: item.lotCode || `LOT-2026-${(idx + 1).toString().padStart(3, '0')}`
                      };

                      return (
                        <tr key={item.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{item.sku}</span>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: recShelf.zone === 'DRY' ? '#fef3c7' : recShelf.zone === 'COOL' ? '#e0f2fe' : '#f3e8ff',
                                color: recShelf.zone === 'DRY' ? '#92400e' : recShelf.zone === 'COOL' ? '#0369a1' : '#6b21a8',
                                border: `1px solid ${recShelf.zone === 'DRY' ? '#fde68a' : recShelf.zone === 'COOL' ? '#bae6fd' : '#e9d5ff'}`
                              }}>
                                {recShelf.zoneLabel}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>{item.expectedQuantity}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f766e' }}>
                            {item.receivedQuantity || item.expectedQuantity}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f766e' }}>
                            {selectedOrder.status === 'STORING' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <select
                                    value={curAssign.shelfId}
                                    onChange={(e) => {
                                      const targetShelf = WAREHOUSE_SHELVES.find(s => s.id === e.target.value) || recShelf;
                                      const zoneKey = targetShelf.zone === 'DRY' ? 'Z-DRY' : targetShelf.zone === 'COOL' ? 'Z-COOL' : 'Z-FROZEN';
                                      const newSlot = `${targetShelf.id.replace('shelf-', '')}-01`;
                                      setItemAssignments(prev => ({
                                        ...prev,
                                        [item.id]: {
                                          ...curAssign,
                                          shelfId: targetShelf.id,
                                          zone: zoneKey,
                                          slotLabel: newSlot
                                        }
                                      }));
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: curAssign.shelfId === recShelf.id ? '1.5px solid #059669' : '1px solid #cbd5e1',
                                      background: '#fff',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: '#0f172a',
                                      maxWidth: '230px'
                                    }}
                                  >
                                    <optgroup label="Kho Khô (+25°C) — Kệ C1 đến C10">
                                      {WAREHOUSE_SHELVES.filter(s => s.zone === 'DRY').map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.id.replace('shelf-', 'Kệ ')}: {s.name.split('(')[1]?.replace(')', '') || s.name} (Trống {s.freePct}%){s.id === recShelf.id ? ' [Đề xuất]' : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Kho Mát (0°C ~ +4°C) — Kệ A1 đến A8">
                                      {WAREHOUSE_SHELVES.filter(s => s.zone === 'COOL').map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.id.replace('shelf-', 'Kệ ')}: {s.name.split('(')[1]?.replace(')', '') || s.name} (Trống {s.freePct}%){s.id === recShelf.id ? ' [Đề xuất]' : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Hầm Đông Lạnh (-18°C) — Kệ B1 đến B8">
                                      {WAREHOUSE_SHELVES.filter(s => s.zone === 'FROZEN').map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.id.replace('shelf-', 'Kệ ')}: {s.name.split('(')[1]?.replace(')', '') || s.name} (Trống {s.freePct}%){s.id === recShelf.id ? ' [Đề xuất]' : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>

                                  <input 
                                    type="text"
                                    value={curAssign.slotLabel}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemAssignments(prev => ({
                                        ...prev,
                                        [item.id]: { ...curAssign, slotLabel: val }
                                      }));
                                    }}
                                    placeholder="Vị trí ô"
                                    style={{ width: '60px', padding: '5px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}
                                    title="Mã ô kệ lưu kho (Ví dụ: C5-01, A1-02)"
                                  />

                                  <button
                                    onClick={() => assignStorage(selectedOrder.id, item.id)}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      background: item.assignedSlotId ? '#f0fdf4' : '#0f766e',
                                      color: item.assignedSlotId ? '#15803d' : '#fff',
                                      border: item.assignedSlotId ? '1px solid #86efac' : 'none',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Lưu vị trí kệ này vào hệ thống"
                                  >
                                    {item.assignedSlotId ? 'Đã Lưu' : 'Lưu Kệ'}
                                  </button>
                                </div>

                                {curAssign.shelfId === recShelf.id && (
                                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={11} /> Khớp dải nhiệt độ & khoang kệ tối ưu
                                  </div>
                                )}
                              </div>
                            ) : (
                              item.assignedSlotId ? (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                                  {item.assignedSlotId} ({item.assignedZone || 'Z-DRY'})
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Chờ phân vị trí</span>
                              )
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>
                            {selectedOrder.status !== 'COMPLETED' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>HSD:</span>
                                  <input
                                    type="date"
                                    value={curAssign.expiryDate || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemAssignments(prev => ({
                                        ...prev,
                                        [item.id]: { ...curAssign, expiryDate: val }
                                      }));
                                      // Tự động lưu vào đơn nhập kho
                                      fetch(`${API_BASE}/inbound-orders/items/${item.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                        body: JSON.stringify({ expiryDate: new Date(val).toISOString() })
                                      }).catch(() => {});
                                    }}
                                    style={{
                                      padding: '4px 6px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      color: '#0f172a'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>Mã Lô:</span>
                                  <input
                                    type="text"
                                    value={curAssign.lotCode}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemAssignments(prev => ({
                                        ...prev,
                                        [item.id]: { ...curAssign, lotCode: val }
                                      }));
                                    }}
                                    placeholder="LOT-2026-..."
                                    style={{
                                      width: '110px',
                                      padding: '4px 6px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      color: '#0f766e',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                </div>

                                {curAssign.expiryDate && (() => {
                                  const diffDays = Math.ceil((new Date(curAssign.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                  const isNear = diffDays <= 7 && diffDays >= 0;
                                  const isExpired = diffDays < 0;
                                  return (
                                    <div style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: isExpired ? '#be123c' : isNear ? '#d97706' : '#15803d',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      {isExpired ? `Đã hết hạn (${Math.abs(diffDays)} ngày trước)` : isNear ? `Cận Date (${diffDays} ngày)` : `Còn ${diffDays} ngày`}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                                  {item.lotCode || 'LOT-IN-2026'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  HSD: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : '31/12/2026'}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stepper Action Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
              {selectedOrder.status === 'PENDING' && (
                <button 
                  style={{ padding: '12px 24px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', boxShadow: '0 4px 10px rgba(15,118,110,0.25)' }} 
                  onClick={() => advanceState(selectedOrder.id, 'receive')}
                >
                  <Download size={20} /> Bắt Đầu Tiếp Nhận Hàng Từ Nhà Cung Cấp
                </button>
              )}

              {selectedOrder.status === 'RECEIVING' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#0f766e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanBarcode size={20} /> Quét mã Barcode
                  </button>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => advanceState(selectedOrder.id, 'quality-check')}
                  >
                    <ShieldCheck size={20} /> Xác nhận Đủ & Chuyển Kiểm Định (QC) <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {selectedOrder.status === 'QUALITY_CHECK' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                    onClick={() => advanceState(selectedOrder.id, 'store')}
                  >
                    <CheckCircle2 size={22} /> Kiểm Định Đạt Chuẩn (QC Passed) & Chuyển Lưu Kho
                  </button>
                </div>
              )}

              {selectedOrder.status === 'STORING' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setShowMapModal(selectedOrder.id)}
                  >
                    <Warehouse size={20} /> Mở Bản Đồ Kho 3D Xem Vị Trí Kệ
                  </button>
                  <button 
                    style={{ flex: 1, padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                    onClick={() => advanceState(selectedOrder.id, 'complete')}
                  >
                    <CheckCircle2 size={22} /> Hoàn Tất Lưu Kho (Hàng Sẵn Sàng Bán)
                  </button>
                </div>
              )}

              {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'STORED') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#15803d', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                    Đơn hàng đã nhập kho thành công và cập nhật tồn kho toàn hệ thống.
                  </p>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={16} /> In Phiếu Nhập Kho (Mẫu 01-VT)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeQRScannerModal 
          isOpen={showScanner}
          onScanSuccess={(code) => handleScan(code)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showMapModal && (
        <div 
          onClick={() => setShowMapModal(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '800px', maxWidth: '90%', padding: '2rem', borderRadius: '16px', background: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Bản Đồ Kệ Lưu Kho 3D Isometric</h3>
              <button onClick={() => setShowMapModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <WarehouseMap3D 
              onSelectSlot={(zone, slotId) => {
                showToast(`Đã chọn vị trí ${slotId} (${zone})`, 'info');
                setShowMapModal(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Create Inbound Modal (Manual & CSV Upload with Searchable Combobox) */}
      <CreateInboundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          setSelectedOrderId(newOrder.id);
          showToast('Tạo yêu cầu nhập kho thành công.', 'success');
        }}
        token={token}
        user={user}
        defaultWarehouse={activeWh !== 'ALL' ? activeWh : (selectedWarehouseCode || 'WH-006')}
      />

      {/* Inbound Receipt Modal (Mẫu số 01 - VT) */}
      {receiptOrder && (
        <InboundReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};

export default InboundOrders;
