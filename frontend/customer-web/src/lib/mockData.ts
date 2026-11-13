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
  { 
    img: "/banner_tt/sieu-hoi-sale.webp", 
    title: "Siêu hội Sale", 
    href: "/khuyen-mai" 
  },
  { 
    img: "/banner_tt/le-hoi-trai-cay.webp", 
    title: "Lễ hội trái cây", 
    href: "/danh-muc/rau-cu-trai-cay" 
  },
  { 
    img: "/banner_tt/dai-tiec-hang-tuoi-song.webp", 
    title: "Đại tiệc hàng tươi sống", 
    href: "/danh-muc/thit-trung-hai-san" 
  }
];

export const BRANDS = [
  { name: 'Vinamilk', logo: '/brands/vinamilk.png' },
  { name: 'Unilever', logo: '/brands/unilever.jpg' },
  { name: 'Coca Cola', logo: '/brands/coca-cola.png' },
  { name: 'Nestlé', logo: '/brands/nestle.png' },
  { name: 'Suntory PepsiCo', logo: '/brands/suntory-pepsico.png' },
  { name: 'Acecook', logo: '/brands/acecook.png' },
  { name: 'Masan', logo: '/brands/masan.png' },
  { name: 'CP Foods', logo: '/brands/cp-foods.png' },
  { name: 'TH True Milk', logo: '/brands/th-true-milk.png' },
];

export const QUICK_LINKS = [
  { imageUrl: '/banner_tt/gio-qua.webp', title: 'Giỏ quà Trái Cây', href: '/danh-muc/rau-cu-trai-cay' },
  { imageUrl: '/banner_tt/thu-pham-tuoi-ngon.webp', title: 'Thực phẩm Tươi ngon', href: '/danh-muc/thit-trung-hai-san' },
  { imageUrl: '/banner_tt/e-voucher.webp', title: 'E-voucher Siêu Hot', href: '/khuyen-mai' },
  { imageUrl: '/banner_tt/uu-dai-thanh-vien.webp', title: 'Ưu đãi Thành viên', href: '/khuyen-mai' },
  { imageUrl: '/banner_tt/thuong-hieu-uy-tin.webp', title: 'Thương hiệu Uy tín', href: '#brands-section' }
];

export const VOUCHERS = [
  { title: 'Giảm 10K - CHAOHE10', desc: 'Giảm 10K khi mua các sản phẩm thuộc nhóm "Kem, gel..."', date: '22/07/2026', type: 'CT' },
  { title: 'Chào bạn mới - C.T Mart', desc: 'Tặng mã 30K cho KH đăng ký tài khoản mới', date: '10 ngày', type: 'CT' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO1 SP nhóm Giặt Xả của Unilever từ 379k', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO2 SP nhóm Dọn dẹp nhà của Unilever từ...', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 5K - Unilever', desc: 'Nhập mã COMBO3 SP nhóm dọn dẹp nhà của U...', date: '22/07/2026', type: 'Unilever' }
];

export const MOCK_RECIPES = [
  { id: '1', title: 'Salad đảo ức gà và đậu đỏ', imageUrl: '/click-and-cook/salad-ga.webp' },
  { id: '2', title: 'Bánh tráng gạo lứt cuốn ức gà', imageUrl: '/click-and-cook/banhtranggaoluc.webp' },
  { id: '3', title: 'Súp ức gà rau củ', imageUrl: '/click-and-cook/supucgaraucu.webp' },
  { id: '4', title: 'Bắp cải bọc đậu hũ ức gà', imageUrl: '/click-and-cook/bapcaibocucga.webp' },
  { id: '5', title: 'Gỏi tôm xoài chua ngọt', imageUrl: '/click-and-cook/goitomxoai.webp' },
];

export const ARTICLES = [
  { id: 1, title: 'Bí quyết chọn trái cây tươi ngon cho gia đình', desc: 'Những mẹo nhỏ giúp bạn luôn chọn được trái cây tươi, ngọt và an toàn...', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', date: '21/07/2026' },
  { id: 2, title: 'Cách bảo quản thịt cá trong tủ lạnh đúng cách', desc: 'Bảo quản thực phẩm đúng cách không chỉ giúp giữ được dinh dưỡng mà còn...', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', date: '20/07/2026' },
  { id: 3, title: 'Top 5 món ăn thanh mát giải nhiệt mùa hè', desc: 'Mùa hè nắng nóng, hãy trổ tài làm ngay 5 món ăn giải nhiệt cực đỉnh này...', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', date: '19/07/2026' },
  { id: 4, title: 'Chương trình Tích điểm đổi quà siêu hấp dẫn', desc: 'Từ tháng 8 này, C.T Mart tung ra chương trình tích điểm hoàn toàn mới...', imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=400&q=80', date: '18/07/2026' },
];

export const CATEGORIES = [
  { id: '1', name: 'Rau củ, trái cây', slug: 'rau-cu-trai-cay', imageUrl: '/icons/rau-cu-qua.png' },
  { id: '2', name: 'Thịt, trứng, hải sản', slug: 'thit-trung-hai-san', imageUrl: '/icons/thit-tung-hai-san.png' },
  { id: '3', name: 'Thức ăn chế biến, bún tươi', slug: 'thuc-an-che-bien-bun-tuoi', imageUrl: '/icons/thuc-pham-an-lien.png' },
  { id: '4', name: 'Thực phẩm đông, mát', slug: 'thuc-pham-dong-mat', imageUrl: '/icons/thuc-pham-dong-lanh.png' },
  { id: '5', name: 'Sữa, sản phẩm từ sữa', slug: 'sua-san-pham-tu-sua', imageUrl: '/icons/sua.png' },
  { id: '6', name: 'Thức uống', slug: 'thuc-uong', imageUrl: '/icons/nuoc-ngot.png' },
  { id: '7', name: 'Bánh, kẹo, snack', slug: 'banh-keo-snack', imageUrl: '/icons/banh-keo.png' },
  { id: '8', name: 'Gia vị, gạo, thực phẩm khô', slug: 'gia-vi-gao-thuc-pham-kho', imageUrl: '/icons/gao-dokho.png' },
  { id: '9', name: 'Sản phẩm cho bé', slug: 'san-pham-cho-be', imageUrl: '/icons/san-pham-cho-be.png' },
  { id: '10', name: 'Chăm sóc cá nhân', slug: 'cham-soc-ca-nhan', imageUrl: '/icons/cham-soc-ca-nhan.png' },
  { id: '11', name: 'Nhà cửa và đời sống', slug: 'nha-cua-va-doi-song', imageUrl: '/icons/nha-cua-doi-song.png' },
  { id: '12', name: 'Shop nổi bật', slug: 'shop-noi-bat', imageUrl: '/icons/shop-noi-bat.svg' },
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
