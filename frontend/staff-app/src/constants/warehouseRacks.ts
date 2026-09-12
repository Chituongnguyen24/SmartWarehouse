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
  shelfLevel?: number;
  slotIndex?: number;
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

// 26 Comprehensive Supermarket Racks (8 COOL, 8 FROZEN, 10 DRY) matching Web Dashboard exactly
export const DEFAULT_RACKS: ShelfRack[] = [
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

/**
 * Distribute DB inventory lots and products into the 26 warehouse racks
 */
export function populateRacksWithDbLots(
  baseRacks: ShelfRack[],
  lots: any[],
  products: any[] = [],
  warehouseCode?: string
): ShelfRack[] {
  if (!lots || lots.length === 0) return baseRacks;

  const productMap: Record<string, any> = {};
  products.forEach((p: any) => {
    if (p.id) productMap[p.id] = p;
    if (p.sku) productMap[p.sku] = p;
  });

  const filteredLots = (warehouseCode && warehouseCode !== 'ALL'
    ? lots.filter((l: any) => !l.warehouseCode || l.warehouseCode === warehouseCode)
    : lots
  ).filter((l: any) => (l.remainingQty === undefined || Number(l.remainingQty) > 0));

  const coldLots = filteredLots.filter((l: any) => {
    const z = (l.zone || '').toUpperCase();
    return z === 'COLD' || z === 'COOL';
  });
  const frozenLots = filteredLots.filter((l: any) => (l.zone || '').toUpperCase() === 'FROZEN');
  const dryLots = filteredLots.filter((l: any) => (l.zone || '').toUpperCase() === 'DRY' || !l.zone);

  const now = new Date();

  return baseRacks.map((rack) => {
    const zoneLots = rack.zone === 'COOL'
      ? coldLots
      : rack.zone === 'FROZEN'
      ? frozenLots
      : dryLots;

    const zoneRacks = baseRacks.filter((r) => r.zone === rack.zone);
    const rackSubIdx = zoneRacks.findIndex((r) => r.id === rack.id);

    const assignedLots = zoneLots.filter((l: any, idx: number) => {
      const loc = (l.location || '').toLowerCase().trim();
      const expectedZoneChar = rack.zone === 'COOL' ? 'a' : rack.zone === 'FROZEN' ? 'b' : 'c';

      // 1. Exact letter-number rack match (e.g. "kệ c4", "c4", "rack-dry-4")
      const directRackMatch = loc.match(/(?:kệ\s*|[a-c]|rack-[a-z]+-)?([a-c])[-_ ]*(\d+)/i);
      if (directRackMatch) {
        const zoneChar = directRackMatch[1].toLowerCase();
        const rackNum = parseInt(directRackMatch[2], 10);
        const maxZoneRacks = rack.zone === 'DRY' ? 10 : 8;
        const mappedSubIdx = ((rackNum - 1) % maxZoneRacks);
        if (zoneChar === expectedZoneChar && mappedSubIdx === rackSubIdx) {
          return true;
        }
      }

      // 2. Numeric shelf match (e.g. "dry-shelf-14-slot-4", "shelf-14")
      const matchShelfNum = loc.match(/shelf[-_ ]*(\d+)/i);
      if (matchShelfNum && matchShelfNum[1]) {
        const shelfNum = parseInt(matchShelfNum[1], 10);
        return (shelfNum - 1) % Math.max(1, zoneRacks.length) === rackSubIdx;
      }

      // 3. Fallback: Uniform distribution
      return idx % Math.max(1, zoneRacks.length) === rackSubIdx;
    });

    if (assignedLots.length > 0) {
      const mappedItems: ShelfItem[] = assignedLots.map((l: any, i: number) => {
        let extractedSku = '';
        if (l.lotCode && l.lotCode.startsWith('LOT-EM-')) {
          const parts = l.lotCode.split('-');
          if (parts.length >= 3) {
            extractedSku = `${parts[1]}-${parts[2]}`;
          }
        }

        const p = productMap[l.productId] || productMap[l.sku] || (extractedSku ? productMap[extractedSku] : null);
        const expDate = l.expiryDate ? new Date(l.expiryDate) : null;
        const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 90;

        return {
          id: l.id,
          sku: l.sku || p?.sku || `EM-${100000 + i}`,
          name: p?.name || l.productName || (rack.zone === 'COOL' ? 'Thực phẩm tươi sống' : rack.zone === 'FROZEN' ? 'Thực phẩm đông lạnh' : 'Hàng khô Emart'),
          category: p?.category || (rack.zone === 'COOL' ? 'Kho Mát' : rack.zone === 'FROZEN' ? 'Đông Lạnh' : 'Kho Khô'),
          qty: Number(l.remainingQty !== undefined ? l.remainingQty : l.quantity || 50),
          unit: l.unit || p?.unit || 'Món',
          lotCode: l.lotCode || `LOT-${l.sku || 'EM'}-${i + 1}`,
          expiryDate: expDate ? expDate.toLocaleDateString('vi-VN') : '15/12/2026',
          daysRemaining: daysLeft,
          price: p?.price || 50000,
          imageUrl: p?.imageUrl,
          warehouseCode: l.warehouseCode,
          location: l.location,
          zone: rack.zone,
          shelfLevel: (i % 5) + 1,
          slotIndex: (i % 8) + 1,
        };
      });

      const totalQty = mappedItems.reduce((acc, it) => acc + it.qty, 0);

      return {
        ...rack,
        items: mappedItems,
        currentCapacity: totalQty,
        hasAlert: mappedItems.some(i => i.daysRemaining <= 3),
      };
    }

    return {
      ...rack,
      items: [],
      currentCapacity: 0,
      hasAlert: false,
    };
  });
}

/**
 * Standardize shelf location format across all Web and Mobile views
 * e.g., "Kệ C4 • Tầng 4 Cột 4" or "Kệ C6 (Ô 04) • Tầng 2 Cột 4"
 */
export function formatStandardShelfLocation(
  rawLoc?: string,
  zone?: string,
  fallbackIdx: number = 1
): string {
  if (!rawLoc) {
    const z = (zone || 'DRY').toUpperCase();
    if (z === 'COOL' || z === 'COLD') {
      const rackNum = ((fallbackIdx - 1) % 8) + 1;
      const slot = ((fallbackIdx * 2) % 10) + 1;
      const level = ((slot - 1) % 5) + 1;
      const col = ((slot - 1) % 8) + 1;
      return `Kệ A${rackNum} • Tầng ${level} Cột ${col}`;
    }
    if (z === 'FROZEN') {
      const rackNum = ((fallbackIdx - 1) % 8) + 1;
      const slot = ((fallbackIdx * 2) % 10) + 1;
      const level = ((slot - 1) % 5) + 1;
      const col = ((slot - 1) % 8) + 1;
      return `Kệ B${rackNum} • Tầng ${level} Cột ${col}`;
    }
    const rackNum = ((fallbackIdx - 1) % 10) + 1;
    const slot = ((fallbackIdx * 2) % 10) + 1;
    const level = ((slot - 1) % 5) + 1;
    const col = ((slot - 1) % 8) + 1;
    return `Kệ C${rackNum} • Tầng ${level} Cột ${col}`;
  }

  const loc = rawLoc.trim();

  // Already formatted
  if (loc.includes('• Tầng') || loc.includes('Tầng')) {
    return loc;
  }

  // 1. Match DRY shelf (e.g. "dry-shelf-14-slot-4")
  const dryMatch = loc.match(/(?:dry|kho\s*khô)[-_ ]*shelf[-_ ]*(\d+)(?:[-_ ]*slot[-_ ]*(\d+))?/i);
  if (dryMatch) {
    const rawShelf = parseInt(dryMatch[1], 10);
    const rawSlot = dryMatch[2] ? parseInt(dryMatch[2], 10) : 4;
    const rackNum = ((rawShelf - 1) % 10) + 1;
    const level = ((rawSlot - 1) % 5) + 1;
    const col = ((rawSlot - 1) % 8) + 1;
    return `Kệ C${rackNum} • Tầng ${level} Cột ${col}`;
  }

  // 2. Match COOL shelf (e.g. "cool-shelf-02-slot-3")
  const coolMatch = loc.match(/(?:cool|cld|cold|kho\s*mát|lạnh)[-_ ]*shelf[-_ ]*(\d+)(?:[-_ ]*slot[-_ ]*(\d+))?/i);
  if (coolMatch) {
    const rawShelf = parseInt(coolMatch[1], 10);
    const rawSlot = coolMatch[2] ? parseInt(coolMatch[2], 10) : 3;
    const rackNum = ((rawShelf - 1) % 8) + 1;
    const level = ((rawSlot - 1) % 5) + 1;
    const col = ((rawSlot - 1) % 8) + 1;
    return `Kệ A${rackNum} • Tầng ${level} Cột ${col}`;
  }

  // 3. Match FROZEN shelf (e.g. "frozen-shelf-04-slot-2")
  const fzMatch = loc.match(/(?:frozen|frz|đông|hầm)[-_ ]*shelf[-_ ]*(\d+)(?:[-_ ]*slot[-_ ]*(\d+))?/i);
  if (fzMatch) {
    const rawShelf = parseInt(fzMatch[1], 10);
    const rawSlot = fzMatch[2] ? parseInt(fzMatch[2], 10) : 2;
    const rackNum = ((rawShelf - 1) % 8) + 1;
    const level = ((rawSlot - 1) % 5) + 1;
    const col = ((rawSlot - 1) % 8) + 1;
    return `Kệ B${rackNum} • Tầng ${level} Cột ${col}`;
  }

  // 4. Match generic letter rack (e.g. "D-15", "C-06", "A-01", "B-03", "C4")
  const letterMatch = loc.match(/^(?:Kệ\s*)?([A-D])[-_ ]*(\d+)(?:[-_ ]*(?:ô|slot|tầng)[-_ ]*(\d+))?/i);
  if (letterMatch) {
    let letter = letterMatch[1].toUpperCase();
    const rawShelf = parseInt(letterMatch[2], 10);
    const rawSlot = letterMatch[3] ? parseInt(letterMatch[3], 10) : 4;
    
    // Map D -> C (Dry racks are C1-C10)
    if (letter === 'D') letter = 'C';

    const maxRacks = letter === 'C' ? 10 : 8;
    const rackNum = ((rawShelf - 1) % maxRacks) + 1;
    const level = ((rawSlot - 1) % 5) + 1;
    const col = ((rawSlot - 1) % 8) + 1;
    return `Kệ ${letter}${rackNum} • Tầng ${level} Cột ${col}`;
  }

  // 5. Match generic shelf-X without zone prefix (e.g. "shelf-14-slot-4")
  const genericShelfMatch = loc.match(/^shelf[-_ ]*(\d+)(?:[-_ ]*slot[-_ ]*(\d+))?/i);
  if (genericShelfMatch) {
    const z = (zone || 'DRY').toUpperCase();
    const rawShelf = parseInt(genericShelfMatch[1], 10);
    const rawSlot = genericShelfMatch[2] ? parseInt(genericShelfMatch[2], 10) : 4;
    const letter = (z === 'COOL' || z === 'COLD') ? 'A' : (z === 'FROZEN' ? 'B' : 'C');
    const maxRacks = letter === 'C' ? 10 : 8;
    const rackNum = ((rawShelf - 1) % maxRacks) + 1;
    const level = ((rawSlot - 1) % 5) + 1;
    const col = ((rawSlot - 1) % 8) + 1;
    return `Kệ ${letter}${rackNum} • Tầng ${level} Cột ${col}`;
  }

  if (loc.startsWith('Kệ')) return loc;
  return `Kệ ${loc}`;
}

