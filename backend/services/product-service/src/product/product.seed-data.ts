import { StorageType } from './product.entity';

export const LARGE_SEED_PRODUCTS = [
  // --- 1. RAU CỦ QUẢ (10 items) ---
  {
    sku: 'VEG-CABBAGE-01',
    name: 'Bắp cải thảo VietGAP',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 4, maxTemp: 10, maxHumidity: 90, unit: 'kg', price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=500&q=80',
    description: 'Bắp cải thảo tươi giòn, trồng theo quy trình VietGAP an toàn tuyệt đối.',
    origin: 'Đà Lạt, Lâm Đồng', preservation: 'Bảo quản tủ lạnh (4-10°C)',
    isFlashSale: true, discountPercent: 15, rating: 4.8, soldCount: 320, stock: 150
  },
  {
    sku: 'VEG-TOMATO-01',
    name: 'Cà chua mầm Đà Lạt',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 4, maxTemp: 10, maxHumidity: 90, unit: '500g', price: 28000,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80',
    description: 'Cà chua chín cây mọng nước, nhiều bột, giàu vitamin A và C.',
    origin: 'Đà Lạt', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: false, discountPercent: 0, rating: 4.7, soldCount: 210, stock: 120
  },
  {
    sku: 'VEG-BROCCOLI-01',
    name: 'Súp lơ xanh hữu cơ',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 90, unit: 'Cây 500g', price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=500&q=80',
    description: 'Súp lơ xanh giòn ngọt giàu chất xơ, thích hợp luộc hoặc xào bò.',
    origin: 'Đà Lạt', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 10, rating: 4.9, soldCount: 180, stock: 90
  },
  {
    sku: 'VEG-CARROT-01',
    name: 'Cà rốt hữu cơ Đà Lạt',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 8, maxHumidity: 85, unit: 'kg', price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=500&q=80',
    description: 'Cà rốt tươi củ to đều, màu cam tự nhiên đậm đà vị ngọt.',
    origin: 'Đà Lạt', preservation: 'Nơi khô ráo hoặc ngăn mát',
    isFlashSale: false, discountPercent: 0, rating: 4.6, soldCount: 450, stock: 200
  },
  {
    sku: 'VEG-POTATO-01',
    name: 'Khoai tây vàng Đà Lạt',
    category: 'Rau củ quả',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 25, maxHumidity: 70, unit: 'kg', price: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80',
    description: 'Khoai tây ruột vàng bở dẻo, thích hợp chiên hoặc nấu canh.',
    origin: 'Đà Lạt', preservation: 'Nơi thoáng mát, tránh ánh sáng',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 520, stock: 180
  },
  {
    sku: 'VEG-CUCUMBER-01',
    name: 'Dưa leo baby VietGAP',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 4, maxTemp: 10, maxHumidity: 90, unit: '500g', price: 22000,
    imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=500&q=80',
    description: 'Dưa leo baby đặc ruột, giòn mát, ngọt thanh không đắng.',
    origin: 'Đồng Nai', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 12, rating: 4.7, soldCount: 390, stock: 110
  },
  {
    sku: 'VEG-PUMPKIN-01',
    name: 'Bí đỏ hồ lô ruột vàng',
    category: 'Rau củ quả',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 25, maxHumidity: 70, unit: 'Trái 1.2kg', price: 29000,
    imageUrl: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=500&q=80',
    description: 'Bí đỏ dẻo bùi, thơm lừng, chuyên dùng nấu súp hoặc hầm xương.',
    origin: 'Đắk Lắk', preservation: 'Nơi khô ráo mát mẻ',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 280, stock: 80
  },
  {
    sku: 'VEG-SPINACH-01',
    name: 'Cải bó xôi (Rau bina) tươi',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 95, unit: '300g', price: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80',
    description: 'Rau bina dồi dào sắt và chất dinh dưỡng cho bữa ăn gia đình.',
    origin: 'Đà Lạt', preservation: 'Bảo quản ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 15, rating: 4.8, soldCount: 160, stock: 70
  },
  {
    sku: 'VEG-ONION-01',
    name: 'Hành tây củ to Đà Lạt',
    category: 'Rau củ quả',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 25, maxHumidity: 65, unit: '500g', price: 19000,
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80',
    description: 'Hành tây mỏng vỏ, ngọt giòn hăng nhẹ thích hợp xào hoặc làm salad.',
    origin: 'Đà Lạt', preservation: 'Nơi khô ráo thoáng gió',
    isFlashSale: false, discountPercent: 0, rating: 4.5, soldCount: 600, stock: 250
  },
  {
    sku: 'VEG-BELLPEPPER-01',
    name: 'Ớt chuông Đà Lạt đủ màu',
    category: 'Rau củ quả',
    storageType: StorageType.COLD,
    minTemp: 4, maxTemp: 8, maxHumidity: 85, unit: '500g', price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80',
    description: 'Ớt chuông đỏ, vàng, xanh giòn ngọt ngọt giàu vitamin C.',
    origin: 'Đà Lạt', preservation: 'Bảo quản ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 10, rating: 4.9, soldCount: 340, stock: 100
  },

  // --- 2. TRÁI CÂY (10 items) ---
  {
    sku: 'FRUIT-APPLE-01',
    name: 'Táo Fuji Nam Phi',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 8, maxHumidity: 85, unit: 'kg', price: 85000,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6fc6c?w=500&q=80',
    description: 'Táo Fuji nhập khẩu giòn ngọt, mọng nước, giàu vitamin C.',
    origin: 'Nam Phi', preservation: 'Bảo quản ngăn mát tủ lạnh',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 500, stock: 200
  },
  {
    sku: 'FRUIT-BANANA-01',
    name: 'Chuối Laba Đà Lạt',
    category: 'Trái cây',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 25, maxHumidity: 75, unit: 'Nải 1.2kg', price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80',
    description: 'Chuối Laba dẻo ngọt tự nhiên, thơm lừng chuẩn chất lượng.',
    origin: 'Đà Lạt, Việt Nam', preservation: 'Nơi thoáng mát',
    isFlashSale: true, discountPercent: 20, rating: 4.8, soldCount: 610, stock: 140
  },
  {
    sku: 'FRUIT-ORANGE-01',
    name: 'Cam sành Tiền Giang',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 5, maxTemp: 12, maxHumidity: 85, unit: 'kg', price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=500&q=80',
    description: 'Cam sành mỏng vỏ, nhiều nước ngọt đậm, tốt cho hệ miễn dịch.',
    origin: 'Tiền Giang', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: false, discountPercent: 0, rating: 4.6, soldCount: 430, stock: 160
  },
  {
    sku: 'FRUIT-GRAPE-01',
    name: 'Nho đen không hạt Mỹ',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 90, unit: '500g', price: 145000,
    imageUrl: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500&q=80',
    description: 'Nho đen Mỹ giòn ngọt bẩy, không hạt vô cùng tiện lợi.',
    origin: 'Mỹ', preservation: 'Tủ lạnh (0-4°C)',
    isFlashSale: true, discountPercent: 15, rating: 4.9, soldCount: 780, stock: 90
  },
  {
    sku: 'FRUIT-MANGO-01',
    name: 'Xoài cát Hòa Lộc chín cây',
    category: 'Trái cây',
    storageType: StorageType.DRY,
    minTemp: 12, maxTemp: 22, maxHumidity: 80, unit: 'kg', price: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80',
    description: 'Xoài cát Hòa Lộc thơm lừng, thịt dẻo mịn ngọt đậm đà.',
    origin: 'Tiền Giang', preservation: 'Nơi thoáng mát',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 350, stock: 110
  },
  {
    sku: 'FRUIT-WATERMELON-01',
    name: 'Dưa hấu không hạt Mặt Trời',
    category: 'Trái cây',
    storageType: StorageType.DRY,
    minTemp: 10, maxTemp: 20, maxHumidity: 80, unit: 'Trái 3kg', price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=500&q=80',
    description: 'Dưa hấu đỏ mọng, ngọt mát giải nhiệt mùa hè cực đã.',
    origin: 'Long An', preservation: 'Nơi thoáng mát hoặc ngăn mát',
    isFlashSale: true, discountPercent: 10, rating: 4.7, soldCount: 920, stock: 70
  },
  {
    sku: 'FRUIT-STRAWBERRY-01',
    name: 'Dâu tây Giống Nhật Đà Lạt',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 90, unit: 'Hộp 250g', price: 98000,
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&q=80',
    description: 'Dâu tây chín đỏ mọng, chua ngọt thanh mát cực ngon.',
    origin: 'Đà Lạt', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 18, rating: 4.8, soldCount: 640, stock: 50
  },
  {
    sku: 'FRUIT-KIWI-01',
    name: 'Kiwi vàng Zespri New Zealand',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 85, unit: 'Hộp 4 trái', price: 115000,
    imageUrl: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=500&q=80',
    description: 'Kiwi vàng New Zealand vị ngọt dịu, dồi dào Vitamin C và khoáng chất.',
    origin: 'New Zealand', preservation: 'Bảo quản lạnh',
    isFlashSale: false, discountPercent: 0, rating: 5.0, soldCount: 410, stock: 85
  },
  {
    sku: 'FRUIT-AVOCADO-01',
    name: 'Bơ 034 Đắk Lắk sáp dẻo',
    category: 'Trái cây',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 25, maxHumidity: 75, unit: 'kg', price: 68000,
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&q=80',
    description: 'Bơ 034 thân dài, thịt béo ngậy dẻo quánh chuẩn sáp.',
    origin: 'Đắk Lắk', preservation: 'Để chín tự nhiên ở nhiệt độ phòng',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 530, stock: 130
  },
  {
    sku: 'FRUIT-PINEAPPLE-01',
    name: 'Thơm (Dứa) Mật MD2 gọt sẵn',
    category: 'Trái cây',
    storageType: StorageType.COLD,
    minTemp: 4, maxTemp: 8, maxHumidity: 85, unit: 'Trái 800g', price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&q=80',
    description: 'Dứa mật ngọt lịm không rát lưỡi, đã gọt mắt tiện lợi.',
    origin: 'Hậu Giang', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 15, rating: 4.7, soldCount: 310, stock: 60
  },

  // --- 3. THỊT TƯƠI (8 items) ---
  {
    sku: 'MEAT-BEEF-01',
    name: 'Thăn ngoại bò Úc Hokubee',
    category: 'Thịt tươi',
    storageType: StorageType.FROZEN,
    minTemp: -25, maxTemp: -18, maxHumidity: 65, unit: '500g', price: 320000,
    imageUrl: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=500&q=80',
    description: 'Thịt bò Úc thượng hạng vân mỡ xen kẽ đều đặn, siêu mềm.',
    origin: 'Úc', preservation: 'Tủ đông (-18°C)',
    isFlashSale: true, discountPercent: 20, rating: 5.0, soldCount: 150, stock: 50
  },
  {
    sku: 'MEAT-PORK-01',
    name: 'Ba rọi heo sinh học CP',
    category: 'Thịt tươi',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: '500g', price: 95000,
    imageUrl: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=500&q=80',
    description: 'Thịt heo tươi 3F chuẩn VietGAP, nạc mỡ đan xen cân đối.',
    origin: 'Việt Nam', preservation: 'Kho lạnh (0-4°C)',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 890, stock: 110
  },
  {
    sku: 'MEAT-CHICKEN-01',
    name: 'Cánh gà tươi CP',
    category: 'Thịt tươi',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: 'Khay 500g', price: 58000,
    imageUrl: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&q=80',
    description: 'Cánh gà tươi sạch thích hợp làm gà chiên nước mắm hoặc nướng.',
    origin: 'Việt Nam', preservation: 'Bảo quản ngăn mát',
    isFlashSale: true, discountPercent: 12, rating: 4.7, soldCount: 720, stock: 140
  },
  {
    sku: 'MEAT-PORK-RIBS-01',
    name: 'Sườn non heo sạch CP',
    category: 'Thịt tươi',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: 'Khay 500g', price: 135000,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
    description: 'Sườn non heo hồng tươi, sụn mềm dẻo nướng hoặc xào chua ngọt tuyệt hảo.',
    origin: 'Việt Nam', preservation: 'Bảo quản ngăn mát',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 610, stock: 90
  },
  {
    sku: 'MEAT-BEEF-MINCED-01',
    name: 'Thịt bò xay Mỹ thượng hạng',
    category: 'Thịt tươi',
    storageType: StorageType.FROZEN,
    minTemp: -20, maxTemp: -15, maxHumidity: 70, unit: '300g', price: 89000,
    imageUrl: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?w=500&q=80',
    description: 'Thịt bò xay chuẩn tỷ lệ nạc mỡ, làm mì Ý hoặc burger cực thơm.',
    origin: 'Mỹ', preservation: 'Bảo quản đông lạnh',
    isFlashSale: true, discountPercent: 15, rating: 4.8, soldCount: 450, stock: 100
  },
  {
    sku: 'MEAT-CHICKEN-THIGH-01',
    name: 'Đùi gà góc tư tươi',
    category: 'Thịt tươi',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: 'kg', price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500&q=80',
    description: 'Đùi gà thịt chắc, chắc da, thích hợp xối mỡ hoặc luộc.',
    origin: 'Việt Nam', preservation: 'Bảo quản ngăn mát',
    isFlashSale: false, discountPercent: 0, rating: 4.6, soldCount: 830, stock: 160
  },
  {
    sku: 'MEAT-DUCK-01',
    name: 'Vịt làm sạch nguyên con',
    category: 'Thịt tươi',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: 'Con 1.8kg', price: 160000,
    imageUrl: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=500&q=80',
    description: 'Vịt cỏ làm sạch sẽ, thịt thơm ngon không bị hôi.',
    origin: 'Bến Tre', preservation: 'Bảo quản ngăn mát',
    isFlashSale: true, discountPercent: 10, rating: 4.7, soldCount: 220, stock: 40
  },
  {
    sku: 'MEAT-LAMB-01',
    name: 'Sườn cừu Úc có xương',
    category: 'Thịt tươi',
    storageType: StorageType.FROZEN,
    minTemp: -25, maxTemp: -18, maxHumidity: 65, unit: '500g', price: 380000,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
    description: 'Sườn cừu nhập khẩu Úc dồi dào dinh dưỡng, chuyên làm món áp chảo.',
    origin: 'Úc', preservation: 'Bảo quản tủ đông',
    isFlashSale: false, discountPercent: 0, rating: 5.0, soldCount: 90, stock: 30
  },

  // --- 4. HẢI SẢN (8 items) ---
  {
    sku: 'SEAFOOD-SALMON-01',
    name: 'Cá hồi Na Uy phi lê',
    category: 'Hải sản',
    storageType: StorageType.COLD,
    minTemp: 0, maxTemp: 4, maxHumidity: 80, unit: '300g', price: 195000,
    imageUrl: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=500&q=80',
    description: 'Cá hồi tươi nhập khẩu Na Uy bằng đường hàng không.',
    origin: 'Na Uy', preservation: 'Bảo quản lạnh (0-4°C)',
    isFlashSale: false, discountPercent: 0, rating: 4.7, soldCount: 420, stock: 80
  },
  {
    sku: 'SEAFOOD-SHRIMP-01',
    name: 'Tôm sú sinh thái Ca Mau',
    category: 'Hải sản',
    storageType: StorageType.FROZEN,
    minTemp: -20, maxTemp: -15, maxHumidity: 70, unit: 'Hộp 500g', price: 165000,
    imageUrl: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&q=80',
    description: 'Tôm sú tươi ngon ngọt thịt, đánh bắt tự nhiên từ rừng ngập mặn.',
    origin: 'Cà Mau, Việt Nam', preservation: 'Bảo quản tủ đông (-18°C)',
    isFlashSale: true, discountPercent: 12, rating: 4.9, soldCount: 350, stock: 75
  },
  {
    sku: 'SEAFOOD-SQUID-01',
    name: 'Mực ống Phan Thiết tươi',
    category: 'Hải sản',
    storageType: StorageType.FROZEN,
    minTemp: -20, maxTemp: -15, maxHumidity: 70, unit: '500g', price: 175000,
    imageUrl: 'https://images.unsplash.com/photo-1545696968-1a5245650b36?w=500&q=80',
    description: 'Mực ống tươi nhấp nháy làm sạch, thịt dày giòn sần sật.',
    origin: 'Phan Thiết', preservation: 'Bảo quản tủ đông',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 510, stock: 65
  },
  {
    sku: 'SEAFOOD-CRAB-01',
    name: 'Cua thịt Cà Mau tươi sống',
    category: 'Hải sản',
    storageType: StorageType.COLD,
    minTemp: 10, maxTemp: 18, maxHumidity: 85, unit: 'Con 600g', price: 290000,
    imageUrl: 'https://images.unsplash.com/photo-1559737521-277f240b6164?w=500&q=80',
    description: 'Cua thịt Cà Mau chắc thịt, ngọt thơm chuẩn chất lượng.',
    origin: 'Cà Mau', preservation: 'Bảo quản thoáng mát',
    isFlashSale: true, discountPercent: 10, rating: 5.0, soldCount: 190, stock: 40
  },
  {
    sku: 'SEAFOOD-FISH-TUNA-01',
    name: 'Cá ngừ đại dương phi lê',
    category: 'Hải sản',
    storageType: StorageType.FROZEN,
    minTemp: -25, maxTemp: -18, maxHumidity: 65, unit: '500g', price: 140000,
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80',
    description: 'Cá ngừ đại dương đỏ tươi, chuyên làm món nướng hoặc sashimi.',
    origin: 'Phú Yên', preservation: 'Tủ đông (-18°C)',
    isFlashSale: false, discountPercent: 0, rating: 4.7, soldCount: 280, stock: 70
  },
  {
    sku: 'SEAFOOD-OCTOPUS-01',
    name: 'Bạch tuộc nhat Kiên Giang',
    category: 'Hải sản',
    storageType: StorageType.FROZEN,
    minTemp: -20, maxTemp: -15, maxHumidity: 70, unit: '500g', price: 130000,
    imageUrl: 'https://images.unsplash.com/photo-1545696968-1a5245650b36?w=500&q=80',
    description: 'Bạch tuộc tươi cấp đông giòn sần sật, làm sa tế nướng cực bắt vị.',
    origin: 'Kiên Giang', preservation: 'Tủ đông',
    isFlashSale: true, discountPercent: 15, rating: 4.8, soldCount: 370, stock: 85
  },
  {
    sku: 'SEAFOOD-CLAM-01',
    name: 'Nghêu trắng Bến Tre',
    category: 'Hải sản',
    storageType: StorageType.COLD,
    minTemp: 15, maxTemp: 22, maxHumidity: 90, unit: 'kg', price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=500&q=80',
    description: 'Nghêu mập mạp béo ngọt, chuyên hấp sả hoặc nấu canh.',
    origin: 'Bến Tre', preservation: 'Nơi mát mẻ',
    isFlashSale: false, discountPercent: 0, rating: 4.6, soldCount: 650, stock: 120
  },
  {
    sku: 'SEAFOOD-FISH-POMFRET-01',
    name: 'Cá chim đen tươi làm sạch',
    category: 'Hải sản',
    storageType: StorageType.FROZEN,
    minTemp: -18, maxTemp: -12, maxHumidity: 75, unit: 'Con 700g', price: 110000,
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&q=80',
    description: 'Cá chim béo ngậy thịt bở ngọt, thích hợp chiên xù hoặc nướng giấy bạc.',
    origin: 'Vũng Tàu', preservation: 'Tủ đông',
    isFlashSale: true, discountPercent: 10, rating: 4.7, soldCount: 210, stock: 50
  },

  // --- 5. SỮA & ĐỒ UỐNG (8 items) ---
  {
    sku: 'MILK-TH-01',
    name: 'Sữa tươi thanh trùng TH True Milk 1L',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 80, unit: 'Chai 1L', price: 48000,
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80',
    description: 'Sữa tươi nguyên chất 100% giữ nguyên vị ngon tinh khiết.',
    origin: 'Nghệ An', preservation: 'Bảo quản lạnh (2-6°C)',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 1400, stock: 250
  },
  {
    sku: 'MILK-YOGURT-01',
    name: 'Sữa chua ăn Vinamilk Có Đường',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 8, maxHumidity: 80, unit: 'Lốc 4 hộp', price: 29000,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80',
    description: 'Sữa chua lên men tự nhiên giàu lợi khuẩn tốt cho đường ruột.',
    origin: 'Việt Nam', preservation: 'Ngăn mát tủ lạnh',
    isFlashSale: true, discountPercent: 10, rating: 4.9, soldCount: 2300, stock: 300
  },
  {
    sku: 'DRINK-JUICE-01',
    name: 'Nước ép Lựu đỏ Malee 1L',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.DRY,
    minTemp: 10, maxTemp: 30, maxHumidity: 70, unit: 'Hộp 1L', price: 62000,
    imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80',
    description: 'Nước ép nguyên chất nhập khẩu Thái Lan, không thêm đường.',
    origin: 'Thái Lan', preservation: 'Nơi khô ráo mát mẻ',
    isFlashSale: true, discountPercent: 15, rating: 4.7, soldCount: 280, stock: 90
  },
  {
    sku: 'DRINK-COCA-01',
    name: 'Nước ngọt Coca-Cola Nguyên Bản',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Lốc 6 lon 320ml', price: 56000,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
    description: 'Nước sảng khoái đánh tan cơn khát, bùng nổ hương vị.',
    origin: 'Việt Nam', preservation: 'Khô ráo mát mẻ',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 5600, stock: 400
  },
  {
    sku: 'MILK-SOY-01',
    name: 'Sữa đậu nành Fami Nguyên Chất',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 30, maxHumidity: 75, unit: 'Lốc 6 hộp 200ml', price: 27000,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
    description: 'Sữa đậu nành 100% đậu đạm thực vật thơm ngon béo ngậy.',
    origin: 'Việt Nam', preservation: 'Nhiệt độ phòng',
    isFlashSale: true, discountPercent: 8, rating: 4.8, soldCount: 3100, stock: 350
  },
  {
    sku: 'DRINK-TEA-01',
    name: 'Trà Oolong Tea+ Plus 450ml',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 30, maxHumidity: 70, unit: 'Chai 450ml', price: 10000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80',
    description: 'Trà Ô Long chứa OTPP giúp hạn chế hấp thu chất béo.',
    origin: 'Việt Nam', preservation: 'Nơi khô ráo',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 4200, stock: 500
  },
  {
    sku: 'DRINK-WATER-01',
    name: 'Nước khoáng thiên nhiên La Vie 1.5L',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Chai 1.5L', price: 11000,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&q=80',
    description: 'Nước khoáng kiềm nhẹ dịu thanh mát cho sức khỏe.',
    origin: 'Long An', preservation: 'Tránh ánh nắng trực tiếp',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 7800, stock: 600
  },
  {
    sku: 'MILK-BUTTER-01',
    name: 'Bơ lạt Anchor 227g',
    category: 'Sữa & Đồ uống',
    storageType: StorageType.COLD,
    minTemp: 2, maxTemp: 6, maxHumidity: 80, unit: 'Khối 227g', price: 82000,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80',
    description: 'Bơ lạt từ sữa bò tươi New Zealand làm bánh thơm béo tuyệt hảo.',
    origin: 'New Zealand', preservation: 'Tủ lạnh (2-6°C)',
    isFlashSale: true, discountPercent: 10, rating: 5.0, soldCount: 840, stock: 120
  },

  // --- 6. BÁNH KẸO & ĐỒ KHÔ (8 items) ---
  {
    sku: 'DRY-RICE-01',
    name: 'Gạo ST25 lúa tôm',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 60, unit: 'Túi 5kg', price: 180000,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
    description: 'Gạo đặc sản ST25 dẻo thơm, an toàn không hóa chất.',
    origin: 'Sóc Trăng', preservation: 'Nơi khô ráo thoáng mát',
    isFlashSale: true, discountPercent: 10, rating: 4.9, soldCount: 1200, stock: 300
  },
  {
    sku: 'SNACK-NUTS-01',
    name: 'Hạt dẻ cười Mỹ Rang Muối',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 30, maxHumidity: 65, unit: 'Hũ 500g', price: 215000,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80',
    description: 'Hạt dẻ cười thơm giòn béo bùi, nhập khẩu chính ngạch từ Mỹ.',
    origin: 'Mỹ', preservation: 'Nơi khô ráo thoáng mát',
    isFlashSale: false, discountPercent: 0, rating: 4.9, soldCount: 390, stock: 100
  },
  {
    sku: 'DRY-NOODLE-01',
    name: 'Mì Hảo Hảo tôm chua cay',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Thùng 30 gói', price: 115000,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80',
    description: 'Mì ăn liền Hảo Hảo quốc dân chua cay ngất ngây.',
    origin: 'Việt Nam', preservation: 'Nơi khô ráo',
    isFlashSale: true, discountPercent: 8, rating: 4.9, soldCount: 9500, stock: 500
  },
  {
    sku: 'SNACK-CHIPS-01',
    name: 'Khoai tây chiên Pringles Vị Tự Nhiên',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 30, maxHumidity: 65, unit: 'Lon 107g', price: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80',
    description: 'Bánh snack khoai tây giòn rụm nguyên bản siêu hấp dẫn.',
    origin: 'Malaysia', preservation: 'Khô ráo',
    isFlashSale: false, discountPercent: 0, rating: 4.7, soldCount: 1800, stock: 220
  },
  {
    sku: 'DRY-OIL-01',
    name: 'Dầu ăn Simply 100% Đậu Nành 2L',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Chai 2L', price: 108000,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80',
    description: 'Dầu ăn tinh khiết giàu Omega 3-6-9 tốt cho tim mạch.',
    origin: 'Việt Nam', preservation: 'Tránh nhiệt độ cao',
    isFlashSale: true, discountPercent: 12, rating: 4.9, soldCount: 3200, stock: 180
  },
  {
    sku: 'SNACK-CHOCO-01',
    name: 'Socola KitKat Thanh 4 Ngón',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.COLD,
    minTemp: 15, maxTemp: 22, maxHumidity: 60, unit: 'Gói 38g', price: 15000,
    imageUrl: 'https://images.unsplash.com/photo-1582176647440-3b13b16292b6?w=500&q=80',
    description: 'Bánh xốp phủ socola ngọt ngào, xả stress tức thì.',
    origin: 'Malaysia', preservation: 'Mát mẻ (tránh chảy)',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 4100, stock: 300
  },
  {
    sku: 'DRY-SAUCE-01',
    name: 'Nước mắm Chinsu Nam Ngư 750ml',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Chai 750ml', price: 46000,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80',
    description: 'Nước mắm cá cơm thơm ngon đậm đà cho mọi bữa ăn.',
    origin: 'Phú Quốc', preservation: 'Khô ráo',
    isFlashSale: false, discountPercent: 0, rating: 4.8, soldCount: 6300, stock: 400
  },
  {
    sku: 'DRY-SPICE-01',
    name: 'Hạt nêm Knorr Nấm Hương 400g',
    category: 'Bánh kẹo & Đồ khô',
    storageType: StorageType.DRY,
    minTemp: 15, maxTemp: 35, maxHumidity: 65, unit: 'Gói 400g', price: 34000,
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80',
    description: 'Hạt nêm thanh ngọt tự nhiên từ nấm hương chuẩn chay mặn đều dùng được.',
    origin: 'Việt Nam', preservation: 'Bảo quản kín sau khi mở',
    isFlashSale: true, discountPercent: 10, rating: 4.9, soldCount: 2900, stock: 250
  }
];
