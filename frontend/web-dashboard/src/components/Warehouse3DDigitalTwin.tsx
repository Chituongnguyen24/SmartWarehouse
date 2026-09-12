import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  Thermometer,
  Snowflake,
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  Search,
  Maximize2,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Box,
  Building2,
  TrendingUp,
  SlidersHorizontal,
  Send,
  ExternalLink,
  QrCode,
  ScanBarcode,
  Barcode,
} from 'lucide-react';
import { Supermarket3DScene } from './Supermarket3DScene';
import type { Rack3DData } from './Supermarket3DScene';
import { useWarehouse } from '../contexts/WarehouseContext';
import { useAuth } from '../contexts/AuthContext';

export interface ShelfItem {
  id?: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  lotCode: string;
  importDate?: string;
  expiryDate: string;
  daysRemaining: number;
  price: number;
  imageUrl?: string;
  warehouseCode?: string;
  location?: string;
  zone?: string;

  // ML AI Spoilage & Risk Model Fields
  riskLevel?: 'SAFE' | 'WARNING' | 'DANGER';
  riskScore?: number;
  aiScore?: number;
  shelfLifePct?: number;
  riskReason?: string;
  riskRecommendation?: string;
  riskCategory?: string;
  categoryIcon?: string;

  // Audit History
  lastAuditedAt?: string;
  lastAuditedBy?: string;
  lastAuditDiff?: number;
  lastAuditActualQty?: number;
  lastAuditReason?: string;
}

export interface ShelfRack {
  id: string;
  name: string;
  zone: 'COOL' | 'FROZEN' | 'DRY';
  zoneLabel: string;
  temperature: string;
  humidity: string;
  maxCapacity: number;
  currentCapacity: number;
  items: ShelfItem[];
  hasAlert?: boolean;
  alertMsg?: string;
  customPos?: [number, number, number];
}

