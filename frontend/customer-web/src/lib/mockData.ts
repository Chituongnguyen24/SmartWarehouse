export const MOCK_PRODUCTS = [
  { id: '1', name: 'Nước Mắm Nam Ngư Chai 500ml', price: 35000, oldPrice: 42000, discount: 16, soldCount: 1500, totalStock: 2000, imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg', category: 'gia-vi-gao', rating: 4.8, brand: 'Masan' },
  { id: '2', name: 'Sữa tươi tiệt trùng Vinamilk 100% không đường hộp 1L', price: 35000, oldPrice: 40000, discount: 12, soldCount: 820, totalStock: 1000, imageUrl: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg', category: 'sua-va-cac-san-pham-tu-sua', rating: 4.5, brand: 'Vinamilk' },
  { id: '3', name: 'Dầu đậu nành Simply chai 1 lít', price: 52000, oldPrice: 60000, discount: 13, soldCount: 450, totalStock: 500, imageUrl: 'https://fakestoreapi.com/img/71li-ujtl-L._AC_UX679_.jpg', category: 'gia-vi-gao', rating: 4.9, brand: 'Simply' },
  { id: '4', name: 'Cá hồi Na Uy phi lê tươi 250g', price: 145000, oldPrice: 160000, discount: 9, soldCount: 120, totalStock: 300, imageUrl: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg', category: 'thit-trung-hai-san', rating: 4.6, brand: 'Khác' },
  { id: '5', name: 'Nho mẫu đơn Hàn Quốc hộp 500g', price: 199000, oldPrice: 250000, discount: 20, soldCount: 45, totalStock: 50, imageUrl: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg', category: 'rau-cu-trai-cay', rating: 5.0, brand: 'Khác' },
  { id: '6', name: 'Bánh Quy Bơ Danisa Hộp 454G', price: 135000, oldPrice: 155000, discount: 12, soldCount: 500, totalStock: 600, imageUrl: 'https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_.jpg', category: 'thuc-pham-che-bien', rating: 4.7, brand: 'Danisa' },
  { id: '7', name: 'Gạo ST25 Ông Cua Túi 5Kg', price: 180000, oldPrice: 200000, discount: 10, soldCount: 340, totalStock: 400, imageUrl: 'https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg', category: 'gia-vi-gao', rating: 4.9, brand: 'Khác' },
  { id: '8', name: 'Thùng 24 lon bia Heineken 330ml', price: 440000, oldPrice: 460000, discount: 4, soldCount: 2000, totalStock: 5000, imageUrl: 'https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_.jpg', category: 'do-uong', rating: 4.8, brand: 'Heineken' },
  { id: '9', name: 'Sữa tắm Lifebuoy Bảo vệ Vượt trội 800g', price: 150000, oldPrice: 185000, discount: 18, soldCount: 900, totalStock: 1200, imageUrl: '/categories/ca_nhan.png', category: 'cham-soc-ca-nhan', rating: 4.5, brand: 'Unilever' },
  { id: '10', name: 'Nước giặt OMO Matic Cửa trên 3.1kg', price: 195000, oldPrice: 245000, discount: 20, soldCount: 780, totalStock: 1000, imageUrl: '/categories/nha_cua.png', category: 'nha-cua-va-doi-song', rating: 4.6, brand: 'Unilever' },
  { 
    id: '11', 
    name: 'Cơm tươi AK Rice đậu gà gói 150g', 
    slug: 'com-tuoi-ak-rice-dau-ga-goi-150g--s250906326',
    price: 25000, 
    oldPrice: 28000, 
    discount: 10, 
    soldCount: 500, 
    totalStock: 1000, 
    imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1613564834361-9436948817d1?auto=format&fit=crop&w=600&q=80'
    ],
    category: 'thuc-pham-che-bien', 
    rating: 5.0, 
    brand: 'AK Rice',
    sku: '250906326',
    variants: [
      { id: 'v1', name: 'Đậu gà', image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80' },
      { id: 'v2', name: 'Gạo lứt', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80' },
      { id: 'v3', name: 'Hạt sen', image: 'https://images.unsplash.com/photo-1613564834361-9436948817d1?auto=format&fit=crop&w=600&q=80' }
    ],
    specs: [
      { label: 'Thương hiệu', value: 'AK Rice' },
      { label: 'Xuất xứ', value: 'Việt Nam' },
      { label: 'Trọng lượng/khối lượng', value: '150g' },
      { label: 'Thành phần', value: 'Gạo ST25, đậu gà, nước tinh khiết' },
      { label: 'Cách sử dụng', value: 'Quay lò vi sóng 2 phút hoặc luộc cách thủy 10 phút' },
      { label: 'Bảo quản', value: 'Bảo quản nơi khô ráo, thoáng mát' },
      { label: 'Hạn sử dụng', value: '6 tháng kể từ ngày sản xuất' }
    ],
    description: '<p><strong>Cơm tươi AK Rice</strong> được chế biến từ những hạt gạo ST25 thượng hạng kết hợp cùng đậu gà dinh dưỡng. Công nghệ Nhật Bản giúp giữ nguyên vẹn hương vị và độ dẻo thơm của hạt cơm.</p><p>Chỉ với 2 phút hâm nóng, bạn đã có ngay một bữa ăn tiện lợi, giàu protein và an toàn cho sức khỏe, phù hợp cho dân văn phòng, học sinh hoặc những người bận rộn.</p><ul><li>Không chất bảo quản.</li><li>Gạo nguyên cám, giàu dinh dưỡng.</li><li>Thiết kế gói tiện lợi.</li></ul>'
  }
];

export const PROMO_BANNERS = [
  { img: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=600&q=80", title: "Siêu hội Sale" },
  { img: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80", title: "Lễ hội trái cây" },
  { img: "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=600&q=80", title: "Đại tiệc hàng tươi sống" }
];

export const BRANDS = [
  { name: 'Vinamilk', color: 'bg-blue-100 text-blue-600' },
  { name: 'Unilever', color: 'bg-blue-900 text-white' },
  { name: 'Coca Cola', color: 'bg-red-600 text-white' },
  { name: 'Nestle', color: 'bg-amber-800 text-white' },
  { name: 'Suntory Pepsico', color: 'bg-blue-500 text-white' },
  { name: 'Acecook', color: 'bg-red-500 text-white' },
  { name: 'Masan', color: 'bg-orange-500 text-white' }
];

export const QUICK_LINKS = [
  { imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', title: 'Giỏ quà Trái Cây' },
  { imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80', title: 'Thực phẩm Tươi ngon' },
  { imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', title: 'E-voucher Siêu Hot' },
  { imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=400&q=80', title: 'Ưu đãi Thành viên' },
  { imageUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76ba?auto=format&fit=crop&w=400&q=80', title: 'Thương hiệu Uy tín' }
];

export const VOUCHERS = [
  { title: 'Giảm 10K - CHAOHE10', desc: 'Giảm 10K khi mua các sản phẩm thuộc nhóm "Kem, gel..."', date: '22/07/2026', type: 'CT' },
  { title: 'Chào bạn mới - C.T Mart', desc: 'Tặng mã 30K cho KH đăng ký tài khoản mới', date: '10 ngày', type: 'CT' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO1 SP nhóm Giặt Xả của Unilever từ 379k', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO2 SP nhóm Dọn dẹp nhà của Unilever từ...', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 5K - Unilever', desc: 'Nhập mã COMBO3 SP nhóm dọn dẹp nhà của U...', date: '22/07/2026', type: 'Unilever' }
];

export const MOCK_RECIPES = [
  { id: '1', title: 'Salad đảo ức gà và đậu đỏ', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
  { id: '2', title: 'Bánh tráng gạo lứt cuốn ức gà', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80' },
  { id: '3', title: 'Súp ức gà rau củ', imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80' },
  { id: '4', title: 'Bắp cải bọc đậu hũ ức gà', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80' },
  { id: '5', title: 'Gỏi tôm xoài chua ngọt', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' },
  { id: '6', title: 'Cháo yến mạch bông cải xanh', imageUrl: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=600&q=80' },
];

export const ARTICLES = [
  { id: 1, title: 'Bí quyết chọn trái cây tươi ngon cho gia đình', desc: 'Những mẹo nhỏ giúp bạn luôn chọn được trái cây tươi, ngọt và an toàn...', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', date: '21/07/2026' },
  { id: 2, title: 'Cách bảo quản thịt cá trong tủ lạnh đúng cách', desc: 'Bảo quản thực phẩm đúng cách không chỉ giúp giữ được dinh dưỡng mà còn...', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', date: '20/07/2026' },
  { id: 3, title: 'Top 5 món ăn thanh mát giải nhiệt mùa hè', desc: 'Mùa hè nắng nóng, hãy trổ tài làm ngay 5 món ăn giải nhiệt cực đỉnh này...', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', date: '19/07/2026' },
  { id: 4, title: 'Chương trình Tích điểm đổi quà siêu hấp dẫn', desc: 'Từ tháng 8 này, C.T Mart tung ra chương trình tích điểm hoàn toàn mới...', imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=400&q=80', date: '18/07/2026' },
];

export const CATEGORIES = [
  { id: '1', name: 'Gạo', slug: 'gao', imageUrl: '/categories/gia_vi_new.png' },
  { id: '2', name: 'Nước mắm', slug: 'nuoc-mam', imageUrl: '/categories/thuc_an_che_bien_new.png' },
  { id: '3', name: 'Rau củ', slug: 'rau-cu', imageUrl: '/categories/rau_cu_new.png' },
  { id: '4', name: 'Thịt heo', slug: 'thit-heo', imageUrl: '/categories/thit_hai_san_new.png' },
  { id: '5', name: 'Trái cây', slug: 'trai-cay', imageUrl: '/categories/rau_cu_new.png' },
  { id: '6', name: 'Bánh kẹo & Đồ khô', slug: 'banh-keo', imageUrl: '/categories/banh_keo_new.png' },
  { id: '7', name: 'Sữa & Đồ uống', slug: 'sua-do-uong', imageUrl: '/categories/sua_new.png' },
];

export const BANNERS = [
  { imageUrl: "/banners/tren3.webp" },
  { imageUrl: "/banners/tren4.webp" },
  { imageUrl: "/banners/bannertren5.png" },
];

export const SUB_BANNERS = [
  { imageUrl: "/banners/subbanner1.webp" },
  { imageUrl: "/banners/tren5.png" },
];
