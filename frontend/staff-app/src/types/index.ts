export interface StaffUser {
  id: string;
  code?: string;
  name: string;
  email?: string;
  role: 'WAREHOUSE_STAFF' | 'WAREHOUSE_MANAGER' | 'DRIVER' | 'ADMIN' | string;
  warehouseCode: string;
  warehouseName: string;
  assignedZone?: string;
  avatar?: string;
  shift?: string;
  status?: string;
}

export interface PickingItem {
  id: string;
  orderId: string;
  orderCode: string;
  sku: string;
  productName: string;
  quantity: number;
  pickedQuantity: number;
  unit: string;
  lotCode: string;
  expiryDate: string;
  shelfLocation: string; // VD: Kệ A1-02-B
  location?: string;
  zone: 'DRY' | 'COOL' | 'FROZEN';
  barcode: string;
  status: 'PENDING' | 'PICKED' | 'SHORTAGE';
  imageUrl?: string;
  temperatureRequired?: string;
}

export interface InboundReceipt {
  id: string;
  orderCode: string;
  supplierName: string;
  expectedDate: string;
  status: 'PENDING' | 'RECEIVING' | 'QC_CHECKING' | 'STORED' | 'COMPLETED' | 'REJECTED';
  itemsCount: number;
  totalQuantity: number;
  temperatureRequired: string;
  qcPassed?: boolean;
  notes?: string;
}

export interface StockInfo {
  sku: string;
  productName: string;
  unit: string;
  totalStock: number;
  availableStock: number;
  shelfLocation: string;
  zone: string;
  category?: string;
  lots: {
    id?: string;
    lotCode: string;
    quantity: number;
    expiryDate: string;
    daysRemaining: number;
    status: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRED';
  }[];
}