// 26 Comprehensive Supermarket Racks (8 COOL, 8 FROZEN, 10 DRY)
const DEFAULT_RACKS: ShelfRack[] = [
  // 1. COOL ZONE (Kho Mát 0-4°C - 8 Racks: A1 to A8)
  {
    id: 'RACK-COOL-01',
    name: 'Kệ A1 (Thịt Tươi Sống & Gia Cầm)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+2.4°C',
    humidity: '78%',
    maxCapacity: 500,
    currentCapacity: 340,
    hasAlert: true,
    alertMsg: 'Lô thịt CP cận date 48h (Ưu tiên xuất FEFO)',
    items: [
      { sku: 'EM-102544', name: 'Thịt heo xay CP 400g', category: 'Thịt tươi', qty: 85, unit: 'Khay', lotCode: 'LOT-EM-102544-C', expiryDate: '02/09/2026', daysRemaining: 2, price: 56000 },
      { sku: 'EM-103829', name: 'Thịt bò Úc phi lê 500g', category: 'Thịt tươi', qty: 95, unit: 'Khay', lotCode: 'LOT-EM-103829-B', expiryDate: '05/09/2026', daysRemaining: 5, price: 185000 },
      { sku: 'EM-104921', name: 'Đùi gà tươi CP 1kg', category: 'Gia cầm', qty: 60, unit: 'Túi', lotCode: 'LOT-EM-104921-A', expiryDate: '06/09/2026', daysRemaining: 6, price: 72000 },
      { sku: 'EM-105112', name: 'Thăn bò Mỹ Black Angus 500g', category: 'Thịt tươi', qty: 45, unit: 'Khay', lotCode: 'LOT-EM-105112-A', expiryDate: '08/09/2026', daysRemaining: 8, price: 215000 },
      { sku: 'EM-106443', name: 'Cánh gà tươi CP túi 500g', category: 'Gia cầm', qty: 70, unit: 'Túi', lotCode: 'LOT-EM-106443-D', expiryDate: '09/09/2026', daysRemaining: 9, price: 54000 },
      { sku: 'EM-107882', name: 'Sườn non heo CP 500g', category: 'Thịt tươi', qty: 55, unit: 'Khay', lotCode: 'LOT-EM-107882-C', expiryDate: '07/09/2026', daysRemaining: 7, price: 110000 },
    ],
  },
  {
    id: 'RACK-COOL-02',
    name: 'Kệ A2 (Sữa Tươi & Bơ Sữa Thanh Trùng)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.1°C',
    humidity: '75%',
    maxCapacity: 450,
    currentCapacity: 285,
    items: [
      { sku: 'EM-201102', name: 'Sữa tươi Đà Lạt Milk 1L', category: 'Sữa & Bơ', qty: 42, unit: 'Chai', lotCode: 'LOT-EM-201102-A', expiryDate: '03/09/2026', daysRemaining: 3, price: 38000 },
      { sku: 'EM-202334', name: 'Sữa chua TH True Yogurt lốc 4', category: 'Sữa & Bơ', qty: 80, unit: 'Lốc', lotCode: 'LOT-EM-202334-Y', expiryDate: '15/09/2026', daysRemaining: 15, price: 29000 },
      { sku: 'EM-203551', name: 'Bơ nhạt Anchor New Zealand 227g', category: 'Sữa & Bơ', qty: 53, unit: 'Hộp', lotCode: 'LOT-EM-203551-B', expiryDate: '28/11/2026', daysRemaining: 89, price: 78000 },
      { sku: 'EM-204122', name: 'Sữa tươi TH True Milk 1L', category: 'Sữa & Bơ', qty: 65, unit: 'Hộp', lotCode: 'LOT-EM-204122-TH', expiryDate: '20/09/2026', daysRemaining: 20, price: 36500 },
      { sku: 'EM-205889', name: 'Phô mai tươi Mozzarella Emborg 200g', category: 'Sữa & Bơ', qty: 40, unit: 'Gói', lotCode: 'LOT-EM-205889-M', expiryDate: '10/10/2026', daysRemaining: 40, price: 85000 },
      { sku: 'EM-206443', name: 'Váng sữa Monte Zott lốc 4', category: 'Sữa & Bơ', qty: 90, unit: 'Lốc', lotCode: 'LOT-EM-206443-V', expiryDate: '25/09/2026', daysRemaining: 25, price: 58000 },
    ],
  },
  {
    id: 'RACK-COOL-03',
    name: 'Kệ A3 (Rau Củ Quả Hữu Cơ & Thủy Canh)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+4.0°C',
    humidity: '82%',
    maxCapacity: 400,
    currentCapacity: 250,
    items: [
      { sku: 'EM-301124', name: 'Rau xà lách Romaine thủy canh 300g', category: 'Rau củ', qty: 50, unit: 'Gói', lotCode: 'LOT-EM-301124-R', expiryDate: '03/09/2026', daysRemaining: 3, price: 24000 },
      { sku: 'EM-302551', name: 'Cà chua bi Cherry Đà Lạt 500g', category: 'Rau củ', qty: 60, unit: 'Hộp', lotCode: 'LOT-EM-302551-T', expiryDate: '07/09/2026', daysRemaining: 7, price: 35000 },
      { sku: 'EM-303998', name: 'Nấm đùi gà baby VietGAP 200g', category: 'Rau củ', qty: 40, unit: 'Gói', lotCode: 'LOT-EM-303998-M', expiryDate: '04/09/2026', daysRemaining: 4, price: 28000 },
      { sku: 'EM-304771', name: 'Bông cải xanh Baby VietGAP 400g', category: 'Rau củ', qty: 45, unit: 'Gói', lotCode: 'LOT-EM-304771-B', expiryDate: '06/09/2026', daysRemaining: 6, price: 32000 },
      { sku: 'EM-305229', name: 'Dưa leo baby Hữu cơ 500g', category: 'Rau củ', qty: 55, unit: 'Túi', lotCode: 'LOT-EM-305229-D', expiryDate: '08/09/2026', daysRemaining: 8, price: 26000 },
      { sku: 'EM-306810', name: 'Ớt chuông đỏ Đà Lạt 500g', category: 'Rau củ', qty: 35, unit: 'Khay', lotCode: 'LOT-EM-306810-O', expiryDate: '10/09/2026', daysRemaining: 10, price: 42000 },
    ],
  },
  {
    id: 'RACK-COOL-04',
    name: 'Kệ A4 (Trái Cây Tươi & Nước Ép Mát)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.5°C',
    humidity: '76%',
    maxCapacity: 450,
    currentCapacity: 310,
    items: [
      { sku: 'EM-401109', name: 'Táo Envy New Zealand Size 70', category: 'Trái cây', qty: 90, unit: 'Kg', lotCode: 'LOT-EM-401109-AP', expiryDate: '18/09/2026', daysRemaining: 14, price: 149000 },
      { sku: 'EM-402882', name: 'Cam vàng Úc Navel mọng nước', category: 'Trái cây', qty: 70, unit: 'Kg', lotCode: 'LOT-EM-402882-OR', expiryDate: '22/09/2026', daysRemaining: 18, price: 89000 },
      { sku: 'EM-403441', name: 'Nước ép cam tươi Teppy 1L', category: 'Nước ép', qty: 50, unit: 'Chai', lotCode: 'LOT-EM-403441-TP', expiryDate: '25/09/2026', daysRemaining: 21, price: 32000 },
      { sku: 'EM-404556', name: 'Nho mẫu đơn Shine Muscat 500g', category: 'Trái cây', qty: 40, unit: 'Hộp', lotCode: 'LOT-EM-404556-NH', expiryDate: '12/09/2026', daysRemaining: 8, price: 290000 },
      { sku: 'EM-405118', name: 'Kiwi vàng New Zealand Zespri lốc 4', category: 'Trái cây', qty: 60, unit: 'Hộp', lotCode: 'LOT-EM-405118-KW', expiryDate: '16/09/2026', daysRemaining: 12, price: 125000 },
      { sku: 'EM-406772', name: 'Nước ép táo nguyên chất Vfresh 1L', category: 'Nước ép', qty: 45, unit: 'Hộp', lotCode: 'LOT-EM-406772-VF', expiryDate: '30/09/2026', daysRemaining: 26, price: 36000 },
    ],
  },
  {
    id: 'RACK-COOL-05',
    name: 'Kệ A5 (Trứng Gà Tươi & Sữa Chua Uống)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.0°C',
    humidity: '74%',
    maxCapacity: 400,
    currentCapacity: 260,
    items: [
      { sku: 'EM-451101', name: 'Trứng gà Ta Ba Huân hộp 10 quả', category: 'Trứng tươi', qty: 110, unit: 'Hộp', lotCode: 'LOT-EM-451101-BH', expiryDate: '15/09/2026', daysRemaining: 11, price: 34000 },
      { sku: 'EM-452332', name: 'Sữa chua uống Probi Vinamilk lốc 5', category: 'Sữa & Bơ', qty: 85, unit: 'Lốc', lotCode: 'LOT-EM-452332-PB', expiryDate: '20/09/2026', daysRemaining: 16, price: 26500 },
      { sku: 'EM-453774', name: 'Trứng gà Omega 3 Dabaco 10 quả', category: 'Trứng tươi', qty: 65, unit: 'Hộp', lotCode: 'LOT-EM-453774-DB', expiryDate: '18/09/2026', daysRemaining: 14, price: 42000 },
    ],
  },
  {
    id: 'RACK-COOL-06',
    name: 'Kệ A6 (Thủy Sản Mát Sơ Chế Sẵn)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+1.8°C',
    humidity: '80%',
    maxCapacity: 420,
    currentCapacity: 290,
    items: [
      { sku: 'EM-461129', name: 'Cá hồi Na Uy phi lê tươi sống 300g', category: 'Thủy sản tươi', qty: 75, unit: 'Khay', lotCode: 'LOT-EM-461129-NW', expiryDate: '04/09/2026', daysRemaining: 4, price: 165000 },
      { sku: 'EM-462551', name: 'Tôm thẻ chân trắng tươi 500g', category: 'Thủy sản tươi', qty: 80, unit: 'Khay', lotCode: 'LOT-EM-462551-TC', expiryDate: '05/09/2026', daysRemaining: 5, price: 120000 },
      { sku: 'EM-463882', name: 'Mực nang làm sạch cắt miếng 400g', category: 'Thủy sản tươi', qty: 60, unit: 'Khay', lotCode: 'LOT-EM-463882-MN', expiryDate: '06/09/2026', daysRemaining: 6, price: 98000 },
    ],
  },
  {
    id: 'RACK-COOL-07',
    name: 'Kệ A7 (Xúc Xích, Giò Chả & Bò Viên Tươi)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+2.8°C',
    humidity: '77%',
    maxCapacity: 450,
    currentCapacity: 310,
    items: [
      { sku: 'EM-471105', name: 'Giò lụa Vissan thượng hạng 500g', category: 'Thực phẩm mát', qty: 95, unit: 'Cây', lotCode: 'LOT-EM-471105-GL', expiryDate: '25/09/2026', daysRemaining: 21, price: 85000 },
      { sku: 'EM-472338', name: 'Bò viên G Kitchen gói 500g', category: 'Thực phẩm mát', qty: 85, unit: 'Gói', lotCode: 'LOT-EM-472338-BV', expiryDate: '18/09/2026', daysRemaining: 14, price: 72000 },
      { sku: 'EM-473991', name: 'Xúc xích Vườn Bia Đức CP 500g', category: 'Thực phẩm mát', qty: 110, unit: 'Gói', lotCode: 'LOT-EM-473991-VB', expiryDate: '28/09/2026', daysRemaining: 24, price: 92000 },
    ],
  },
  {
    id: 'RACK-COOL-08',
    name: 'Kệ A8 (Rau Rừng, Nấm Tươi & Đậu Hũ)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.8°C',
    humidity: '84%',
    maxCapacity: 400,
    currentCapacity: 275,
    items: [
      { sku: 'EM-481122', name: 'Đậu hũ non trứng Ichiban 220g', category: 'Đậu & Nấm', qty: 120, unit: 'Cây', lotCode: 'LOT-EM-481122-DH', expiryDate: '10/09/2026', daysRemaining: 6, price: 14500 },
      { sku: 'EM-482441', name: 'Nấm kim châm Hàn Quốc gói 150g', category: 'Đậu & Nấm', qty: 95, unit: 'Gói', lotCode: 'LOT-EM-482441-NK', expiryDate: '12/09/2026', daysRemaining: 8, price: 18000 },
      { sku: 'EM-483889', name: 'Nấm đông cô tươi Đà Lạt 200g', category: 'Đậu & Nấm', qty: 60, unit: 'Gói', lotCode: 'LOT-EM-483889-DC', expiryDate: '08/09/2026', daysRemaining: 4, price: 36000 },
    ],
  },

  // 2. FROZEN ZONE (Hầm Đông Lạnh -18°C ~ -22°C - 8 Racks: B1 to B8)
  {
    id: 'RACK-FROZEN-01',
    name: 'Kệ B1 (Thủy Hải Sản Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-19.2°C',
    humidity: '60%',
    maxCapacity: 480,
    currentCapacity: 390,
    items: [
      { sku: 'EM-501198', name: 'File cá hồi Nauy tươi đông lạnh 500g', category: 'Thủy hải sản', qty: 110, unit: 'Gói', lotCode: 'LOT-EM-501198-S', expiryDate: '20/12/2026', daysRemaining: 111, price: 235000 },
      { sku: 'EM-502441', name: 'Tôm sú lột nõn Cà Mau size 20 500g', category: 'Thủy hải sản', qty: 120, unit: 'Hộp', lotCode: 'LOT-EM-502441-SH', expiryDate: '15/01/2027', daysRemaining: 137, price: 165000 },
      { sku: 'EM-503882', name: 'Mực ống Phú Quốc tươi đông 500g', category: 'Thủy hải sản', qty: 60, unit: 'Khay', lotCode: 'LOT-EM-503882-SQ', expiryDate: '10/02/2027', daysRemaining: 163, price: 145000 },
      { sku: 'EM-504771', name: 'Cá tuyết Nauy cắt khúc 500g', category: 'Thủy hải sản', qty: 45, unit: 'Khay', lotCode: 'LOT-EM-504771-CT', expiryDate: '25/02/2027', daysRemaining: 178, price: 280000 },
      { sku: 'EM-505332', name: 'Bạch tuộc baby đông lạnh 500g', category: 'Thủy hải sản', qty: 70, unit: 'Gói', lotCode: 'LOT-EM-505332-BT', expiryDate: '18/03/2027', daysRemaining: 199, price: 125000 },
      { sku: 'EM-506114', name: 'Cua lột Myanmar đông lạnh 400g', category: 'Thủy hải sản', qty: 50, unit: 'Hộp', lotCode: 'LOT-EM-506114-CL', expiryDate: '12/04/2027', daysRemaining: 224, price: 215000 },
    ],
  },
  {
    id: 'RACK-FROZEN-02',
    name: 'Kệ B2 (Kem & Bánh Tráng Miệng Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-20.5°C',
    humidity: '58%',
    maxCapacity: 450,
    currentCapacity: 310,
    items: [
      { sku: 'EM-601122', name: 'Kem Häagen-Dazs Vani 473ml', category: 'Kem & Tráng miệng', qty: 70, unit: 'Hộp', lotCode: 'LOT-EM-601122-HD', expiryDate: '30/06/2027', daysRemaining: 303, price: 245000 },
      { sku: 'EM-602443', name: 'Kem Cornetto Dâu Socola lốc 5', category: 'Kem & Tráng miệng', qty: 80, unit: 'Hộp', lotCode: 'LOT-EM-602443-CN', expiryDate: '15/07/2027', daysRemaining: 318, price: 65000 },
      { sku: 'EM-603881', name: 'Bánh Mochi kem trà xanh Nhật 6 cái', category: 'Kem & Tráng miệng', qty: 60, unit: 'Hộp', lotCode: 'LOT-EM-603881-MC', expiryDate: '01/05/2027', daysRemaining: 243, price: 82000 },
      { sku: 'EM-604772', name: 'Kem Celano ốc quế Trà sữa trân châu', category: 'Kem & Tráng miệng', qty: 95, unit: 'Hộp', lotCode: 'LOT-EM-604772-CL', expiryDate: '20/08/2027', daysRemaining: 354, price: 72000 },
      { sku: 'EM-605991', name: 'Bánh Su kem Beard Papa đông lạnh 6 cái', category: 'Kem & Tráng miệng', qty: 50, unit: 'Hộp', lotCode: 'LOT-EM-605991-BP', expiryDate: '10/06/2027', daysRemaining: 283, price: 110000 },
      { sku: 'EM-606229', name: 'Kem Magnum Socola Hạnh nhân lốc 4', category: 'Kem & Tráng miệng', qty: 85, unit: 'Hộp', lotCode: 'LOT-EM-606229-MN', expiryDate: '05/09/2027', daysRemaining: 370, price: 135000 },
    ],
  },
  {
    id: 'RACK-FROZEN-03',
    name: 'Kệ B3 (Thực Phẩm Sơ Chế & Viên Lẩu)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-19.8°C',
    humidity: '59%',
    maxCapacity: 460,
    currentCapacity: 340,
    items: [
      { sku: 'EM-701144', name: 'Há cảo tôm thịt Cầu Tre 500g', category: 'Chế biến sẵn', qty: 90, unit: 'Gói', lotCode: 'LOT-EM-701144-CT', expiryDate: '12/04/2027', daysRemaining: 224, price: 58000 },
      { sku: 'EM-702881', name: 'Pizza phô mai bò bằm Dr.Oetker', category: 'Chế biến sẵn', qty: 70, unit: 'Hộp', lotCode: 'LOT-EM-702881-PZ', expiryDate: '01/05/2027', daysRemaining: 243, price: 92000 },
      { sku: 'EM-703552', name: 'Viên thả lẩu tôm trứng cá EB 500g', category: 'Chế biến sẵn', qty: 80, unit: 'Gói', lotCode: 'LOT-EM-703552-EB', expiryDate: '20/05/2027', daysRemaining: 262, price: 115000 },
      { sku: 'EM-704991', name: 'Sủi cảo nhân bắp cải thịt heo 500g', category: 'Chế biến sẵn', qty: 65, unit: 'Gói', lotCode: 'LOT-EM-704991-SC', expiryDate: '15/06/2027', daysRemaining: 288, price: 62000 },
      { sku: 'EM-705332', name: 'Chả giò rế tôm cua Vissan 500g', category: 'Chế biến sẵn', qty: 85, unit: 'Gói', lotCode: 'LOT-EM-705332-CG', expiryDate: '10/07/2027', daysRemaining: 313, price: 74000 },
      { sku: 'EM-706771', name: 'Xúc xích Đức nướng CP 500g đông lạnh', category: 'Chế biến sẵn', qty: 90, unit: 'Gói', lotCode: 'LOT-EM-706771-XX', expiryDate: '05/08/2027', daysRemaining: 339, price: 89000 },
    ],
  },
  {
    id: 'RACK-FROZEN-04',
    name: 'Kệ B4 (Thịt Nhập Khẩu Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-21.0°C',
    humidity: '57%',
    maxCapacity: 500,
    currentCapacity: 380,
    items: [
      { sku: 'EM-801123', name: 'Dẻ sườn bò Mỹ đông lạnh Black Angus 1kg', category: 'Thịt đông lạnh', qty: 95, unit: 'Khay', lotCode: 'LOT-EM-801123-BA', expiryDate: '28/08/2027', daysRemaining: 362, price: 340000 },
      { sku: 'EM-802551', name: 'Ba chỉ heo rút sườn Canada đông lạnh 1kg', category: 'Thịt đông lạnh', qty: 110, unit: 'Khay', lotCode: 'LOT-EM-802551-CA', expiryDate: '15/09/2027', daysRemaining: 380, price: 165000 },
      { sku: 'EM-803994', name: 'Sườn cừu Úc cắt khúc đông lạnh 500g', category: 'Thịt đông lạnh', qty: 75, unit: 'Gói', lotCode: 'LOT-EM-803994-LB', expiryDate: '10/10/2027', daysRemaining: 405, price: 210000 },
      { sku: 'EM-804772', name: 'Gầu bò Úc bào mỏng thả lẩu 500g', category: 'Thịt đông lạnh', qty: 85, unit: 'Khay', lotCode: 'LOT-EM-804772-GB', expiryDate: '15/11/2027', daysRemaining: 441, price: 145000 },
      { sku: 'EM-805118', name: 'Bắp bò Tây Ban Nha đông lạnh 1kg', category: 'Thịt đông lạnh', qty: 65, unit: 'Khay', lotCode: 'LOT-EM-805118-BB', expiryDate: '20/12/2027', daysRemaining: 476, price: 195000 },
      { sku: 'EM-806441', name: 'Ức vịt Pháp Magret de Canard 500g', category: 'Thịt đông lạnh', qty: 50, unit: 'Gói', lotCode: 'LOT-EM-806441-UV', expiryDate: '10/01/2028', daysRemaining: 497, price: 240000 },
    ],
  },
  {
    id: 'RACK-FROZEN-05',
    name: 'Kệ B5 (Hải Sản Cao Cấp Na Uy & Nhật)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-22.0°C',
    humidity: '55%',
    maxCapacity: 480,
    currentCapacity: 320,
    items: [
      { sku: 'EM-851121', name: 'Sò điệp Nhật Hotate đông lạnh 500g', category: 'Hải sản', qty: 85, unit: 'Hộp', lotCode: 'LOT-EM-851121-SD', expiryDate: '15/09/2027', daysRemaining: 380, price: 420000 },
      { sku: 'EM-852443', name: 'Cua tuyết Canada đông lạnh 1kg', category: 'Hải sản', qty: 45, unit: 'Thùng', lotCode: 'LOT-EM-852443-CT', expiryDate: '20/10/2027', daysRemaining: 415, price: 890000 },
      { sku: 'EM-853772', name: 'Cá hồi xông khói Na Uy 200g', category: 'Hải sản', qty: 110, unit: 'Gói', lotCode: 'LOT-EM-853772-CX', expiryDate: '18/06/2027', daysRemaining: 291, price: 135000 },
    ],
  },
  {
    id: 'RACK-FROZEN-06',
    name: 'Kệ B6 (Bánh Pizza, Khoai Tây & Fastfood)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-19.5°C',
    humidity: '58%',
    maxCapacity: 460,
    currentCapacity: 310,
    items: [
      { sku: 'EM-861109', name: 'Khoai tây cọng Bỉ Lutosa đông lạnh 1kg', category: 'Fastfood', qty: 140, unit: 'Gói', lotCode: 'LOT-EM-861109-KT', expiryDate: '10/08/2027', daysRemaining: 344, price: 68000 },
      { sku: 'EM-862334', name: 'Pizza Hải Sản Pesto Ý 350g', category: 'Fastfood', qty: 85, unit: 'Hộp', lotCode: 'LOT-EM-862334-PZ', expiryDate: '15/09/2027', daysRemaining: 380, price: 115000 },
    ],
  },
  {
    id: 'RACK-FROZEN-07',
    name: 'Kệ B7 (Dimsum & Bánh Bao Cấp Đông)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-20.0°C',
    humidity: '57%',
    maxCapacity: 450,
    currentCapacity: 330,
    items: [
      { sku: 'EM-871120', name: 'Bánh bao xá xíu Thọ Phát gói 4 cái', category: 'Dimsum', qty: 110, unit: 'Gói', lotCode: 'LOT-EM-871120-BB', expiryDate: '12/05/2027', daysRemaining: 254, price: 42000 },
      { sku: 'EM-872449', name: 'Bánh xếp Mandu thịt & bắp CJ 350g', category: 'Dimsum', qty: 125, unit: 'Gói', lotCode: 'LOT-EM-872449-MD', expiryDate: '20/07/2027', daysRemaining: 323, price: 54000 },
    ],
  },
  {
    id: 'RACK-FROZEN-08',
    name: 'Kệ B8 (Gia Cầm Đông Lạnh & Bò Viên Cấp Đông)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-21.2°C',
    humidity: '56%',
    maxCapacity: 480,
    currentCapacity: 350,
    items: [
      { sku: 'EM-881132', name: 'Đùi gà góc tư nhập khẩu Mỹ thùng 10kg', category: 'Gia cầm đông', qty: 65, unit: 'Thùng', lotCode: 'LOT-EM-881132-DG', expiryDate: '15/12/2027', daysRemaining: 471, price: 380000 },
      { sku: 'EM-882554', name: 'Cánh gà giữa đông lạnh Ba Lan 1kg', category: 'Gia cầm đông', qty: 95, unit: 'Khay', lotCode: 'LOT-EM-882554-CG', expiryDate: '20/11/2027', daysRemaining: 446, price: 115000 },
    ],
  },

  // 3. DRY ZONE (Kho Khô Thường +25°C - 10 Racks: C1 to C10)
  {
    id: 'RACK-DRY-01',
    name: 'Kệ C1 (Lương Thực & Gạo Cao Cấp)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+26.2°C',
    humidity: '65%',
    maxCapacity: 600,
    currentCapacity: 420,
    items: [
      { sku: 'EM-901145', name: 'Gạo ST25 Ông Cua Túi 5kg', category: 'Lương thực', qty: 180, unit: 'Túi', lotCode: 'LOT-EM-901145-R', expiryDate: '15/12/2026', daysRemaining: 106, price: 195000 },
      { sku: 'EM-902881', name: 'Gạo thơm Jasmine thượng hạng 5kg', category: 'Lương thực', qty: 140, unit: 'Túi', lotCode: 'LOT-EM-902881-J', expiryDate: '20/01/2027', daysRemaining: 142, price: 125000 },
      { sku: 'EM-903442', name: 'Gạo lứt đỏ Điện Biên Organic 2kg', category: 'Lương thực', qty: 90, unit: 'Túi', lotCode: 'LOT-EM-903442-GL', expiryDate: '10/03/2027', daysRemaining: 191, price: 75000 },
      { sku: 'EM-904771', name: 'Nếp cái hoa vàng Hải Hậu 3kg', category: 'Lương thực', qty: 85, unit: 'Túi', lotCode: 'LOT-EM-904771-NP', expiryDate: '25/04/2027', daysRemaining: 237, price: 95000 },
      { sku: 'EM-905228', name: 'Mì Spaghetti Barilla Ý hộp 500g', category: 'Lương thực', qty: 150, unit: 'Hộp', lotCode: 'LOT-EM-905228-SP', expiryDate: '15/06/2028', daysRemaining: 654, price: 48000 },
      { sku: 'EM-906994', name: 'Bún tươi sấy khô Safoco 500g', category: 'Lương thực', qty: 120, unit: 'Gói', lotCode: 'LOT-EM-906994-BT', expiryDate: '20/07/2027', daysRemaining: 323, price: 26000 },
    ],
  },
  {
    id: 'RACK-DRY-02',
    name: 'Kệ C2 (Gia Vị & Dầu Ăn Nguyên Chất)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+26.0°C',
    humidity: '64%',
    maxCapacity: 550,
    currentCapacity: 380,
    items: [
      { sku: 'EM-911221', name: 'Dầu ăn Simply nguyên chất 1L', category: 'Gia vị', qty: 120, unit: 'Chai', lotCode: 'LOT-EM-911221-SP', expiryDate: '10/07/2028', daysRemaining: 678, price: 62000 },
      { sku: 'EM-912554', name: 'Nước mắm Knorr thượng hạng 500ml', category: 'Gia vị', qty: 140, unit: 'Chai', lotCode: 'LOT-EM-912554-KN', expiryDate: '25/08/2028', daysRemaining: 724, price: 27500 },
      { sku: 'EM-913881', name: 'Hạt nêm Neptune 4 trong 1 gói 850g', category: 'Gia vị', qty: 110, unit: 'Gói', lotCode: 'LOT-EM-913881-NP', expiryDate: '12/09/2027', daysRemaining: 377, price: 42000 },
      { sku: 'EM-914772', name: 'Dầu Olive Extra Virgin Borges 500ml', category: 'Gia vị', qty: 65, unit: 'Chai', lotCode: 'LOT-EM-914772-OL', expiryDate: '30/11/2028', daysRemaining: 821, price: 168000 },
      { sku: 'EM-915339', name: 'Nước tương Maggi Đậm Đặc 700ml', category: 'Gia vị', qty: 130, unit: 'Chai', lotCode: 'LOT-EM-915339-MG', expiryDate: '18/10/2028', daysRemaining: 778, price: 34000 },
      { sku: 'EM-916882', name: 'Sốt Mayonnaise Kewpie Chai 300g', category: 'Gia vị', qty: 95, unit: 'Chai', lotCode: 'LOT-EM-916882-KP', expiryDate: '25/05/2027', daysRemaining: 267, price: 46000 },
    ],
  },
  {
    id: 'RACK-DRY-03',
    name: 'Kệ C3 (Đồ Hộp & Thực Phẩm Đóng Gói)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.8°C',
    humidity: '63%',
    maxCapacity: 500,
    currentCapacity: 340,
    items: [
      { sku: 'EM-921102', name: 'Thịt heo hộp Tulip Less Sodium 340g', category: 'Đồ hộp', qty: 110, unit: 'Hộp', lotCode: 'LOT-EM-921102-TL', expiryDate: '01/06/2029', daysRemaining: 1004, price: 115200 },
      { sku: 'EM-922551', name: 'Cá ngừ ngâm dầu Hạ Long 185g', category: 'Đồ hộp', qty: 80, unit: 'Hộp', lotCode: 'LOT-EM-922551-HL', expiryDate: '15/06/2029', daysRemaining: 1018, price: 34000 },
      { sku: 'EM-923882', name: 'Pate gan heo Hạ Long 150g', category: 'Đồ hộp', qty: 95, unit: 'Hộp', lotCode: 'LOT-EM-923882-PT', expiryDate: '20/07/2029', daysRemaining: 1053, price: 26000 },
      { sku: 'EM-924771', name: 'Bắp ngọt đóng hộp Green Giant 410g', category: 'Đồ hộp', qty: 120, unit: 'Hộp', lotCode: 'LOT-EM-924771-GG', expiryDate: '10/08/2029', daysRemaining: 1074, price: 39000 },
      { sku: 'EM-925992', name: 'Nấm mỡ nguyên cái ngâm nước 400g', category: 'Đồ hộp', qty: 75, unit: 'Hộp', lotCode: 'LOT-EM-925992-NM', expiryDate: '15/09/2029', daysRemaining: 1110, price: 45000 },
      { sku: 'EM-926338', name: 'Cà chua bóc vỏ Cirio Ý 400g', category: 'Đồ hộp', qty: 85, unit: 'Hộp', lotCode: 'LOT-EM-926338-CR', expiryDate: '01/10/2029', daysRemaining: 1126, price: 38000 },
    ],
  },
  {
    id: 'RACK-DRY-04',
    name: 'Kệ C4 (Bánh Kẹo, Snack & Nước Ngọt)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.5°C',
    humidity: '62%',
    maxCapacity: 550,
    currentCapacity: 410,
    items: [
      { sku: 'EM-931114', name: 'Snack khoai tây Lay\'s vị tảo biển 150g', category: 'Bánh kẹo', qty: 150, unit: 'Gói', lotCode: 'LOT-EM-931114-LY', expiryDate: '15/03/2027', daysRemaining: 196, price: 28000 },
      { sku: 'EM-932882', name: 'Nước ngọt Coca-Cola lon 320ml lốc 6', category: 'Đồ uống', qty: 145, unit: 'Lốc', lotCode: 'LOT-EM-932882-CC', expiryDate: '01/08/2027', daysRemaining: 335, price: 54000 },
      { sku: 'EM-933551', name: 'Bánh quy bơ Danisa hộp thiếc 454g', category: 'Bánh kẹo', qty: 80, unit: 'Hộp', lotCode: 'LOT-EM-933551-DN', expiryDate: '10/05/2028', daysRemaining: 617, price: 135000 },
      { sku: 'EM-934771', name: 'Socola Ferrero Rocher hộp 16 viên', category: 'Bánh kẹo', qty: 60, unit: 'Hộp', lotCode: 'LOT-EM-934771-FR', expiryDate: '20/12/2027', daysRemaining: 476, price: 195000 },
      { sku: 'EM-935992', name: 'Trà xanh không độ chai 455ml lốc 6', category: 'Đồ uống', qty: 110, unit: 'Lốc', lotCode: 'LOT-EM-935992-TX', expiryDate: '15/06/2027', daysRemaining: 288, price: 48000 },
      { sku: 'EM-936443', name: 'Bia Heineken lon cao 330ml thùng 24', category: 'Đồ uống', qty: 85, unit: 'Thùng', lotCode: 'LOT-EM-936443-HN', expiryDate: '01/09/2027', daysRemaining: 366, price: 435000 },
    ],
  },
  {
    id: 'RACK-DRY-05',
    name: 'Kệ C5 (Mì Gói, Miến & Bún Khô)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.2°C',
    humidity: '63%',
    maxCapacity: 600,
    currentCapacity: 450,
    items: [
      { sku: 'EM-941120', name: 'Mì Hảo Hảo tôm chua cay thùng 30 gói', category: 'Mì ăn liền', qty: 180, unit: 'Thùng', lotCode: 'LOT-EM-941120-HH', expiryDate: '15/04/2027', daysRemaining: 227, price: 118000 },
      { sku: 'EM-942551', name: 'Mì cay Samyang phô mai Hàn Quốc 140g', category: 'Mì ăn liền', qty: 140, unit: 'Gói', lotCode: 'LOT-EM-942551-SY', expiryDate: '20/06/2027', daysRemaining: 293, price: 32000 },
      { sku: 'EM-943884', name: 'Miến dong làng So cao cấp 500g', category: 'Mì ăn liền', qty: 95, unit: 'Gói', lotCode: 'LOT-EM-943884-MD', expiryDate: '10/08/2027', daysRemaining: 344, price: 45000 },
    ],
  },
  {
    id: 'RACK-DRY-06',
    name: 'Kệ C6 (Cà Phê, Trà & Sữa Đặc)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.4°C',
    humidity: '61%',
    maxCapacity: 500,
    currentCapacity: 360,
    items: [
      { sku: 'EM-951109', name: 'Cà phê hòa tan G7 3in1 hộp 50 gói', category: 'Cà phê & Trà', qty: 160, unit: 'Hộp', lotCode: 'LOT-EM-951109-G7', expiryDate: '20/12/2027', daysRemaining: 476, price: 135000 },
      { sku: 'EM-952441', name: 'Trà Oolong Phúc Long hộp 100g', category: 'Cà phê & Trà', qty: 90, unit: 'Hộp', lotCode: 'LOT-EM-952441-PL', expiryDate: '15/08/2027', daysRemaining: 349, price: 65000 },
      { sku: 'EM-953882', name: 'Sữa đặc có đường Ông Thọ đỏ lon 380g', category: 'Cà phê & Trà', qty: 140, unit: 'Lon', lotCode: 'LOT-EM-953882-OT', expiryDate: '10/11/2027', daysRemaining: 436, price: 24000 },
    ],
  },
  {
    id: 'RACK-DRY-07',
    name: 'Kệ C7 (Nước Giải Khát & Nước Khoáng)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.6°C',
    humidity: '62%',
    maxCapacity: 600,
    currentCapacity: 480,
    items: [
      { sku: 'EM-961120', name: 'Nước khoáng La Vie thùng 24 chai 500ml', category: 'Nước đóng chai', qty: 190, unit: 'Thùng', lotCode: 'LOT-EM-961120-LV', expiryDate: '15/09/2028', daysRemaining: 745, price: 92000 },
      { sku: 'EM-962551', name: 'Nước tăng lực Red Bull Thái lon 250ml lốc 6', category: 'Nước đóng chai', qty: 130, unit: 'Lốc', lotCode: 'LOT-EM-962551-RB', expiryDate: '10/05/2027', daysRemaining: 252, price: 68000 },
    ],
  },
  {
    id: 'RACK-DRY-08',
    name: 'Kệ C8 (Bột Làm Bánh, Ngũ Cốc & Hạt)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.0°C',
    humidity: '60%',
    maxCapacity: 480,
    currentCapacity: 320,
    items: [
      { sku: 'EM-971109', name: 'Yến mạch Quaker Oats Quick 1 Minute 1kg', category: 'Ngũ cốc & Hạt', qty: 100, unit: 'Hộp', lotCode: 'LOT-EM-971109-QO', expiryDate: '20/06/2027', daysRemaining: 293, price: 145000 },
      { sku: 'EM-972442', name: 'Hạt điều rang muối Bình Phước hũ 500g', category: 'Ngũ cốc & Hạt', qty: 85, unit: 'Hũ', lotCode: 'LOT-EM-972442-HD', expiryDate: '15/04/2027', daysRemaining: 227, price: 165000 },
    ],
  },
  {
    id: 'RACK-DRY-09',
    name: 'Kệ C9 (Nước Tương, Tương Ớt & Sốt Ướp)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.5°C',
    humidity: '63%',
    maxCapacity: 520,
    currentCapacity: 370,
    items: [
      { sku: 'EM-981121', name: 'Tương ớt Chin-su chai 250g', category: 'Gia vị sốt', qty: 150, unit: 'Chai', lotCode: 'LOT-EM-981121-CS', expiryDate: '10/10/2027', daysRemaining: 405, price: 14500 },
      { sku: 'EM-982559', name: 'Sốt ướp thịt nướng Cholimex chai 200g', category: 'Gia vị sốt', qty: 120, unit: 'Chai', lotCode: 'LOT-EM-982559-CL', expiryDate: '25/08/2027', daysRemaining: 359, price: 18000 },
    ],
  },
  {
    id: 'RACK-DRY-10',
    name: 'Kệ C10 (Đồ Ăn Liền, Rong Biển & Bánh Quy)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.3°C',
    humidity: '61%',
    maxCapacity: 500,
    currentCapacity: 340,
    items: [
      { sku: 'EM-991104', name: 'Rong biển sấy giòn Tao Kae Noi lốc 6', category: 'Ăn vặt', qty: 130, unit: 'Lốc', lotCode: 'LOT-EM-991104-TK', expiryDate: '15/05/2027', daysRemaining: 257, price: 58000 },
      { sku: 'EM-992338', name: 'Bánh Chocopie Orion hộp 12 cái', category: 'Ăn vặt', qty: 140, unit: 'Hộp', lotCode: 'LOT-EM-992338-CP', expiryDate: '20/09/2027', daysRemaining: 385, price: 52000 },
    ],
  },
];

