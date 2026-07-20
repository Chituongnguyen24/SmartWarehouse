export type CategoryType = 
  | 'Rau củ quả' 
  | 'Thịt cá' 
  | 'Đông lạnh' 
  | 'Sữa & đồ uống' 
  | 'Đồ khô' 
  | 'Gia vị & Dầu ăn';

export interface Product {
  id: string;
  name: string;
  category: CategoryType;
  price: number;            // Giá khuyến mãi (VNĐ)
  originalPrice?: number;   // Giá gốc trước khi giảm
  unit: string;             // Ví dụ: "500g", "1 kg", "Hộp 4 hộp", "Chai 1L"
  imageUrl: string;
  rating: number;
  soldCount: number;
  isFlashSale?: boolean;
  discountPercent?: number;
  origin?: string;          // Xuất xứ: "Đà Lạt", "Việt Nam", "Na Uy"
  preservation?: string;    // Bảo quản: "Kho lạnh (0-4°C)", "Đông lạnh (-18°C)"
  description?: string;
  stock: number;
}