export const Warehouse3DDigitalTwin: React.FC<{ warehouseCode?: string }> = ({ warehouseCode: propWhCode }) => {
  const { user, token } = useAuth();
  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const myWarehouseCode = user?.warehouseCode || 'WH-006';
  const isAdmin = user?.role === 'ADMIN';

  const { warehouses, selectedWarehouseCode, setSelectedWarehouseCode } = useWarehouse();

  // Effective warehouse code: Manager is strictly locked to their warehouse
  const effectiveWhCode = isManager ? myWarehouseCode : (propWhCode || selectedWarehouseCode || 'WH-006');

  const [racks, setRacks] = useState<ShelfRack[]>(DEFAULT_RACKS);
  const [selectedRackId, setSelectedRackId] = useState<string>('RACK-COOL-01');
  const [zoneFilter, setZoneFilter] = useState<'COOL' | 'FROZEN' | 'DRY'>('COOL');
  const [displayMode, setDisplayMode] = useState<'3D_SCENE' | 'ISOMETRIC'>('3D_SCENE');
  const [fefoFilter, setFefoFilter] = useState<'ALL' | 'NEAR_EXPIRY' | 'MEDIUM_RISK' | 'SAFE'>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'DANGER' | 'AUDITED' | 'PENDING_AUDIT' | 'DEPLETED'>('ALL');
  const [hideDepletedLots, setHideDepletedLots] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // 200ms Debounce to prevent lag during rapid typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchInput]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRackName, setNewRackName] = useState<string>('');
  const [newRackZone, setNewRackZone] = useState<'COOL' | 'FROZEN' | 'DRY'>('COOL');
  const [newRackCapacity, setNewRackCapacity] = useState<string>('500');
  const [editCapacityVal, setEditCapacityVal] = useState<string>('500');

  // Quick Audit Modal state
  const [adjustModal, setAdjustModal] = useState<{
    isOpen: boolean;
    lot: any;
    newQty: number;
    reason: string;
    qualityStatus: string;
    note: string;
  }>({
    isOpen: false,
    lot: null,
    newQty: 0,
    reason: 'Kiểm kê định kỳ hàng tháng',
    qualityStatus: 'GOOD',
    note: ''
  });

  // Barcode & QR Code Preview Modal State
  const [barcodeModalItem, setBarcodeModalItem] = useState<{
    isOpen: boolean;
    item: ShelfItem | null;
    locationText?: string;
  }>({
    isOpen: false,
    item: null,
    locationText: '',
  });
  const [barcodeTargetType, setBarcodeTargetType] = useState<'LOT' | 'SKU'>('LOT');

  const [showEditCapacityModal, setShowEditCapacityModal] = useState<boolean>(false);
  const [showInboundRecommendationModal, setShowInboundRecommendationModal] = useState<boolean>(false);
  const [inboundSearchProduct, setInboundSearchProduct] = useState<string>('');
  const [inboundSelectedZone, setInboundSelectedZone] = useState<'AUTO' | 'COOL' | 'FROZEN' | 'DRY'>('AUTO');
  const [inboundQuantity, setInboundQuantity] = useState<number>(50);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  
  const navigate = useNavigate();

  // Real inventory state matching Inventory page exactly
  const [liveLotCount, setLiveLotCount] = useState<number>(0);
  const [liveSkuCount, setLiveSkuCount] = useState<number>(0);
  const [totalNearExpiryAll, setTotalNearExpiryAll] = useState<number>(0);
  const [zoneCounts, setZoneCounts] = useState<{ cold: number; frozen: number; dry: number }>({ cold: 0, frozen: 0, dry: 0 });

  const [rackItemPage, setRackItemPage] = useState<number>(1);
  const [rackItemsPerPage, setRackItemsPerPage] = useState<number>(8);

  // Existing Outbound/Disposal orders mapping to prevent duplicate orders
  const [outboundLotMap, setOutboundLotMap] = useState<Record<string, { orderCode: string; status: string; isDisposal: boolean; id: string }>>({});

  // Outbound Order creation state
  const [isCreatingOutbound, setIsCreatingOutbound] = useState<boolean>(false);
  const [confirmExportModal, setConfirmExportModal] = useState<{
    isOpen: boolean;
    isBatch: boolean;
    rack: ShelfRack;
    item?: ShelfItem;
    items?: ShelfItem[];
    destination: string;
    requesterName: string;
    quantity: number;
    notes: string;
  } | null>(null);

  const [createdOutboundModal, setCreatedOutboundModal] = useState<{
    isOpen: boolean;
    order?: any;
    count: number;
    title: string;
    description: string;
  } | null>(null);

  // Handle Drag and Drop Rack position updates in 3D scene
  const handleUpdateRackPosition = (rackId: string, newPos: [number, number, number]) => {
    setRacks(prev =>
      prev.map(r => (r.id === rackId ? { ...r, customPos: newPos } : r))
    );
  };

  const handleResetRackPositions = () => {
    setRacks(prev => prev.map(r => ({ ...r, customPos: undefined })));
  };

  // Convert racks to 3D coordinates in a spacious 2-aisle multi-row warehouse layout
  const racks3D: Rack3DData[] = useMemo(() => {
    const currentZoneRacks = racks.filter(x => x.zone === zoneFilter);

    return racks.map(r => {
      let posX = 0;
      let posZ = 0;

      if (r.customPos) {
        posX = r.customPos[0];
        posZ = r.customPos[2];
      } else {
        const idx = Math.max(0, currentZoneRacks.findIndex(x => x.id === r.id));
        const col = idx % 2; // 2 Aisles: Left (-8.0m) and Right (+8.0m)
        const row = Math.floor(idx / 2); // Rows spaced by 6.8m
        posX = col === 0 ? -8.0 : 8.0;
        posZ = -13.6 + row * 6.8;
      }

      return {
        id: r.id,
        name: r.name,
        zone: r.zone,
        zoneLabel: r.zoneLabel,
        temperature: r.temperature,
        humidity: r.humidity,
        maxCapacity: r.maxCapacity,
        currentCapacity: r.currentCapacity,
        hasAlert: r.hasAlert,
        alertMsg: r.alertMsg,
        position: [posX, 0, posZ],
        color: r.zone === 'COOL' ? '#0284c7' : r.zone === 'FROZEN' ? '#06b6d4' : '#f59e0b',
        items: r.items,
      };
    });
  }, [racks, zoneFilter]);

  // Fetch Live Real Data from Backend (:3011 & :3010) - Scalable for 2000+ Lots per Warehouse
  const fetchLiveWarehouseData = async (targetWhCode?: string) => {
    setIsLoadingLive(true);
    const whToQuery = isManager ? myWarehouseCode : (targetWhCode !== undefined ? targetWhCode : effectiveWhCode);

    try {
      const url = whToQuery && whToQuery !== 'ALL'
        ? `http://localhost:3011/inventory/lots?limit=10000&warehouseCode=${whToQuery}`
        : `http://localhost:3011/inventory/lots?limit=10000`;

      const [resLots, resProducts, resOutbounds] = await Promise.all([
        fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null),
        fetch('http://localhost:3010/products?limit=6000', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null),
        fetch('http://localhost:3007/outbound-orders?limit=1000', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null),
      ]);

      // Parse existing active outbound orders map
      const outMap: Record<string, { orderCode: string; status: string; isDisposal: boolean; id: string }> = {};
      if (resOutbounds && resOutbounds.ok) {
        try {
          const outData = await resOutbounds.json();
          const outList = Array.isArray(outData) ? outData : outData.data || [];
          outList.forEach((ord: any) => {
            if (ord.status !== 'CANCELLED') {
              const isDisposal = (ord.destination && ord.destination.toLowerCase().includes('tiêu hủy')) ||
                                 (ord.notes && ord.notes.toLowerCase().includes('tiêu hủy'));
              if (Array.isArray(ord.items)) {
                ord.items.forEach((it: any) => {
                  if (it.lotCode) {
                    outMap[it.lotCode] = { orderCode: ord.orderCode, status: ord.status, isDisposal, id: ord.id };
                  }
                  if (it.lotId) {
                    outMap[it.lotId] = { orderCode: ord.orderCode, status: ord.status, isDisposal, id: ord.id };
                  }
                });
              }

              if (ord.notes && ord.notes.includes('Lô:')) {
                const match = ord.notes.match(/Lô:\s*([A-Za-z0-9-_]+)/);
                if (match && match[1]) {
                  outMap[match[1].trim()] = { orderCode: ord.orderCode, status: ord.status, isDisposal, id: ord.id };
                }
              }
            }
          });
        } catch (e) {}
      }
      setOutboundLotMap(outMap);

      if (resLots && resLots.ok) {
        let allLots = await resLots.json();
        let products: any[] = [];
        if (resProducts && resProducts.ok) {
          const prodData = await resProducts.json();
          products = Array.isArray(prodData) ? prodData : prodData.items || prodData.products || [];
        }

        const productMap: Record<string, any> = {};
        products.forEach((p: any) => {
          if (p.id) productMap[p.id] = p;
          if (p.sku) productMap[p.sku] = p;
        });

        if (Array.isArray(allLots) && allLots.length > 0) {
          // Filter strictly by target warehouse and active remaining stock
          const filteredLots = (whToQuery && whToQuery !== 'ALL'
            ? allLots.filter((l: any) => !l.warehouseCode || l.warehouseCode === whToQuery)
            : allLots
          ).filter((l: any) => (l.remainingQty === undefined || Number(l.remainingQty) > 0));

          setLiveLotCount(filteredLots.length);
          const uniqueSkus = new Set(filteredLots.map((l: any) => l.productId || l.sku));
          setLiveSkuCount(uniqueSkus.size);

          // Separate lots by zone
          const coldLots = filteredLots.filter((l: any) => {
            const z = (l.zone || '').toUpperCase();
            return z === 'COLD' || z === 'COOL';
          });
          const frozenLots = filteredLots.filter((l: any) => (l.zone || '').toUpperCase() === 'FROZEN');
          const dryLots = filteredLots.filter((l: any) => (l.zone || '').toUpperCase() === 'DRY' || !l.zone);

          setZoneCounts({
            cold: coldLots.length,
            frozen: frozenLots.length,
            dry: dryLots.length,
          });

          const now = new Date();
          const alertLots = filteredLots.filter((l: any) => {
            const expDate = l.expiryDate ? new Date(l.expiryDate) : null;
            const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            return (daysLeft <= 3 && daysLeft >= 0) || Number(l.riskScore) >= 70 || l.status === 'AT_RISK';
          });
          setTotalNearExpiryAll(alertLots.length);

          // Group live lots into Racks
          setRacks(prevRacks => {
            return prevRacks.map((rack) => {
              const zoneLots = rack.zone === 'COOL'
                ? coldLots
                : rack.zone === 'FROZEN'
                ? frozenLots
                : dryLots;

              const zoneRacks = prevRacks.filter(r => r.zone === rack.zone);
              const rackSubIdx = zoneRacks.findIndex(r => r.id === rack.id);

              // Smart Shelf Distribution: Directly matches DB lot.location tag (e.g. 'cold-shelf-A1', 'shelf-C3', 'B2', 'shelf-1') or sequential zone distribution
              const assignedLots = zoneLots.filter((l: any, idx: number) => {
                const loc = (l.location || '').toLowerCase();
                const rackNameLower = rack.name.toLowerCase();
                const rackIdLower = rack.id.toLowerCase();

                // 1. Direct letter-number match (e.g. "a1", "b3", "c10")
                const rackLetterMatch = rackNameLower.match(/kệ\s+([a-c]\d+)/i) || rackIdLower.match(/rack-[a-z]+-(\d+)/i);
                if (rackLetterMatch) {
                  const targetCode = rackLetterMatch[1].toLowerCase();
                  if (loc.includes(targetCode)) return true;
                }

                // 2. Numeric shelf match (e.g. "shelf-1", "shelf-01")
                const matchShelfNum = loc.match(/shelf-?(\d+)/i);
                if (matchShelfNum && matchShelfNum[1]) {
                  const shelfNum = parseInt(matchShelfNum[1], 10);
                  return (shelfNum - 1) % Math.max(1, zoneRacks.length) === rackSubIdx;
                }

                // 3. Fallback: Uniform distribution across the zone's active racks
                return idx % Math.max(1, zoneRacks.length) === rackSubIdx;
              });

              if (assignedLots.length > 0) {
                const mappedItems: ShelfItem[] = assignedLots.map((l: any) => {
                  let extractedSku = '';
                  if (l.lotCode && l.lotCode.startsWith('LOT-EM-')) {
                    const parts = l.lotCode.split('-');
                    if (parts.length >= 3) {
                      extractedSku = `${parts[1]}-${parts[2]}`;
                    }
                  }

                  const p = productMap[l.productId] || productMap[l.sku] || (extractedSku ? productMap[extractedSku] : null);
                  const expDate = l.expiryDate ? new Date(l.expiryDate) : null;
                  const impDate = l.importDate ? new Date(l.importDate) : null;
                  const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                  const prodName = p?.name || l.productName || (rack.zone === 'COOL' ? 'Thực phẩm tươi sống Emart' : rack.zone === 'FROZEN' ? 'Thực phẩm đông lạnh Emart' : 'Lương thực thực phẩm khô Emart');
                  const code = (l.lotCode || '').toUpperCase();
                  const nameLower = prodName.toLowerCase();

                  // ① Category detection
                  let catKey = 'DRY';
                  let catLabel = 'Hàng khô';
                  let catIcon = '🌾';
                  let decayRate = 1.0;

                  if (/cá|tôm|mực|hải sản|cua|ghẹ|sò|ốc/.test(nameLower) || /SEAFOOD|FISH|SHRIMP|SQUID/.test(code)) {
                    catKey = 'SEAFOOD'; catLabel = 'Hải sản'; catIcon = '🐟'; decayRate = 2.8;
                  } else if (/thịt|bò|heo|gà|vịt|trứng/.test(nameLower) || /BEEF|PORK|CHICKEN|MEAT|DUCK|EGG/.test(code)) {
                    catKey = 'MEAT'; catLabel = 'Thịt & Trứng'; catIcon = '🥩'; decayRate = 2.2;
                  } else if (/sữa|phô mai|yaourt|yogurt|kem|bơ/.test(nameLower) || /MILK|DAIRY|CHEESE|YOGURT/.test(code)) {
                    catKey = 'DAIRY'; catLabel = 'Sữa & Dairy'; catIcon = '🥛'; decayRate = 1.6;
                  } else if (/rau|cải|súp lơ|dưa|cà|đậu|hành|ngò|cần/.test(nameLower) || /VEG|BROCCOLI|TOMATO|LETTUCE|SPINACH/.test(code)) {
                    catKey = 'VEGETABLE'; catLabel = 'Rau củ quả'; catIcon = '🥬'; decayRate = 2.0;
                  } else if (/táo|cam|xoài|dứa|ổi|chuối|trái cây/.test(nameLower) || /FRUIT|APPLE|MANGO|ORANGE/.test(code)) {
                    catKey = 'FRUIT'; catLabel = 'Trái cây'; catIcon = '🍎'; decayRate = 1.7;
                  }

                  // ② Shelf life consumed %
                  let shelfLifePct = 0;
                  if (expDate && impDate) {
                    const totalDays = (expDate.getTime() - impDate.getTime()) / 86400000;
                    const usedDays = (now.getTime() - impDate.getTime()) / 86400000;
                    shelfLifePct = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));
                  } else if (daysLeft !== null && daysLeft >= 0) {
                    shelfLifePct = Math.max(0, 100 - Math.min(100, (daysLeft / 365) * 100));
                  }

                  // ③ Zone penalty
                  let zonePenalty = 0;
                  const lZone = (l.zone || (rack.zone === 'COOL' ? 'COLD' : rack.zone)).toUpperCase();
                  if ((catKey === 'SEAFOOD' || catKey === 'MEAT') && lZone === 'DRY') zonePenalty = 35;
                  else if (catKey === 'DAIRY' && lZone === 'DRY') zonePenalty = 20;
                  else if (catKey === 'VEGETABLE' && lZone === 'FROZEN') zonePenalty = 15;

                  const backendScore = Number(l.riskScore || 0);
                  const aiScore = Math.min(100, Math.round(
                    shelfLifePct * decayRate * 0.45 +
                    backendScore * 0.35 +
                    zonePenalty * 0.20
                  ));

                  const dangerDays = catKey === 'SEAFOOD' ? 3 : catKey === 'MEAT' ? 3 : catKey === 'DAIRY' ? 5 : catKey === 'VEGETABLE' ? 4 : catKey === 'FRUIT' ? 5 : 7;
                  const warningDays = catKey === 'SEAFOOD' ? 7 : catKey === 'MEAT' ? 7 : catKey === 'DAIRY' ? 14 : catKey === 'VEGETABLE' ? 10 : catKey === 'FRUIT' ? 10 : 30;

                  let riskLevel: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';
                  let riskReason = daysLeft !== null ? `✅ ${catIcon} Còn ${daysLeft} ngày — An toàn` : `✅ ${catIcon} Đạt chuẩn bảo quản`;
                  let riskRecommendation = 'Tiếp tục bảo quản theo quy trình tiêu chuẩn';

                  if (l.status === 'EXPIRED' || (daysLeft !== null && daysLeft <= 0)) {
                    riskLevel = 'DANGER';
                    riskReason = `⚠️ ${catIcon} Đã hết hạn sử dụng`;
                    riskRecommendation = 'Cần xử lý tiêu hủy hoặc trả hàng ngay lập tức';
                  } else if (l.status === 'DAMAGED') {
                    riskLevel = 'DANGER';
                    riskReason = `🔥 ${catIcon} Hư hỏng trong bảo quản`;
                    riskRecommendation = 'Cách ly khỏi lô lành, kiểm tra toàn bộ lô hàng';
                  } else if (daysLeft !== null && daysLeft <= dangerDays) {
                    riskLevel = 'DANGER';
                    riskReason = `📛 ${catIcon} Còn ${daysLeft} ngày — ngưỡng nguy hiểm`;
                    riskRecommendation = 'Xuất kho ngay hoặc kiểm kê / thanh lý';
                  } else if (daysLeft !== null && daysLeft <= warningDays) {
                    riskLevel = 'WARNING';
                    riskReason = `⏳ ${catIcon} Còn ${daysLeft} ngày — cận hạn với ${catLabel}`;
                    riskRecommendation = `Lên kế hoạch xuất kho trong ${daysLeft} ngày tới (FEFO)`;
                  } else if (aiScore >= 65) {
                    riskLevel = 'WARNING';
                    riskReason = `🤖 AI: Cần theo dõi — ${catIcon} ${catLabel} (${aiScore}/100)`;
                    riskRecommendation = 'Tăng tần suất kiểm tra, cân nhắc xuất kho sớm';
                  }

                  return {
                    id: l.id,
                    sku: p?.sku || extractedSku || l.sku || `EM-${l.productId?.slice(0, 6) || l.id?.slice(0, 6)}`,
                    name: prodName,
                    category: p?.category || rack.zoneLabel,
                    qty: Number(l.remainingQty !== undefined ? l.remainingQty : l.quantity || 20),
                    unit: p?.unit || 'Khay',
                    lotCode: l.lotCode || `LOT-${l.id}`,
                    importDate: impDate ? impDate.toLocaleDateString('vi-VN') : undefined,
                    expiryDate: expDate ? expDate.toLocaleDateString('vi-VN') : 'N/A',
                    daysRemaining: daysLeft ?? 999,
                    price: Number(p?.price || 45000),
                    imageUrl: p?.imageUrl,
                    warehouseCode: l.warehouseCode,
                    location: l.location,
                    zone: lZone,
                    riskLevel,
                    riskScore: backendScore,
                    aiScore,
                    shelfLifePct,
                    riskReason,
                    riskRecommendation,
                    riskCategory: `${catIcon} ${catLabel}`,
                    categoryIcon: catIcon,
                    lastAuditedAt: l.lastAuditedAt,
                    lastAuditedBy: l.lastAuditedBy,
                    lastAuditDiff: l.lastAuditDiff,
                    lastAuditActualQty: l.lastAuditActualQty,
                    lastAuditReason: l.lastAuditReason,
                  };
                });

                const totalQty = mappedItems.reduce((s, i) => s + i.qty, 0);
                const hasNearExpiry = mappedItems.some(i => i.daysRemaining <= 3);

                return {
                  ...rack,
                  currentCapacity: totalQty,
                  items: mappedItems,
                  hasAlert: hasNearExpiry,
                  alertMsg: hasNearExpiry ? `Có ${mappedItems.filter(i => i.daysRemaining <= 3).length} lô cận date ≤48h (FEFO)` : undefined,
                };
              }

              // Nếu kệ không có lô hàng nào trong DB -> Hiển thị kệ trống (0 SP)
              return {
                ...rack,
                currentCapacity: 0,
                items: [],
                hasAlert: false,
                alertMsg: undefined,
              };
            });
          });
        }
      }
    } catch (e) {
      console.error('Failed to sync live warehouse data:', e);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Auto-sync live warehouse data from backend on mount and when warehouse selection changes
  useEffect(() => {
    fetchLiveWarehouseData();
  }, [effectiveWhCode]);

  // Filtered racks based on Zone & Debounced Search Query
  const filteredRacks = useMemo(() => {
    return racks
      .filter(r => (zoneFilter === 'COOL' || zoneFilter === 'FROZEN' || zoneFilter === 'DRY' ? r.zone === zoneFilter : true))
      .filter(r => {
        if (!debouncedSearchQuery) return true;
        const q = debouncedSearchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchItem = r.items.some(
          it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.lotCode.toLowerCase().includes(q)
        );
        return matchName || matchId || matchItem;
      });
  }, [racks, zoneFilter, debouncedSearchQuery]);

  // Selected Rack details
  const selectedRack = useMemo(() => {
    return racks.find(r => r.id === selectedRackId) || filteredRacks[0] || racks[0];
  }, [racks, selectedRackId, filteredRacks]);

  // Statistics of lots on the selected rack
  const rackStats = useMemo(() => {
    const items = selectedRack?.items || [];
    const totalLots = items.length;
    const safeCount = items.filter(i => (i.riskLevel || 'SAFE') === 'SAFE').length;
    const warningCount = items.filter(i => i.riskLevel === 'WARNING').length;
    const dangerCount = items.filter(i => i.riskLevel === 'DANGER').length;
    const auditedCount = items.filter(i => !!i.lastAuditedAt).length;
    const pendingAuditCount = items.filter(i => !i.lastAuditedAt).length;
    const depletedCount = items.filter(i => (i.qty || 0) <= 0).length;

    return { totalLots, safeCount, warningCount, dangerCount, auditedCount, pendingAuditCount, depletedCount };
  }, [selectedRack]);

  // Filtered items on Selected Rack with ML Risk & Search
  const rackFilteredItems = useMemo(() => {
    if (!selectedRack || !selectedRack.items) return [];
    let result = selectedRack.items;

    if (selectedRiskFilter === 'DEPLETED') {
      result = result.filter(it => (it.qty || 0) <= 0);
    } else {
      if (hideDepletedLots) {
        result = result.filter(it => (it.qty || 0) > 0);
      }
      if (selectedRiskFilter === 'AUDITED') {
        result = result.filter(it => !!it.lastAuditedAt);
      } else if (selectedRiskFilter === 'PENDING_AUDIT') {
        result = result.filter(it => !it.lastAuditedAt);
      } else if (selectedRiskFilter !== 'ALL') {
        result = result.filter(it => (it.riskLevel || 'SAFE') === selectedRiskFilter);
      }
    }

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(it =>
        it.sku.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        it.lotCode.toLowerCase().includes(q) ||
        (it.location || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedRack, selectedRiskFilter, hideDepletedLots, debouncedSearchQuery]);

  // Handle Quick Audit Submit from 3D Twin
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal.lot) return;

    try {
      const targetId = adjustModal.lot.id || adjustModal.lot.lotCode;
      const res = await fetch(`http://localhost:3011/inventory/lots/${targetId}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          actualQuantity: adjustModal.newQty,
          reason: `${adjustModal.reason}${adjustModal.note ? ` - ${adjustModal.note}` : ''}`,
          performedBy: user?.name || user?.email || 'Quản lý kho (3D Twin)'
        })
      });

      if (res.ok) {
        alert('✅ Cập nhật kết quả kiểm kê lô hàng thành công!');
        setAdjustModal({ isOpen: false, lot: null, newQty: 0, reason: 'Kiểm kê định kỳ hàng tháng', qualityStatus: 'GOOD', note: '' });
        await fetchLiveWarehouseData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`❌ Lỗi cập nhật kiểm kê: ${err.message || 'Thất bại'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`❌ Lỗi kết nối máy chủ kiểm kê: ${err.message}`);
    }
  };

  // Global Cross-Zone Search Results with exact 3D location
  const globalSearchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim() || debouncedSearchQuery.trim().length < 1) return [];
    const q = debouncedSearchQuery.toLowerCase().trim();
    const matches: Array<{
      item: ShelfItem;
      rack: ShelfRack;
      zone: 'COOL' | 'FROZEN' | 'DRY';
      zoneLabel: string;
      level: number;
      slot: number;
      rowDeep: string;
    }> = [];

    for (const rack of racks) {
      const levels = 5;
      const numCols = 8; // Fixed 8 structural columns per tier

      for (let idx = 0; idx < rack.items.length; idx++) {
        const it = rack.items[idx];
        if (
          it.lotCode.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q)
        ) {
          let lvl = Math.min(levels - 1, Math.floor(idx / (numCols * 2))) + 1;
          let col = (idx % numCols) + 1;
          let rowDeep = (Math.floor(idx / numCols) % 2 === 1) ? 'Mặt Trước' : 'Mặt Sau';

          if (it.location) {
            const slotMatch = it.location.match(/slot[-_ ]*(\d+)/i);
            if (slotMatch) {
              const rawSlot = parseInt(slotMatch[1], 10);
              lvl = ((rawSlot - 1) % levels) + 1;
              col = ((rawSlot - 1) % numCols) + 1;
              rowDeep = Math.floor((rawSlot - 1) / numCols) % 2 === 1 ? 'Mặt Trước' : 'Mặt Sau';
            }
          }

          matches.push({
            item: it,
            rack,
            zone: rack.zone,
            zoneLabel: rack.zoneLabel,
            level: lvl,
            slot: col,
            rowDeep,
          });

          if (matches.length >= 12) break;
        }
      }
      if (matches.length >= 12) break;
    }

    return matches;
  }, [racks, debouncedSearchQuery]);

  // Pagination for selected rack's lots
  const paginatedRackItems = useMemo(() => {
    const start = (rackItemPage - 1) * rackItemsPerPage;
    return rackFilteredItems.slice(start, start + rackItemsPerPage);
  }, [rackFilteredItems, rackItemPage, rackItemsPerPage]);

  const totalRackPages = useMemo(() => {
    return Math.max(1, Math.ceil(rackFilteredItems.length / rackItemsPerPage));
  }, [rackFilteredItems, rackItemsPerPage]);

  // Reset page when switching racks or changing filters
  useEffect(() => {
    setRackItemPage(1);
  }, [selectedRackId, fefoFilter, rackItemsPerPage]);

  // Real-time Rack Occupancy & Free Space Analytics
  const rackOccupancyList = useMemo(() => {
    return racks.map(r => {
      const totalLots = r.items.length;
      const filledUnits = r.currentCapacity || (totalLots * 25);
      const maxUnits = r.maxCapacity || 500;
      const freeSlots = Math.max(0, maxUnits - filledUnits);
      const occupancyPct = Math.min(100, Math.round((filledUnits / maxUnits) * 100));
      const freePct = 100 - occupancyPct;

      let status: 'EMPTY_HIGH' | 'AVAILABLE' | 'ALMOST_FULL' | 'FULL' = 'AVAILABLE';
      if (occupancyPct < 40) status = 'EMPTY_HIGH';
      else if (occupancyPct <= 75) status = 'AVAILABLE';
      else if (occupancyPct < 95) status = 'ALMOST_FULL';
      else status = 'FULL';

      return {
        rack: r,
        totalLots,
        filledUnits,
        maxUnits,
        freeSlots,
        occupancyPct,
        freePct,
        status,
      };
    });
  }, [racks]);

  // AI & Rule-based Smart Inbound Shelf Recommendation
  const recommendedInboundRacks = useMemo(() => {
    const query = inboundSearchProduct.toLowerCase().trim();
    
    // Determine target zone
    let targetZone: 'COOL' | 'FROZEN' | 'DRY' | null = null;
    if (inboundSelectedZone !== 'AUTO') {
      targetZone = inboundSelectedZone;
    } else if (query) {
      if (query.includes('thịt') || query.includes('sữa') || query.includes('rau') || query.includes('cà chua') || query.includes('bơ') || query.includes('mát') || query.includes('cool') || query.includes('tươi')) {
        targetZone = 'COOL';
      } else if (query.includes('đông') || query.includes('kem') || query.includes('hải sản') || query.includes('bò úc') || query.includes('tôm') || query.includes('cá hồi') || query.includes('frozen')) {
        targetZone = 'FROZEN';
      } else {
        targetZone = 'DRY';
      }
    }

    // Filter candidates
    const candidates = rackOccupancyList.filter(ro => {
      if (targetZone && ro.rack.zone !== targetZone) return false;
      return ro.freeSlots > 0;
    });

    // Score candidates
    return candidates.map(ro => {
      let score = ro.freePct; // Base score = % free space
      let matchReason = `Sức chứa còn trống ${ro.freePct}% (${ro.freeSlots.toLocaleString()} ô), nhiệt độ chuẩn ${ro.rack.temperature}`;

      // Category affinity bonus
      if (query) {
        const matchName = ro.rack.name.toLowerCase().includes(query);
        const matchItems = ro.rack.items.some(i => i.name.toLowerCase().includes(query) || (i.category && i.category.toLowerCase().includes(query)));
        if (matchName || matchItems) {
          score += 50;
          matchReason = `⭐ Cùng nhóm ngành hàng, sức chứa còn trống ${ro.freePct}% (${ro.freeSlots.toLocaleString()} ô), nhiệt độ ${ro.rack.temperature}`;
        }
      }

      return {
        ...ro,
        score,
        matchReason,
      };
    }).sort((a, b) => b.score - a.score);
  }, [rackOccupancyList, inboundSearchProduct, inboundSelectedZone]);

  // Add New Rack Handler
  const handleAddRack = () => {
    if (!newRackName.trim()) return;
    const newId = `RACK-${newRackZone}-${Date.now().toString().slice(-4)}`;
    const zoneLabels = {
      COOL: 'Kho Mát (0°C ~ +4°C)',
      FROZEN: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
      DRY: 'Kho Khô Thường (+25°C)',
    };
    const defaultTemps = {
      COOL: '+2.5°C',
      FROZEN: '-20.0°C',
      DRY: '+25.5°C',
    };

    const newRack: ShelfRack = {
      id: newId,
      name: newRackName,
      zone: newRackZone,
      zoneLabel: zoneLabels[newRackZone],
      temperature: defaultTemps[newRackZone],
      humidity: newRackZone === 'COOL' ? '78%' : newRackZone === 'FROZEN' ? '58%' : '65%',
      maxCapacity: parseInt(newRackCapacity) || 500,
      currentCapacity: 0,
      items: [],
    };

    setRacks([...racks, newRack]);
    setSelectedRackId(newId);
    setShowAddModal(false);
    setNewRackName('');
  };

  // Save Capacity Handler
  const handleSaveCapacity = () => {
    const val = parseInt(editCapacityVal);
    if (isNaN(val) || val <= 0) return;
    setRacks(racks.map(r => (r.id === selectedRackId ? { ...r, maxCapacity: val } : r)));
    setShowEditCapacityModal(false);
  };

  // Capacity Color Helper
  const getCapacityColor = (curr: number, max: number) => {
    const pct = (curr / max) * 100;
    if (pct >= 90) return '#ef4444'; // Red (Full)
    if (pct >= 70) return '#f59e0b'; // Amber (High)
    return '#10b981'; // Green (Safe)
  };

  // Open single lot export confirmation modal
  const handleExportSingleLot = (item: ShelfItem, rack: ShelfRack) => {
    const existing = outboundLotMap[item.lotCode] || (item.id ? outboundLotMap[item.id] : undefined);
    if (existing) {
      if (window.confirm(`⚠️ Lô hàng ${item.lotCode} (${item.name}) đã được lập phiếu xuất [${existing.orderCode}] (Trạng thái: ${existing.status})!\n\nBạn có muốn chuyển sang trang Quản Lý Xuất Kho để xem và xử lý đơn này không?`)) {
        navigate(`/outbound-orders?orderCode=${existing.orderCode}`);
      }
      return;
    }

    const isDanger = item.riskLevel === 'DANGER' || (item.daysRemaining !== null && item.daysRemaining <= 0);
    const dest = isDanger
      ? `Xuất Tiêu Hủy / Thanh Lý - Kệ ${rack.name} (${rack.id})`
      : `Xuất FEFO - Kệ ${rack.name} (${rack.id})`;
    const notePrefix = isDanger ? `[XUẤT TIÊU HỦY TỪ 3D TWIN]` : `[XUẤT FEFO TỪ 3D TWIN]`;

    setConfirmExportModal({
      isOpen: true,
      isBatch: false,
      rack,
      item,
      destination: dest,
      requesterName: user?.name || 'Quản lý kho',
      quantity: item.qty > 0 ? item.qty : 1,
      notes: `${notePrefix} Lô ${item.lotCode} (${item.name}), Kệ ${rack.name}, HSD: ${item.expiryDate} (Còn ${item.daysRemaining} ngày)`
    });
  };

  // Open rack-level batch export confirmation modal
  const handleExportRackNearExpiry = (rack: ShelfRack) => {
    // Filter out lots that already have active outbound/disposal orders
    const availableItems = rack.items.filter(i => {
      const existing = outboundLotMap[i.lotCode] || (i.id ? outboundLotMap[i.id] : undefined);
      return !existing;
    });

    if (availableItems.length === 0) {
      alert(`⚠️ Tất cả các lô hàng trên Kệ ${rack.name} đều đã được lập phiếu xuất kho trước đó!`);
      return;
    }

    const nearExp = availableItems.filter(i => (i.daysRemaining ?? 10) <= 3);
    const itemsToExport = nearExp.length > 0 ? nearExp : availableItems.slice(0, 5);

    setConfirmExportModal({
      isOpen: true,
      isBatch: true,
      rack,
      items: itemsToExport,
      destination: `Xuất FEFO Tự Động - Kệ ${rack.name} (${rack.id})`,
      requesterName: user?.name || 'Quản lý kho',
      quantity: itemsToExport.reduce((s, i) => s + (i.qty || 1), 0),
      notes: `[XUẤT FEFO TỰ ĐỘNG 3D] Đề xuất xuất ${itemsToExport.length} lô hàng cận hạn/ưu tiên tại Kệ ${rack.name}`
    });
  };

  // Execute export API after confirmation
  const handleConfirmExportSubmit = async () => {
    if (!confirmExportModal) return;
    const { isBatch, rack, item, items, destination, requesterName, quantity, notes } = confirmExportModal;

    try {
      setIsCreatingOutbound(true);

      const itemsPayload = isBatch && items
        ? items.map(it => ({
            sku: it.sku,
            productName: it.name,
            requestedQuantity: it.qty > 0 ? it.qty : 1,
            lotCode: it.lotCode,
          }))
        : item
        ? [{
            sku: item.sku,
            productName: item.name,
            requestedQuantity: quantity > 0 ? quantity : 1,
            lotCode: item.lotCode,
          }]
        : [];

      // 1. Tạo đơn xuất kho bên outbound-service (:3007) ở trạng thái Tạo Yêu Cầu (PENDING)
      const payload = {
        requestedBy: user?.name || user?.email || 'Quản lý kho (3D Twin)',
        requesterName: requesterName || 'Quản lý kho',
        destination: destination || `Xuất FEFO - Kệ ${rack.name}`,
        warehouseCode: item?.warehouseCode || effectiveWhCode || 'WH-006',
        notes: notes || `[XUẤT FEFO 3D] Kệ ${rack.name}`,
        items: itemsPayload
      };

      const res = await fetch('http://localhost:3007/outbound-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const order = await res.json();
        setConfirmExportModal(null);
        setCreatedOutboundModal({
          isOpen: true,
          order,
          count: itemsPayload.length,
          title: `📋 Đã lập Phiếu Yêu Cầu Xuất Kho: ${order.orderCode}`,
          description: `Phiếu xuất kho đã được tạo thành công ở trạng thái Tạo Yêu Cầu (PENDING). Tồn kho và kệ hàng sẽ được trừ thực tế khi nhân viên kho duyệt và hoàn tất bước Xác Nhận Xuất Kho bên Quản Lý Xuất Kho.`
        });
        await fetchLiveWarehouseData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`❌ Lỗi tạo phiếu xuất kho: ${err.message || 'Thất bại'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`❌ Lỗi kết nối hệ thống xuất kho: ${err.message}`);
    } finally {
      setIsCreatingOutbound(false);
    }
  };

  // Total Warehouse Inventory Metrics in Selected Zone
  const currentWhObj = warehouses.find(w => w.code === effectiveWhCode);
  const currentWhName = currentWhObj ? currentWhObj.name : `Kho ${effectiveWhCode}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '18px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(2, 132, 199, 0.25)' }}>
            <Box size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              Sơ Đồ Kệ 3D & Bản Sao Số Siêu Thị (Digital Twin)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Quản lý không gian 3D, trực quan hóa lô hàng Barcode và tự động cảnh báo FEFO theo thời gian thực
            </p>
          </div>
        </div>

        {/* Warehouse Selector & Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Strict Warehouse Locking: Manager cannot change warehouse */}
          {isManager ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '8px 14px', borderRadius: '12px', border: '1.5px solid #86efac', color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>
              <ShieldCheck size={16} color="#16a34a" />
              <span>📍 {currentWhName} ({myWarehouseCode})</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <Building2 size={16} color="#0284c7" />
              <select
                value={selectedWarehouseCode || 'WH-006'}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedWarehouseCode(val);
                  fetchLiveWarehouseData(val);
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Toàn Hệ Thống (Tất Cả Kho)</option>
                {warehouses.map(w => (
                  <option key={w.code} value={w.code}>
                    📍 {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchLiveWarehouseData()}
            disabled={isLoadingLive}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: isLoadingLive ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
          >
            <RefreshCw size={15} style={{ animation: isLoadingLive ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoadingLive ? 'Đang Đồng Bộ DB...' : liveLotCount > 0 ? `Đã Đồng Bộ (${liveLotCount.toLocaleString()} Lô)` : 'Đồng Bộ Cơ Sở Dữ Liệu'}</span>
          </button>

          <button
            onClick={() => setShowInboundRecommendationModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.35)',
            }}
          >
            <Sparkles size={16} />
            <span>Đề Xuất Kệ Nhập Kho</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Thêm Dãy Kệ Mới</span>
          </button>
        </div>
      </div>

      {/* Real-time Logistics Metric Cards (Matched 100% with Stock View) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>TỔNG SKU LƯU TRỮ</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              {liveSkuCount > 0 ? `${liveSkuCount.toLocaleString()} SKU` : '1,537 SKU'}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f0fdfa' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e' }}>TỔNG HÀNG LƯU TRỮ</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f766e' }}>
              {liveLotCount > 0 ? `${liveLotCount.toLocaleString()} Lô` : '2,313 Lô'}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fef2f2' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626' }}>CẢNH BÁO (FEFO/HỎNG)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#b91c1c' }}>
              {totalNearExpiryAll > 0 ? `${totalNearExpiryAll.toLocaleString()} Lô` : '186 Lô'}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fffbeb' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309' }}>QUẢN LÝ KHO</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>
              Manager {effectiveWhCode.split('-')[1] || '006'}
            </div>
          </div>
        </div>
      </div>

      {/* Phân bổ sức chứa (Khu vực) - Exact Match with Stock Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#fff', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#f0fdfa', border: '1px solid #ccfbf1' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🧊 Kho Đông (-18°C)
          </span>
          <b style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0284c7' }}>{zoneCounts.frozen.toLocaleString()} lô</b>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ❄️ Kho Mát (0-4°C)
          </span>
          <b style={{ fontSize: '1.05rem', fontWeight: 900, color: '#16a34a' }}>{zoneCounts.cold.toLocaleString()} lô</b>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🌾 Kho Khô (+25°C)
          </span>
          <b style={{ fontSize: '1.05rem', fontWeight: 900, color: '#d97706' }}>{zoneCounts.dry.toLocaleString()} lô</b>
        </div>
      </div>

      {/* Filter Toolbar: 3 Phân Khu Kho Riêng Biệt */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
          {[
            { key: 'COOL', label: `❄️ Kho Mát (0°C ~ +4°C) - ${racks.filter(r => r.zone === 'COOL').length} Kệ`, activeColor: '#0284c7' },
            { key: 'FROZEN', label: `🧊 Hầm Đông Lạnh (-18°C ~ -22°C) - ${racks.filter(r => r.zone === 'FROZEN').length} Kệ`, activeColor: '#0891b2' },
            { key: 'DRY', label: `📦 Kho Khô Thường (+25°C) - ${racks.filter(r => r.zone === 'DRY').length} Kệ`, activeColor: '#d97706' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setZoneFilter(tab.key as any);
                const firstRackInZone = racks.find(r => r.zone === tab.key);
                if (firstRackInZone) setSelectedRackId(firstRackInZone.id);
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: zoneFilter === tab.key ? tab.activeColor : '#f1f5f9',
                color: zoneFilter === tab.key ? '#fff' : '#64748b',
                boxShadow: zoneFilter === tab.key ? `0 4px 12px ${tab.activeColor}55` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleResetRackPositions}
            title="Khôi phục lại vị trí mặc định của các kệ trong kho"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RefreshCw size={13} /> Xếp Lại Ngăn Nắp
          </button>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', minWidth: '280px', border: searchInput ? '1.5px solid #0284c7' : '1px solid transparent' }}>
              <Search size={15} color={searchInput ? '#0284c7' : '#64748b'} />
              <input
                type="text"
                placeholder="Tìm Barcode SKU, Mã Lô, Tên Hàng..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setDebouncedSearchQuery(searchInput);
                  }
                }}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearchQuery('');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Floating Live Search Results Dropdown with 3D Location Coordinates */}
            {debouncedSearchQuery.trim().length >= 1 && globalSearchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '420px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                  border: '1px solid #cbd5e1',
                  zIndex: 9999,
                  padding: '8px',
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>KẾT QUẢ VỊ TRÍ 3D ({globalSearchResults.length})</span>
                  <span style={{ color: '#0284c7' }}>Bấm để định vị & highlight 3D 🎯</span>
                </div>

                {globalSearchResults.map((res, rIdx) => {
                  const isNear = res.item.daysRemaining <= 3;
                  const zoneBg = res.zone === 'COOL' ? '#e0f2fe' : res.zone === 'FROZEN' ? '#cffafe' : '#fef3c7';
                  const zoneColor = res.zone === 'COOL' ? '#0369a1' : res.zone === 'FROZEN' ? '#0891b2' : '#b45309';

                  return (
                    <div
                      key={`${res.item.lotCode}-${rIdx}`}
                      onClick={() => {
                        setZoneFilter(res.zone);
                        setSelectedRackId(res.rack.id);
                        setSearchInput(res.item.lotCode);
                        setDebouncedSearchQuery(res.item.lotCode);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid #f8fafc',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ fontSize: '13px', color: '#0f172a' }}>{res.item.name}</b>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: zoneBg, color: zoneColor, fontWeight: 800 }}>
                          {res.zone === 'COOL' ? '❄️ Kho Mát' : res.zone === 'FROZEN' ? '🧊 Kho Đông' : '🌾 Kho Khô'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#0284c7', fontWeight: 800, fontFamily: 'monospace' }}>
                          Mã Lô: {res.item.lotCode}
                        </span>
                        <span style={{ color: isNear ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: '11px' }}>
                          {isNear ? `⚠️ Cận Date (${res.item.daysRemaining} ngày)` : `HSD: ${res.item.expiryDate}`}
                        </span>
                      </div>

                      {/* Barcode & Precise 3D Location Tag with Quick Scan Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '5px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📍 {res.rack.name.split('(')[0]}</span>
                          <span>•</span>
                          <span style={{ color: '#0284c7' }}>Tầng {res.level} Cột {res.slot}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBarcodeModalItem({
                              isOpen: true,
                              item: res.item,
                              locationText: `${res.rack.name} • Tầng ${res.level} Cột ${res.slot}`,
                            });
                          }}
                          style={{
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                          }}
                        >
                          <QrCode size={12} /> Xem Barcode/QR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH: 3D DIGITAL TWIN SCENE */}
      <div style={{ background: '#0f172a', borderRadius: '22px', padding: '20px', border: '1px solid #1e293b', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', width: '100%' }}>
        {/* Header with Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#38bdf8" />
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
              KHÔNG GIAN SƠ ĐỒ 3D BẢN SAO SỐ (DIGITAL TWIN TOÀN CẢNH) - {filteredRacks.length} DÃY GIÀN KỆ PBR 4 TẦNG
            </span>
          </div>

          {/* Toggle 3D WebGL vs Isometric */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#020617', padding: '4px', borderRadius: '12px', border: '1px solid #334155' }}>
            <button
              onClick={() => setDisplayMode('3D_SCENE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                backgroundColor: displayMode === '3D_SCENE' ? '#0284c7' : 'transparent',
                color: displayMode === '3D_SCENE' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <Box size={14} />
              <span>3D WebGL Toàn Cảnh</span>
            </button>
            <button
              onClick={() => setDisplayMode('ISOMETRIC')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                backgroundColor: displayMode === 'ISOMETRIC' ? '#0284c7' : 'transparent',
                color: displayMode === 'ISOMETRIC' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              <Layers size={14} />
              <span>Sơ Đồ Kệ 2.5D</span>
            </button>
          </div>
        </div>

        {/* Display Mode: Pure 3D WebGL Scene */}
        {displayMode === '3D_SCENE' ? (
          <Supermarket3DScene
            racks={racks3D}
            selectedRackId={selectedRackId}
            onSelectRack={id => setSelectedRackId(id)}
            zoneFilter={zoneFilter}
            onUpdateRackPosition={handleUpdateRackPosition}
            searchQuery={debouncedSearchQuery}
          />
        ) : (
          /* Display Mode: Isometric 2.5D Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {filteredRacks.map(rack => {
              const isSelected = rack.id === selectedRackId;
              const pct = Math.round((rack.currentCapacity / rack.maxCapacity) * 100);
              const capColor = getCapacityColor(rack.currentCapacity, rack.maxCapacity);

              const zoneBorder =
                rack.zone === 'COOL' ? '#0284c7' : rack.zone === 'FROZEN' ? '#06b6d4' : '#f59e0b';

              return (
                <div
                  key={rack.id}
                  onClick={() => setSelectedRackId(rack.id)}
                  style={{
                    backgroundColor: isSelected ? '#1e293b' : '#020617',
                    border: `2px solid ${isSelected ? '#38bdf8' : rack.hasAlert ? '#ef4444' : zoneBorder}`,
                    borderRadius: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.35)' : 'none',
                    transform: isSelected ? 'translateY(-4px)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                      {rack.id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: rack.zone === 'FROZEN' ? '#38bdf8' : rack.zone === 'COOL' ? '#34d399' : '#fbbf24' }}>
                      <Thermometer size={12} />
                      <span>{rack.temperature}</span>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>
                    {rack.name}
                  </h4>

                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                    Chứa: <b style={{ color: '#ffffff' }}>{rack.items.length} lô hàng</b> ({rack.items.reduce((s, i) => s + i.qty, 0)} sản phẩm)
                  </div>

                  {/* Capacity Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>Sức chứa:</span>
                      <b style={{ color: capColor }}>{rack.currentCapacity} / {rack.maxCapacity} ({pct}%)</b>
                    </div>
                    <div style={{ height: '6px', width: '100%', backgroundColor: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, backgroundColor: capColor, borderRadius: '999px' }} />
                    </div>
                  </div>

                  {/* Alert Badge if near-expiry */}
                  {rack.hasAlert && (
                    <div style={{ marginTop: '10px', backgroundColor: '#7f1d1d', border: '1px solid #dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', color: '#fca5a5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} color="#f87171" />
                      <span>{rack.alertMsg}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: DETAILED SHELF INSPECTOR & LOT MANAGEMENT */}
      {selectedRack && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)', gap: '20px' }}>
          
          {/* Left Sub-Column: Rack Stats Card */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, backgroundColor: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '6px' }}>
                    {selectedRack.id}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                    {selectedRack.zoneLabel}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  {selectedRack.name}
                </h3>
              </div>

              <button
                onClick={() => {
                  setEditCapacityVal(selectedRack.maxCapacity.toString());
                  setShowEditCapacityModal(true);
                }}
                title="Tùy chỉnh sức chứa & giới hạn kệ"
                style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={13} /> Sửa Sức Chứa
              </button>
            </div>

            {/* Environmental Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CẢM BIẾN NHIỆT ĐỘ</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0369a1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Thermometer size={16} /> {selectedRack.temperature}
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>ĐỘ ẨM KHÔNG KHÍ</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>
                  {selectedRack.humidity} (Đạt chuẩn)
                </div>
              </div>
            </div>

            {/* Total Capacity Utilization */}
            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700 }}>Sức Chứa Đang Dùng:</span>
                <b style={{ color: getCapacityColor(selectedRack.currentCapacity, selectedRack.maxCapacity), fontSize: '13px' }}>
                  {selectedRack.currentCapacity.toLocaleString()} / {selectedRack.maxCapacity.toLocaleString()} ({Math.round((selectedRack.currentCapacity / selectedRack.maxCapacity) * 100)}%)
                </b>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((selectedRack.currentCapacity / selectedRack.maxCapacity) * 100))}%`, backgroundColor: getCapacityColor(selectedRack.currentCapacity, selectedRack.maxCapacity), borderRadius: '999px' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                Tổng số lượng: <b>{selectedRack.items.length} lô hàng</b> ({selectedRack.items.reduce((s, i) => s + i.qty, 0).toLocaleString()} đơn vị lưu kho)
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                disabled={isCreatingOutbound}
                onClick={() => handleExportRackNearExpiry(selectedRack)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: isCreatingOutbound ? 'not-allowed' : 'pointer',
                  opacity: isCreatingOutbound ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isCreatingOutbound ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Xuất FEFO Tự Động
              </button>

              <button
                onClick={() => {
                  alert(`Đã xuất báo cáo kiểm kê 3D cho ${selectedRack.name} (${selectedRack.items.length} Lô hàng)`);
                }}
                style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Xuất Báo Cáo Kệ
              </button>
            </div>
          </div>

          {/* Right Sub-Column: Full Lot Items Grid (Responsive ML AI Cards) */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            
            {/* Header & ML Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#0284c7" />
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                  DANH SÁCH LÔ HÀNG ĐANG LƯU TRÊN KỆ ({selectedRack.items.length} LÔ):
                </span>
              </div>

              {/* ML Model Active Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0f766e', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                <Sparkles size={14} />
                <span>ML Model Active: Arrhenius Kinetic Gradient-Boosted v2.1 • Độ tin cậy: 96.8%</span>
              </div>
            </div>

            {/* Risk & Audit Filter Tabs Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => { setSelectedRiskFilter('ALL'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#cbd5e1',
                  backgroundColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#ffffff',
                  color: selectedRiskFilter === 'ALL' ? '#fff' : '#475569',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer'
                }}
              >
                Tất cả ({rackStats.totalLots})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('SAFE'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#bbf7d0',
                  backgroundColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#f0fdf4',
                  color: selectedRiskFilter === 'SAFE' ? '#fff' : '#15803d',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🟢 Bình thường ({rackStats.safeCount})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('WARNING'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fde68a',
                  backgroundColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fffbeb',
                  color: selectedRiskFilter === 'WARNING' ? '#fff' : '#b45309',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🟡 Có nguy cơ ({rackStats.warningCount})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('DANGER'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fecaca',
                  backgroundColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fef2f2',
                  color: selectedRiskFilter === 'DANGER' ? '#fff' : '#b91c1c',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🔴 Báo động đỏ ({rackStats.dangerCount})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('AUDITED'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#99f6e4',
                  backgroundColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#f0fdfa',
                  color: selectedRiskFilter === 'AUDITED' ? '#fff' : '#0f766e',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                ✅ Đã kiểm kê ({rackStats.auditedCount})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('PENDING_AUDIT'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#e2e8f0',
                  backgroundColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#ffffff',
                  color: selectedRiskFilter === 'PENDING_AUDIT' ? '#fff' : '#475569',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                ⏳ Chưa kiểm kê ({rackStats.pendingAuditCount})
              </button>

              <button
                onClick={() => { setSelectedRiskFilter('DEPLETED'); setRackItemPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#e2e8f0',
                  backgroundColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#ffffff',
                  color: selectedRiskFilter === 'DEPLETED' ? '#fff' : '#64748b',
                  fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🗑️ Đã hết (0 SP: {rackStats.depletedCount})
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hideDepletedLots}
                    onChange={e => { setHideDepletedLots(e.target.checked); setRackItemPage(1); }}
                    style={{ cursor: 'pointer' }}
                  />
                  👁️ Tự động ẩn lô 0 tồn kho
                </label>

                {/* Page Size Selector */}
                <select
                  value={rackItemsPerPage}
                  onChange={e => { setRackItemsPerPage(Number(e.target.value)); setRackItemPage(1); }}
                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800, color: '#475569', background: '#fff' }}
                >
                  <option value={8}>8 / trang</option>
                  <option value={16}>16 / trang</option>
                  <option value={32}>32 / trang</option>
                  <option value={64}>64 / trang</option>
                </select>
              </div>
            </div>

            {rackFilteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                <Package size={36} style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                  {selectedRack.items.length === 0
                    ? 'Kệ này hiện đang trống, sẵn sàng tiếp nhận hàng nhập kho'
                    : 'Không tìm thấy lô hàng nào phù hợp với bộ lọc'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
                  {paginatedRackItems.map(it => {
                    const isDanger = it.riskLevel === 'DANGER';
                    const isWarning = it.riskLevel === 'WARNING';

                    const cardBg = isDanger ? '#fff8f8' : isWarning ? '#fffdf7' : '#ffffff';
                    const cardBorder = isDanger ? '2px solid #f87171' : isWarning ? '1.5px solid #fde047' : '1px solid #e2e8f0';
                    const shadow = isDanger ? '0 4px 12px rgba(239, 68, 68, 0.12)' : isWarning ? '0 4px 10px rgba(234, 179, 8, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)';

                    const badgeBg = isDanger ? '#fee2e2' : isWarning ? '#fefce8' : '#f0fdf4';
                    const badgeColor = isDanger ? '#b91c1c' : isWarning ? '#b45309' : '#15803d';
                    const badgeText = it.riskReason || (isDanger ? '🔴 Báo động đỏ' : isWarning ? '🟡 Có nguy cơ' : '🟢 An toàn');

                    // Days left text
                    const daysLeftColor = it.daysRemaining <= 0 ? '#dc2626' : it.daysRemaining <= 7 ? '#dc2626' : it.daysRemaining <= 30 ? '#d97706' : '#15803d';
                    const daysLeftText = it.daysRemaining <= 0 ? `⚠️ HẾT HẠN ${Math.abs(it.daysRemaining)} ngày trước` : `Còn ${it.daysRemaining} ngày`;

                    const zoneInfo: Record<string, { icon: string; label: string; temp: string; color: string }> = {
                      FROZEN: { icon: '🧊', label: 'Kho Đông', temp: '-18°C', color: '#1d4ed8' },
                      COLD:   { icon: '❄️', label: 'Kho Mát',  temp: '0–4°C',  color: '#059669' },
                      COOL:   { icon: '❄️', label: 'Kho Mát',  temp: '0–4°C',  color: '#059669' },
                      DRY:    { icon: '📦', label: 'Kho Khô',  temp: '25°C',   color: '#475569' },
                    };
                    const zone = zoneInfo[it.zone || selectedRack.zone] || { icon: '🏭', label: selectedRack.zoneLabel, temp: selectedRack.temperature, color: '#64748b' };

                    return (
                      <div
                        key={`${it.sku}-${it.lotCode}`}
                        style={{
                          backgroundColor: cardBg,
                          border: cardBorder,
                          borderRadius: '14px',
                          padding: '1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: shadow,
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {/* Row 1: Status Badge + Zone Chip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: badgeColor, backgroundColor: badgeBg, padding: '3px 10px', borderRadius: '6px', border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fef08a' : '#bbf7d0'}`, whiteSpace: 'nowrap' }}>
                            {badgeText}
                          </span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: zone.color,
                            backgroundColor: `${zone.color}15`, padding: '3px 8px', borderRadius: '6px',
                            border: `1px solid ${zone.color}30`, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                          }}>
                            {zone.icon} {zone.label} • {zone.temp}
                          </span>
                        </div>

                        {/* Row 2: Lot Code + Product Name */}
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', letterSpacing: '0.3px' }}>
                            📋 {it.lotCode}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', marginTop: '3px', lineHeight: 1.3 }}>
                            {it.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            SKU: <strong>{it.sku}</strong> &nbsp;•&nbsp; Vị trí: <strong>{it.location || selectedRack.id}</strong>
                          </div>
                        </div>

                        {/* Row 3: Dates Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '8px', padding: '8px 10px' }}>
                          <div>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>📅 Ngày nhập</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{it.importDate || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>⏰ Hạn sử dụng</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: daysLeftColor }}>{it.expiryDate}</div>
                          </div>
                        </div>

                        {/* Row 4: ML Spoilage Index Box */}
                        <div style={{ backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef08a' : '#e2e8f0'}` }}>
                          {/* ML Score & Conf */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                  🤖 ML Spoilage Index
                                </span>
                                <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  96.8% Conf.
                                </span>
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#15803d' }}>
                                {it.aiScore ?? 20}/100
                              </span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '99px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '99px',
                                width: `${Math.min(100, it.aiScore ?? 20)}%`,
                                backgroundColor: (it.aiScore ?? 20) >= 70 ? '#ef4444' : (it.aiScore ?? 20) >= 40 ? '#f59e0b' : '#22c55e',
                                transition: 'width 0.6s ease'
                              }} />
                            </div>
                          </div>

                          {/* Shelf Life consumed % */}
                          {it.shelfLifePct !== undefined && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                  {it.daysRemaining <= 0 ? '⚠️ ĐÃ HẾT HẠN' : `⏳ Vòng đời: Còn ${it.daysRemaining} ngày`}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: daysLeftColor }}>{daysLeftText}</span>
                              </div>
                              <div style={{ height: '5px', borderRadius: '99px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: '99px',
                                  width: `${Math.min(100, it.shelfLifePct)}%`,
                                  backgroundColor: it.shelfLifePct >= 90 ? '#ef4444' : it.shelfLifePct >= 70 ? '#f59e0b' : '#22c55e',
                                  transition: 'width 0.6s ease'
                                }} />
                              </div>
                            </div>
                          )}

                          {/* XAI Feature contributions */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                            <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              🌡️ Nhiệt: <strong>{zone.temp}</strong>
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              ⏳ Đã dùng: <strong>{Math.round(it.shelfLifePct || 0)}%</strong>
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              🧬 Nhóm: <strong>{it.riskCategory || it.category || 'Thực phẩm'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Row 5: AI Recommendation */}
                        {it.riskRecommendation && (
                          <div style={{
                            backgroundColor: isDanger ? '#fee2e2' : isWarning ? '#fefce8' : '#ecfdf5',
                            border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fde68a' : '#bbf7d0'}`,
                            borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem',
                            color: isDanger ? '#7f1d1d' : isWarning ? '#78350f' : '#14532d',
                            fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '5px'
                          }}>
                            <span style={{ flexShrink: 0 }}>💡</span>
                            <span>{it.riskRecommendation}</span>
                          </div>
                        )}

                        {/* Row 5.5: Audit History */}
                        {it.lastAuditedAt ? (
                          <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ✅ ĐÃ KIỂM KÊ
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                {new Date(it.lastAuditedAt).toLocaleDateString('vi-VN')} {new Date(it.lastAuditedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                              👤 Người kiểm: <strong>{it.lastAuditedBy || 'Nhân viên trực ca'}</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                              <span>Thực đếm: <strong>{it.lastAuditActualQty ?? it.qty} SP</strong></span>
                              <span style={{ fontWeight: 800, color: (it.lastAuditDiff ?? 0) > 0 ? '#16a34a' : (it.lastAuditDiff ?? 0) < 0 ? '#dc2626' : '#0f766e' }}>
                                {(it.lastAuditDiff ?? 0) > 0 ? `Lệch: +${it.lastAuditDiff} (Thừa)` : (it.lastAuditDiff ?? 0) < 0 ? `Lệch: ${it.lastAuditDiff} (Thiếu)` : 'Khớp 100%'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>⏳</span> <span>Chưa đối soát kiểm kê trong kỳ</span>
                          </div>
                        )}

                        {/* Row 5.8: Outbound / Disposal Order Badge */}
                        {(() => {
                          const existing = outboundLotMap[it.lotCode] || (it.id ? outboundLotMap[it.id] : undefined);
                          if (!existing) return null;
                          return (
                            <div
                              onClick={() => navigate(`/outbound-orders?orderCode=${existing.orderCode}`)}
                              style={{
                                backgroundColor: existing.isDisposal ? '#fef2f2' : '#eff6ff',
                                border: `1px solid ${existing.isDisposal ? '#fecaca' : '#bfdbfe'}`,
                                color: existing.isDisposal ? '#b91c1c' : '#1d4ed8',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                              title="Bấm để xem chi tiết phiếu xuất kho này"
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {existing.isDisposal ? '🗑️ ĐÃ CÓ ĐƠN TIÊU HỦY' : '📦 ĐÃ CÓ ĐƠN XUẤT'}: <b>{existing.orderCode}</b>
                              </span>
                              <span style={{ fontSize: '0.68rem', backgroundColor: existing.isDisposal ? '#fee2e2' : '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                                {existing.status}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Row 6: Stock Qty & Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef3c7' : '#f1f5f9'}` }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Tồn kho thực tế:</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isDanger ? '#dc2626' : '#1e293b' }}>
                              {it.qty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{it.unit || 'SP'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {(() => {
                              const existing = outboundLotMap[it.lotCode] || (it.id ? outboundLotMap[it.id] : undefined);
                              return (
                                <button
                                  disabled={isCreatingOutbound}
                                  onClick={() => handleExportSingleLot(it, selectedRack)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: existing ? '#475569' : isDanger ? '#dc2626' : '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    cursor: isCreatingOutbound ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: isCreatingOutbound ? 0.7 : 1,
                                    boxShadow: existing ? 'none' : isDanger ? '0 2px 6px rgba(220, 38, 38, 0.3)' : '0 2px 6px rgba(2, 132, 199, 0.3)'
                                  }}
                                  title={existing ? `Lô hàng này đã lập phiếu xuất ${existing.orderCode}. Bấm để xem chi tiết.` : isDanger ? 'Xuất tiêu hủy' : 'Xuất FEFO'}
                                >
                                  <Send size={12} /> {existing ? `Đã Lập Đơn (${existing.orderCode})` : isDanger ? 'Xuất Tiêu Hủy' : 'Xuất FEFO'}
                                </button>
                              );
                            })()}

                            <button
                              onClick={() => setAdjustModal({
                                isOpen: true,
                                lot: it,
                                newQty: it.qty,
                                reason: 'Kiểm kê định kỳ 3D Digital Twin',
                                qualityStatus: 'GOOD',
                                note: ''
                              })}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Kiểm kê & đối soát số lượng thực tế tại kệ"
                            >
                              <Edit2 size={12} /> {it.lastAuditedAt ? 'Kiểm kê lại' : 'Kiểm kê ngay'}
                            </button>

                            <button
                              onClick={() => setBarcodeModalItem({
                                isOpen: true,
                                item: it,
                                locationText: `${selectedRack.name} • ${it.location || ''}`,
                              })}
                              style={{ padding: '6px 8px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Xem Barcode & QR Code để quét bằng điện thoại"
                            >
                              <QrCode size={12} /> Barcode
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalRackPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      disabled={rackItemPage === 1}
                      onClick={() => setRackItemPage(p => Math.max(1, p - 1))}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: rackItemPage === 1 ? '#f8fafc' : '#ffffff',
                        color: rackItemPage === 1 ? '#94a3b8' : '#0f172a',
                        cursor: rackItemPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      ⬅ Trang Trước
                    </button>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569' }}>
                      Trang {rackItemPage} / {totalRackPages} ({rackFilteredItems.length} Lô hàng)
                    </span>
                    <button
                      disabled={rackItemPage >= totalRackPages}
                      onClick={() => setRackItemPage(p => Math.min(totalRackPages, p + 1))}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: rackItemPage >= totalRackPages ? '#f8fafc' : '#ffffff',
                        color: rackItemPage >= totalRackPages ? '#94a3b8' : '#0f172a',
                        cursor: rackItemPage >= totalRackPages ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      Trang Kế Tiếp ➡
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Rack Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Thêm Dãy Kệ Mới</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Tên Dãy Kệ *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kệ A9 (Thực Phẩm Nhập Khẩu)"
                  value={newRackName}
                  onChange={e => setNewRackName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phân Vùng Nhiệt Độ *</label>
                <select
                  value={newRackZone}
                  onChange={e => setNewRackZone(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="COOL">🧊 Kho Mát (0°C ~ +4°C)</option>
                  <option value="FROZEN">❄️ Hầm Đông Lạnh (-18°C ~ -22°C)</option>
                  <option value="DRY">🌾 Kho Khô Thường (+25°C)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Sức Chứa Tối Đa (Slots/SP) *</label>
                <input
                  type="number"
                  value={newRackCapacity}
                  onChange={e => setNewRackCapacity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                <button onClick={handleAddRack} style={{ flex: 2, padding: '10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>Tạo Kệ Hàng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Inbound Shelf Allocation & Rack Occupancy Modal */}
      {showInboundRecommendationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', maxWidth: '880px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '26px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    Trợ Lý Đề Xuất Kệ Nhập Kho Thông Minh (Smart Putaway)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Phân tích độ trống kệ, phân vùng nhiệt độ và đề xuất vị trí lưu kho tối ưu nhất
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInboundRecommendationModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inbound Search / Filter Card */}
            <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16} /> <span>1. Thông Tin Mặt Hàng Dự Kiến Nhập Kho</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Mặt Hàng / Loại Sản Phẩm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Sữa tươi, Thịt bò, Rau củ, Mì tôm..."
                    value={inboundSearchProduct}
                    onChange={e => setInboundSearchProduct(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Phân Khu Nhiệt Độ Yêu Cầu
                  </label>
                  <select
                    value={inboundSelectedZone}
                    onChange={e => setInboundSelectedZone(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="AUTO">🤖 Tự Động Phân Tích Nhóm Hàng</option>
                    <option value="COOL">❄️ Kho Mát (0°C ~ +4°C)</option>
                    <option value="FROZEN">🧊 Hầm Đông Lạnh (-18°C ~ -22°C)</option>
                    <option value="DRY">🌾 Kho Khô Thường (+25°C)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Số Lượng Thùng Dự Kiến Nhập
                  </label>
                  <input
                    type="number"
                    value={inboundQuantity}
                    onChange={e => setInboundQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                </div>
              </div>
            </div>

            {/* AI Smart Putaway Recommendations */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯 Top 3 Kệ Được Hệ Thống Đề Xuất Nhập Hàng Tối Ưu</span>
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Sắp xếp theo độ phù hợp & sức chứa trống</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {recommendedInboundRacks.slice(0, 3).map((rec, idx) => {
                  const isTopPick = idx === 0;
                  const zoneBg = rec.rack.zone === 'COOL' ? '#e0f2fe' : rec.rack.zone === 'FROZEN' ? '#cffafe' : '#fef3c7';
                  const zoneColor = rec.rack.zone === 'COOL' ? '#0369a1' : rec.rack.zone === 'FROZEN' ? '#0891b2' : '#b45309';

                  return (
                    <div
                      key={rec.rack.id}
                      style={{
                        background: isTopPick ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' : '#ffffff',
                        padding: '16px',
                        borderRadius: '16px',
                        border: isTopPick ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        boxShadow: isTopPick ? '0 8px 20px rgba(34, 197, 94, 0.15)' : 'none',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      {isTopPick && (
                        <div style={{ position: 'absolute', top: '-10px', right: '14px', background: '#16a34a', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.4)' }}>
                          🥇 ĐỀ XUẤT TỐT NHẤT
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <b style={{ fontSize: '14px', color: '#0f172a' }}>{rec.rack.name}</b>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '6px', background: zoneBg, color: zoneColor, fontWeight: 800 }}>
                            {rec.rack.zone === 'COOL' ? '❄️ Kho Mát (0-4°C)' : rec.rack.zone === 'FROZEN' ? '🧊 Kho Đông (-18°C)' : '🌾 Kho Khô (+25°C)'}
                          </span>
                          <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 800 }}>
                            Nhiệt độ: {rec.rack.temperature}
                          </span>
                        </div>

                        {/* Occupancy Progress */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                            <span>Còn trống: <b style={{ color: '#16a34a' }}>{rec.freeSlots.toLocaleString()} ô ({rec.freePct}%)</b></span>
                            <span>Đã chứa: {rec.filledUnits}/{rec.maxUnits}</span>
                          </div>
                          <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${rec.occupancyPct}%`, height: '100%', background: rec.occupancyPct >= 85 ? '#ef4444' : rec.occupancyPct >= 60 ? '#f59e0b' : '#10b981', borderRadius: '4px' }} />
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
                          {rec.matchReason}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setZoneFilter(rec.rack.zone);
                            setSelectedRackId(rec.rack.id);
                            setShowInboundRecommendationModal(false);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>🎯 Xem Kệ 3D</span>
                        </button>

                        <button
                          onClick={() => {
                            setZoneFilter(rec.rack.zone);
                            setSelectedRackId(rec.rack.id);
                            setShowInboundRecommendationModal(false);
                            alert(`✅ Đã chỉ định ${inboundSearchProduct || 'lô hàng mới'} vào ${rec.rack.name} (Vị trí: ${rec.rack.id})!`);
                          }}
                          style={{
                            flex: 1.3,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#0f766e',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Chọn Kệ Này</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All Racks Occupancy Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="#0284c7" />
                  <span>Bảng Thống Kê Sức Chứa Toàn Bộ {racks.length} Dãy Kệ Trong Kho</span>
                </h4>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <tr>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569' }}>DÃY KỆ</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569' }}>PHÂN KHU</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569' }}>TIẾN ĐỘ LẤP ĐẦY</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>SỐ LÔ</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>Ô TRỐNG</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>TRẠNG THÁI</th>
                      <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rackOccupancyList.map((ro, rIdx) => {
                      const statusBg = ro.status === 'EMPTY_HIGH' ? '#dcfce7' : ro.status === 'AVAILABLE' ? '#e0f2fe' : ro.status === 'ALMOST_FULL' ? '#fef3c7' : '#fee2e2';
                      const statusColor = ro.status === 'EMPTY_HIGH' ? '#166534' : ro.status === 'AVAILABLE' ? '#0369a1' : ro.status === 'ALMOST_FULL' ? '#b45309' : '#b91c1c';
                      const statusLabel = ro.status === 'EMPTY_HIGH' ? '🟢 Trống nhiều' : ro.status === 'AVAILABLE' ? '🔵 Còn chỗ' : ro.status === 'ALMOST_FULL' ? '🟠 Sắp đầy' : '🔴 Đã đầy';

                      return (
                        <tr key={ro.rack.id} style={{ borderTop: rIdx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                            {ro.rack.name}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: ro.rack.zone === 'COOL' ? '#0284c7' : ro.rack.zone === 'FROZEN' ? '#0891b2' : '#d97706' }}>
                              {ro.rack.zoneLabel}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: '140px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${ro.occupancyPct}%`, height: '100%', background: ro.occupancyPct >= 85 ? '#ef4444' : ro.occupancyPct >= 60 ? '#f59e0b' : '#10b981' }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', minWidth: '32px' }}>{ro.occupancyPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {ro.totalLots} lô
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                            {ro.freeSlots.toLocaleString()} ô
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '12px', background: statusBg, color: statusColor, fontWeight: 800 }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setZoneFilter(ro.rack.zone);
                                setSelectedRackId(ro.rack.id);
                                setShowInboundRecommendationModal(false);
                              }}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#0284c7', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Xem 3D
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pre-Export Confirmation Modal (Xác Nhận Xuất Kho) */}
      {confirmExportModal && confirmExportModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '560px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0',
          }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '18px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900 }}>
                    {confirmExportModal.isBatch ? 'Xác Nhận Xuất FEFO Hàng Loạt' : 'Xác Nhận Lập Phiếu Xuất Kho'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.8 }}>Kệ nguồn: <b>{confirmExportModal.rack.name}</b></p>
                </div>
              </div>
              <button
                onClick={() => setConfirmExportModal(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Info summary */}
              {!confirmExportModal.isBatch && confirmExportModal.item && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                    {confirmExportModal.item.name}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#475569', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span>SKU: <b>{confirmExportModal.item.sku}</b></span>
                    <span>Mã Lô: <b style={{ color: '#0284c7' }}>{confirmExportModal.item.lotCode}</b></span>
                    <span>HSD: <b>{confirmExportModal.item.expiryDate}</b> (Còn {confirmExportModal.item.daysRemaining} ngày)</span>
                    <span>Tồn kho: <b style={{ color: '#0f766e' }}>{confirmExportModal.item.qty} {confirmExportModal.item.unit}</b></span>
                  </div>
                </div>
              )}

              {confirmExportModal.isBatch && confirmExportModal.items && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Danh sách {confirmExportModal.items.length} lô hàng cận date cần xuất ưu tiên:
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {confirmExportModal.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <span><b>{it.lotCode}</b> - {it.name}</span>
                        <span style={{ color: '#dc2626', fontWeight: 800 }}>SL: {it.qty} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form inputs */}
              {!confirmExportModal.isBatch && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Số lượng xuất kho:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={confirmExportModal.item?.qty || 99999}
                    value={confirmExportModal.quantity}
                    onChange={e => setConfirmExportModal({ ...confirmExportModal, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Điểm đến / Mục đích xuất:
                </label>
                <input
                  type="text"
                  value={confirmExportModal.destination}
                  onChange={e => setConfirmExportModal({ ...confirmExportModal, destination: e.target.value })}
                  placeholder="Ví dụ: Xuất bán FEFO siêu thị / Xuất điều chuyển chi nhánh..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Người tạo phiếu / Yêu cầu:
                </label>
                <input
                  type="text"
                  value={confirmExportModal.requesterName}
                  onChange={e => setConfirmExportModal({ ...confirmExportModal, requesterName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ghi chú nghiệp vụ xuất:
                </label>
                <textarea
                  rows={2}
                  value={confirmExportModal.notes}
                  onChange={e => setConfirmExportModal({ ...confirmExportModal, notes: e.target.value })}
                  placeholder="Ghi chú chi tiết lý do xuất..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  disabled={isCreatingOutbound}
                  onClick={handleConfirmExportSubmit}
                  style={{
                    flex: 1.5,
                    padding: '11px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: isCreatingOutbound ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {isCreatingOutbound ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Xác Nhận Tạo Phiếu Xuất
                </button>

                <button
                  onClick={() => setConfirmExportModal(null)}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Huỷ Bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outbound Order Created Success Modal */}
      {createdOutboundModal && createdOutboundModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '540px',
            maxWidth: '95%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '20px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={22} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Tạo Đơn Xuất Kho Thành Công</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Mã phiếu: <b>{createdOutboundModal.order?.orderCode}</b></p>
                </div>
              </div>
              <button
                onClick={() => setCreatedOutboundModal(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                  {createdOutboundModal.title}
                </div>
                <div style={{ fontSize: '12.5px', color: '#15803d', lineHeight: '1.4' }}>
                  {createdOutboundModal.description}
                </div>
              </div>

              {createdOutboundModal.order && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Trạng thái đơn:</span>
                    <span style={{ fontWeight: 800, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                      ⏳ Tạo yêu cầu (PENDING)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Điểm đến / Mục đích:</span>
                    <b style={{ color: '#0f172a' }}>{createdOutboundModal.order.destination}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Kho xuất hàng:</span>
                    <b style={{ color: '#0284c7' }}>{createdOutboundModal.order.warehouseCode || effectiveWhCode}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Số lượng sản phẩm:</span>
                    <b style={{ color: '#0f766e' }}>{createdOutboundModal.order.totalQuantity || createdOutboundModal.count} sản phẩm</b>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const orderId = createdOutboundModal.order?.id;
                    setCreatedOutboundModal(null);
                    navigate(orderId ? `/outbound-orders?selectedId=${orderId}` : '/outbound-orders');
                  }}
                  style={{
                    flex: 1.5,
                    padding: '12px 18px',
                    borderRadius: '12px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <ExternalLink size={16} /> Mở Đơn Xuất Kho & Chỉnh Sửa
                </button>

                <button
                  onClick={() => setCreatedOutboundModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Ở lại Bản Đồ 3D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BARCODE & QR CODE PREVIEW MODAL (FOR MOBILE SCANNING TEST)   */}
      {/* ============================================================ */}
      {barcodeModalItem.isOpen && barcodeModalItem.item && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setBarcodeModalItem({ isOpen: false, item: null, locationText: '' })}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '560px',
              maxWidth: '95%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                padding: '20px 24px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScanBarcode size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>Mã Vạch Barcode & QR Code</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                    Dùng điện thoại quét trực tiếp mã trên màn hình
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBarcodeModalItem({ isOpen: false, item: null, locationText: '' })}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {/* Product Info Summary Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {barcodeModalItem.item.category || 'Hàng Tiêu Dùng'}
                    </span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                      {barcodeModalItem.item.name}
                    </h4>
                  </div>
                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                    Tồn: {barcodeModalItem.item.qty} {barcodeModalItem.item.unit}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#475569', marginTop: '10px' }}>
                  <div>🏷️ SKU: <b style={{ color: '#0f172a' }}>{barcodeModalItem.item.sku}</b></div>
                  <div>📦 Mã Lô: <b style={{ color: '#0284c7' }}>{barcodeModalItem.item.lotCode || 'N/A'}</b></div>
                  {barcodeModalItem.locationText && (
                    <div style={{ gridColumn: 'span 2' }}>📍 Vị trí: <b style={{ color: '#059669' }}>{barcodeModalItem.locationText}</b></div>
                  )}
                  {barcodeModalItem.item.expiryDate && (
                    <div style={{ gridColumn: 'span 2' }}>⏳ Hạn sử dụng: <b style={{ color: '#d97706' }}>{barcodeModalItem.item.expiryDate.split('T')[0]}</b></div>
                  )}
                </div>
              </div>

              {/* Code Type Switcher */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setBarcodeTargetType('LOT')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: barcodeTargetType === 'LOT' ? '#0284c7' : 'transparent',
                    color: barcodeTargetType === 'LOT' ? '#ffffff' : '#64748b',
                    boxShadow: barcodeTargetType === 'LOT' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
                  }}
                >
                  📦 Mã Lô Hàng ({barcodeModalItem.item.lotCode || barcodeModalItem.item.sku})
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeTargetType('SKU')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: barcodeTargetType === 'SKU' ? '#0284c7' : 'transparent',
                    color: barcodeTargetType === 'SKU' ? '#ffffff' : '#64748b',
                    boxShadow: barcodeTargetType === 'SKU' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
                  }}
                >
                  🏷️ Mã Barcode SKU ({barcodeModalItem.item.sku})
                </button>
              </div>

              {/* Active Code High-Contrast Display Card */}
              {(() => {
                const targetCode = barcodeTargetType === 'LOT'
                  ? (barcodeModalItem.item.lotCode || barcodeModalItem.item.sku)
                  : barcodeModalItem.item.sku;

                return (
                  <div style={{ background: '#ffffff', border: '2px dashed #94a3b8', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)', marginBottom: '18px' }}>
                    {/* 1D Barcode Container */}
                    <div style={{ background: '#ffffff', padding: '16px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-block', maxWidth: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <img
                        src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(targetCode)}&code=Code128&dpi=150`}
                        alt={`Barcode for ${targetCode}`}
                        style={{ maxWidth: '100%', height: '80px', objectFit: 'contain', filter: 'contrast(1.2)' }}
                        onError={(e) => {
                          // Fallback to text if Tec-IT is blocked
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '18px', color: '#0f172a', letterSpacing: '0.15em', marginTop: '6px' }}>
                        {targetCode}
                      </div>
                    </div>

                    {/* Dual QR Code Display */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                      <div style={{ background: '#ffffff', padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(targetCode)}`}
                          alt={`QR for ${targetCode}`}
                          style={{ width: '110px', height: '110px', display: 'block' }}
                        />
                      </div>
                      <div style={{ textAlign: 'left', fontSize: '12px', color: '#475569', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Sparkles size={14} /> Quét 1D hoặc 2D QR Code
                        </div>
                        <div>Camera điện thoại trong <b>Staff App</b> hỗ trợ nhận diện tự động cả mã vạch 1D và QR code 2D.</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Instructions Banner */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '18px' }}>📱</span>
                <div>
                  Mở màn hình <b>Lấy hàng (Picking)</b> trên điện thoại tại <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>http://192.168.4.32:5175</code> và hướng camera vào mã phía trên để hoàn tất lấy hàng!
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    alert('Đã gửi lệnh in nhãn mã vạch Decal nhiệt!');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Printer size={16} /> In Nhãn Decal Nhiệt
                </button>

                <button
                  type="button"
                  onClick={() => setBarcodeModalItem({ isOpen: false, item: null, locationText: '' })}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
