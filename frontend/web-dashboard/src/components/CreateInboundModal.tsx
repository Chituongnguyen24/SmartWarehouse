import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Upload, Download, FileText, 
  Package, Building, AlertCircle, CheckCircle2,
  Search, ChevronDown
} from 'lucide-react';

interface CreateInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: any) => void;
  token: string | null;
  user: any;
  defaultWarehouse?: string;
}

interface InboundItemInput {
  sku: string;
  productName: string;
  unit: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
}

interface ProductCatalogItem {
  sku: string;
  name: string;
  unit: string;
  price: number;
  category?: string;
}

const DEFAULT_PRODUCTS: ProductCatalogItem[] = [
  { sku: 'DAYDIEN-CADIVI-4.0', name: 'Dây điện Cadivi 4.0 (1 cuộn 100m)', unit: 'Cuộn', price: 1507000, category: 'Thiết bị điện' },
  { sku: 'DAYDIEN-CADIVI-2.5', name: 'Dây điện đơn Cadivi 2.5mm (cuộn 100m)', unit: 'Cuộn', price: 890000, category: 'Thiết bị điện' },
  { sku: 'DAYDIEN-CADIVI-1.5', name: 'Dây điện đôi Cadivi 1.5mm (cuộn 100m)', unit: 'Cuộn', price: 560000, category: 'Thiết bị điện' },
  { sku: 'BULONG-M6X20', name: 'Bulông liên kết M6x20', unit: 'Cái', price: 165, category: 'Vật tư kim khí' },
  { sku: 'BULONG-M8X30', name: 'Bulông ốc vít inox M8x30', unit: 'Cái', price: 320, category: 'Vật tư kim khí' },
  { sku: 'DENBAO-CHINT', name: 'Đèn báo CHINT', unit: 'Cái', price: 20500, category: 'Thiết bị điện' },
  { sku: 'DENBAO-PHA-22', name: 'Đèn báo pha phi 22 ND16-22A/2', unit: 'Cái', price: 20400, category: 'Thiết bị điện' },
  { sku: 'DENBAO-NGUON-AD16', name: 'Đèn báo nguồn hiển thị điện áp AC 80-500V OX-AD16 22mm', unit: 'Cái', price: 50000, category: 'Thiết bị điện' },
  { sku: 'CB-PANASONIC-30A', name: 'Aptomat CB khối Panasonic 2P 30A', unit: 'Cái', price: 145000, category: 'Thiết bị điện' },
  { sku: 'BANG-KEO-DIEN-NANO', name: 'Băng keo điện Nano chống cháy', unit: 'Cuộn', price: 12000, category: 'Vật tư phụ' },
  { sku: 'CAN-TULIP-340G', name: 'Thịt heo Tulip 40% Less Sodium có khóa 340g', unit: 'Hộp', price: 115200, category: 'Đồ hộp' },
  { sku: 'MILK-DALAT-1L', name: 'Sữa tươi Đà Lạt True Milk 1L', unit: 'Hộp', price: 38000, category: 'Sữa & Bơ' },
  { sku: 'BEV-KNOR-500ML', name: 'Nước mắm Knorr chai 500ml', unit: 'Chai', price: 27500, category: 'Gia vị' },
  { sku: 'OIL-COOK-1L', name: 'Dầu ăn Simply nguyên chất 1L', unit: 'Chai', price: 62000, category: 'Gia vị' },
  { sku: 'RICE-ST25-5KG', name: 'Gạo ST25 Ông Cua túi 5kg', unit: 'Túi', price: 195000, category: 'Lương thực' },
];

// Helper to remove Vietnamese diacritics for smart search
function removeVietnameseDiacritics(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const CreateInboundModal: React.FC<CreateInboundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  user,
  defaultWarehouse = 'WH-006'
}) => {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'FILE'>('MANUAL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states (MISA AMIS Enterprise Standard)
  const [transactionType, setTransactionType] = useState<'NHAP_MUA_NCC' | 'HANG_TRA_LAI' | 'DIEU_CHUYEN' | 'KIEM_KE_THUA'>('NHAP_MUA_NCC');
  const [supplierTaxCode, setSupplierTaxCode] = useState<string>('0314892716');
  const [vatRate, setVatRate] = useState<number>(8);
  const [warehouseCode, setWarehouseCode] = useState<string>(
    user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? user.warehouseCode : defaultWarehouse
  );
  const [supplierName, setSupplierName] = useState<string>('CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT');
  const [delivererName, setDelivererName] = useState<string>('Nguyễn Văn Giao');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('1379');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('Nhập mua vật tư, hàng hóa theo hóa đơn từ nhà cung cấp');
  const [notes, setNotes] = useState<string>('');
  const [issuerName, setIssuerName] = useState<string>(user?.name || 'Nguyễn Hoàng Nam');

  // Product Catalog
  const [productCatalog, setProductCatalog] = useState<ProductCatalogItem[]>(DEFAULT_PRODUCTS);
  
  // Track open search popups by index and field ('name' | 'sku')
  const [activeSearch, setActiveSearch] = useState<{ index: number; field: 'name' | 'sku' } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic Items List
  const [items, setItems] = useState<InboundItemInput[]>([
    { sku: 'BULONG-M6X20', productName: 'Bulông liên kết M6x20', unit: 'Cái', expectedQuantity: 200, receivedQuantity: 200, unitPrice: 165 },
    { sku: 'DAYDIEN-CADIVI-4.0', productName: 'Dây điện Cadivi 4.0 (1 cuộn 100m)', unit: 'Cuộn', expectedQuantity: 5, receivedQuantity: 5, unitPrice: 1507000 },
    { sku: 'DENBAO-CHINT', productName: 'Đèn báo CHINT', unit: 'Cái', expectedQuantity: 70, receivedQuantity: 70, unitPrice: 20500 },
  ]);

  // File Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileParsedItems, setFileParsedItems] = useState<InboundItemInput[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch all live products
  useEffect(() => {
    fetch('http://localhost:3010/products?limit=500')
      .then(res => res.json())
      .then(data => {
        const rawItems = Array.isArray(data) ? data : (data.items || data.products || data.data || []);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const mapped: ProductCatalogItem[] = rawItems.map((p: any) => ({
            sku: p.sku || `SKU-${p.id}`,
            name: p.name || p.productName,
            unit: p.unit || 'Cái',
            price: Number(p.price) || 25000,
            category: p.category || 'Hàng hóa'
          }));
          setProductCatalog(prev => {
            const combined = [...mapped, ...DEFAULT_PRODUCTS];
            return combined.filter((v, i, a) => a.findIndex(t => t.sku === v.sku) === i);
          });
        }
      })
      .catch(() => {});
  }, []);

  // Lazy Search: When query is empty, do NOT show all items!
  const filteredCatalog = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return []; // LAZY SEARCH: Empty list when not typing
    }
    const cleanQ = removeVietnameseDiacritics(trimmed);
    return productCatalog.filter(p => {
      const cleanName = removeVietnameseDiacritics(p.name);
      const cleanSku = removeVietnameseDiacritics(p.sku);
      const cleanCategory = p.category ? removeVietnameseDiacritics(p.category) : '';
      return cleanName.includes(cleanQ) || cleanSku.includes(cleanQ) || cleanCategory.includes(cleanQ);
    });
  }, [productCatalog, searchQuery]);

  if (!isOpen) return null;

  // Add Item Row
  const handleAddItem = () => {
    const defaultItem = productCatalog[0] || DEFAULT_PRODUCTS[0];
    setItems(prev => [
      ...prev,
      {
        sku: defaultItem.sku,
        productName: defaultItem.name,
        unit: defaultItem.unit,
        expectedQuantity: 10,
        receivedQuantity: 10,
        unitPrice: defaultItem.price
      }
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Phiếu nhập kho phải có ít nhất 1 mặt hàng!');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Select Product from Search Dropdown
  const handleSelectProduct = (index: number, product: ProductCatalogItem) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        sku: product.sku,
        productName: product.name,
        unit: product.unit,
        unitPrice: product.price
      };
      return next;
    });
    setActiveSearch(null);
    setSearchQuery('');
  };

  // Direct edit of fields
  const handleItemFieldChange = (index: number, field: keyof InboundItemInput, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = 
`STT,TenSanPham,SKU,DonViTinh,SoLuongChungTu,SoLuongThucNhap,DonGia,NhaCungCap,SoHoaDon,LyDoNhap
1,Bulông liên kết M6x20,BULONG-M6X20,Cái,200,200,165,CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT,1379,Nhập mua theo hóa đơn
2,Dây điện Cadivi 4.0 (1 cuộn 100m),DAYDIEN-CADIVI-4.0,Cuộn,5,5,1507000,CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT,1379,Nhập mua theo hóa đơn
3,Đèn báo CHINT,DENBAO-CHINT,Cái,70,70,20500,CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT,1379,Nhập mua theo hóa đơn
4,Đèn báo pha phi 22 ND16-22A/2,DENBAO-PHA-22,Cái,80,80,20400,CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT,1379,Nhập mua theo hóa đơn
5,Đèn báo nguồn hiển thị điện áp AC 80-500V OX-AD16 22mm,DENBAO-NGUON-AD16,Cái,45,45,50000,CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT,1379,Nhập mua theo hóa đơn`;

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mau_Phieu_Nhap_Kho_01VT.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Parse Uploaded CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length <= 1) {
          setUploadError('File rỗng hoặc không có dữ liệu hàng!');
          return;
        }

        const parsed: InboundItemInput[] = [];
        let extractedSupplier = '';
        let extractedInvoice = '';
        let extractedReason = '';

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 6) {
            const name = cols[1] || 'Sản phẩm nhập';
            const sku = cols[2] || `SKU-${i}`;
            const unit = cols[3] || 'Cái';
            const expectedQty = Math.max(1, parseInt(cols[4], 10) || 1);
            const receivedQty = Math.max(1, parseInt(cols[5], 10) || expectedQty);
            const price = parseFloat(cols[6]) || 25000;

            if (cols[7]) extractedSupplier = cols[7];
            if (cols[8]) extractedInvoice = cols[8];
            if (cols[9]) extractedReason = cols[9];

            parsed.push({
              productName: name,
              sku,
              unit,
              expectedQuantity: expectedQty,
              receivedQuantity: receivedQty,
              unitPrice: price
            });
          }
        }

        if (parsed.length === 0) {
          setUploadError('Không thể trích xuất sản phẩm từ file. Vui lòng dùng đúng file mẫu!');
          return;
        }

        setFileParsedItems(parsed);
        if (extractedSupplier) setSupplierName(extractedSupplier);
        if (extractedInvoice) setInvoiceNumber(extractedInvoice);
        if (extractedReason) setReason(extractedReason);
      } catch (err) {
        setUploadError('Lỗi đọc file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItems = activeTab === 'FILE' && fileParsedItems.length > 0 ? fileParsedItems : items;

    if (!finalItems.length) {
      alert('Vui lòng thêm ít nhất 1 mặt hàng nhập kho!');
      return;
    }

    try {
      const payload = {
        warehouseCode,
        warehouseId: warehouseCode,
        supplierId: supplierName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) || 'SUP-01',
        supplierName,
        delivererName,
        invoiceNumber,
        requestedBy: issuerName,
        expectedDate: invoiceDate,
        notes: `[Theo HĐ số ${invoiceNumber} ngày ${invoiceDate}] - ${reason} ${notes ? `(${notes})` : ''}`,
        items: finalItems.map(it => ({
          sku: it.sku,
          productName: it.productName,
          unit: it.unit,
          expectedQuantity: it.expectedQuantity,
          receivedQuantity: it.receivedQuantity,
          unitPrice: it.unitPrice,
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString()
        }))
      };

      const res = await fetch('http://localhost:3006/inbound-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newOrder = await res.json();
        onSuccess(newOrder);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Lỗi tạo phiếu nhập: ${err.message || 'Thất bại'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo phiếu nhập kho');
    }
  };

  const currentItems = activeTab === 'FILE' && fileParsedItems.length > 0 ? fileParsedItems : items;
  const totalExpectedQty = currentItems.reduce((s, i) => s + (Number(i.expectedQuantity) || 0), 0);
  const totalReceivedQty = currentItems.reduce((s, i) => s + (Number(i.receivedQuantity) || 0), 0);
  const totalAmount = currentItems.reduce((s, i) => s + ((Number(i.receivedQuantity) || Number(i.expectedQuantity) || 0) * (Number(i.unitPrice) || 0)), 0);

  return (
    <div 
      onClick={() => setActiveSearch(null)}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px',
          maxWidth: '980px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: '#0f766e',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Tạo Yêu Cầu Nhập Kho (Mẫu số 01 - VT)</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                Hỗ trợ tìm kiếm Tên & SKU thông minh hoặc tải lên file mẫu Excel/CSV
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '6px 24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              color: activeTab === 'MANUAL' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'MANUAL' ? '3px solid #0f766e' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={16} /> 1. Nhập thủ công & Search Sản Phẩm
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FILE')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              color: activeTab === 'FILE' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'FILE' ? '3px solid #0f766e' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={16} /> 2. Nhập từ File Excel / CSV
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* General Information Card */}
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={16} color="#0f766e" /> Thông Tin Chung Phiếu Nhập Kho (Mẫu 01 - VT)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Loại Nghiệp Vụ Nhập Kho (MISA) *
                </label>
                <select
                  value={transactionType}
                  onChange={e => setTransactionType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff', color: '#1e293b' }}
                >
                  <option value="NHAP_MUA_NCC">🏷️ 1. Nhập mua hàng từ NCC (Nợ 1561/1331 - Có 331)</option>
                  <option value="HANG_TRA_LAI">🏷️ 2. Hàng bán bị trả lại (Nợ 1561 - Có 632)</option>
                  <option value="DIEU_CHUYEN">🏷️ 3. Nhập điều chuyển nội bộ (Nợ 1561 - Có 1561)</option>
                  <option value="KIEM_KE_THUA">🏷️ 4. Nhập thừa kiểm kê (Nợ 1561 - Có 3381, 711)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nhập Tại Kho *
                </label>
                <select
                  value={warehouseCode}
                  onChange={e => setWarehouseCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#fff' }}
                >
                  <option value="WH-006">🏢 Kho Gò Vấp (WH-006) - 350 Quang Trung</option>
                  <option value="WH-001">🏢 Kho Quận 12 (WH-001) - 12 Tô Ký</option>
                  <option value="WH-002">🏢 Kho Thủ Đức (WH-002) - 1 Võ Văn Ngân</option>
                  <option value="WH-005">🏢 Kho Bình Thạnh (WH-005) - 150 Điện Biên Phủ</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Đơn Vị / Nhà Cung Cấp Giao *
                </label>
                <input
                  required
                  type="text"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="Ví dụ: CÔNG TY TNHH THIẾT BỊ TÂN AN PHÁT"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Mã Số Thuế NCC (MST)
                </label>
                <input
                  type="text"
                  value={supplierTaxCode}
                  onChange={e => setSupplierTaxCode(e.target.value)}
                  placeholder="Ví dụ: 0314892716"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Người Giao Hàng *
                </label>
                <input
                  required
                  type="text"
                  value={delivererName}
                  onChange={e => setDelivererName(e.target.value)}
                  placeholder="Họ tên tài xế / người giao"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Theo Hóa Đơn Số *
                </label>
                <input
                  required
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Ví dụ: 1379 hoặc HĐ-0012"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ngày Hóa Đơn *
                </label>
                <input
                  required
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Lý Do Nhập Kho *
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="Nhập mua vật tư, hàng hóa theo hóa đơn từ nhà cung cấp">Nhập mua vật tư, hàng hóa theo hóa đơn từ NCC</option>
                  <option value="Nhập điều chuyển nội bộ từ kho khác">Nhập điều chuyển nội bộ từ kho khác</option>
                  <option value="Nhập hàng khách trả lại / bảo hành">Nhập hàng khách trả lại / bảo hành</option>
                  <option value="Nhập thành phẩm sản xuất">Nhập thành phẩm sản xuất</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Người Lập Phiếu
                </label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={e => setIssuerName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ghi Chú
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Khu vực lưu, kiểm định QC..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* TAB 1: MANUAL ITEM ENTRY WITH SEARCH */}
          {activeTab === 'MANUAL' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="#0f766e" /> Danh Mục Mặt Hàng Nhập Kho ({items.length})
                </h4>

                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    background: '#f0fdfa', color: '#0f766e', fontWeight: 800, fontSize: '0.85rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #99f6e4'
                  }}
                >
                  <Plus size={14} /> Thêm Mặt Hàng
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <tr>
                      <th style={{ padding: '10px 10px', width: '32px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '10px 12px', minWidth: '240px' }}>Tên, Nhãn Hiệu Vật Tư (Search 🔍)</th>
                      <th style={{ padding: '10px 12px', width: '160px' }}>Mã Số SKU (Search 🔍)</th>
                      <th style={{ padding: '10px 8px', width: '60px', textAlign: 'center' }}>ĐVT</th>
                      <th style={{ padding: '10px 8px', width: '80px', textAlign: 'center' }}>Theo CT</th>
                      <th style={{ padding: '10px 8px', width: '80px', textAlign: 'center' }}>Thực Nhập</th>
                      <th style={{ padding: '10px 10px', width: '100px', textAlign: 'right' }}>Đơn Giá (₫)</th>
                      <th style={{ padding: '10px 10px', width: '110px', textAlign: 'right' }}>Thành Tiền (₫)</th>
                      <th style={{ padding: '10px 8px', width: '34px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const itemTotal = (it.receivedQuantity || it.expectedQuantity || 0) * (it.unitPrice || 0);
                      const isNameActive = activeSearch?.index === idx && activeSearch?.field === 'name';
                      const isSkuActive = activeSearch?.index === idx && activeSearch?.field === 'sku';

                      return (
                        <tr key={idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                          
                          {/* PRODUCT NAME (SEARCHABLE COMBOBOX) */}
                          <td style={{ padding: '8px 12px', position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={isNameActive ? searchQuery : it.productName}
                                placeholder="Gõ tên vật tư cần nhập..."
                                onFocus={() => {
                                  setActiveSearch({ index: idx, field: 'name' });
                                  setSearchQuery('');
                                }}
                                onChange={e => {
                                  setSearchQuery(e.target.value);
                                  handleItemFieldChange(idx, 'productName', e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '7px 28px 7px 10px',
                                  borderRadius: '8px',
                                  border: isNameActive ? '2px solid #0f766e' : '1px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  background: '#fff',
                                  outline: 'none'
                                }}
                              />
                              <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
                            </div>

                            {/* SEARCH DROPDOWN POPUP: ONLY OPENS WHEN USER TYPES */}
                            {isNameActive && searchQuery.trim().length > 0 && (
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '12px',
                                  right: '12px',
                                  zIndex: 9999,
                                  background: '#fff',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                  border: '1px solid #cbd5e1',
                                  maxHeight: '230px',
                                  overflowY: 'auto',
                                  marginTop: '4px'
                                }}
                              >
                                {filteredCatalog.length === 0 ? (
                                  <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                                    Không tìm thấy vật tư khớp với "<b>{searchQuery}</b>"
                                  </div>
                                ) : (
                                  filteredCatalog.map(p => (
                                    <div
                                      key={p.sku}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectProduct(idx, p);
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: it.sku === p.sku ? '#f0fdfa' : '#fff'
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                      onMouseLeave={e => (e.currentTarget.style.background = it.sku === p.sku ? '#f0fdfa' : '#fff')}
                                    >
                                      <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{p.name}</p>
                                        <span style={{ fontSize: '0.75rem', color: '#0f766e', fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</span>
                                      </div>
                                      <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '0.85rem' }}>
                                        {p.price.toLocaleString('vi-VN')} ₫
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* SKU (SEARCHABLE COMBOBOX) */}
                          <td style={{ padding: '8px 12px', position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={isSkuActive ? searchQuery : it.sku}
                                placeholder="Nhập mã SKU..."
                                onFocus={() => {
                                  setActiveSearch({ index: idx, field: 'sku' });
                                  setSearchQuery('');
                                }}
                                onChange={e => {
                                  setSearchQuery(e.target.value);
                                  handleItemFieldChange(idx, 'sku', e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '7px 24px 7px 8px',
                                  borderRadius: '8px',
                                  border: isSkuActive ? '2px solid #0f766e' : '1px solid #cbd5e1',
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: '#0f766e',
                                  background: '#f8fafc',
                                  outline: 'none'
                                }}
                              />
                              <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
                            </div>

                            {/* SKU SEARCH DROPDOWN POPUP: ONLY OPENS WHEN USER TYPES */}
                            {isSkuActive && searchQuery.trim().length > 0 && (
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '12px',
                                  width: '280px',
                                  zIndex: 9999,
                                  background: '#fff',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                  border: '1px solid #cbd5e1',
                                  maxHeight: '230px',
                                  overflowY: 'auto',
                                  marginTop: '4px'
                                }}
                              >
                                {filteredCatalog.length === 0 ? (
                                  <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                                    Không tìm thấy SKU
                                  </div>
                                ) : (
                                  filteredCatalog.map(p => (
                                    <div
                                      key={p.sku}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectProduct(idx, p);
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: it.sku === p.sku ? '#f0fdfa' : '#fff'
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                      onMouseLeave={e => (e.currentTarget.style.background = it.sku === p.sku ? '#f0fdfa' : '#fff')}
                                    >
                                      <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#0f766e', fontSize: '0.8rem', fontFamily: 'monospace' }}>{p.sku}</p>
                                        <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{p.name}</p>
                                      </div>
                                      <span style={{ fontWeight: 700, color: '#0f766e', fontSize: '0.8rem' }}>
                                        {p.price.toLocaleString('vi-VN')} ₫
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          {/* UNIT */}
                          <td style={{ padding: '8px 8px' }}>
                            <input
                              type="text"
                              value={it.unit}
                              onChange={e => handleItemFieldChange(idx, 'unit', e.target.value)}
                              style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.85rem' }}
                            />
                          </td>

                          {/* EXPECTED QUANTITY */}
                          <td style={{ padding: '8px 8px' }}>
                            <input
                              type="number"
                              min={1}
                              value={it.expectedQuantity}
                              onChange={e => handleItemFieldChange(idx, 'expectedQuantity', parseInt(e.target.value, 10) || 1)}
                              style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.85rem' }}
                            />
                          </td>

                          {/* RECEIVED QUANTITY */}
                          <td style={{ padding: '8px 8px' }}>
                            <input
                              type="number"
                              min={0}
                              value={it.receivedQuantity}
                              onChange={e => handleItemFieldChange(idx, 'receivedQuantity', parseInt(e.target.value, 10) || 0)}
                              style={{ width: '100%', padding: '6px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#0f766e' }}
                            />
                          </td>

                          {/* UNIT PRICE */}
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="number"
                              min={0}
                              value={it.unitPrice}
                              onChange={e => handleItemFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '6px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '0.85rem' }}
                            />
                          </td>

                          {/* ITEM TOTAL */}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#0f766e', fontSize: '0.9rem' }}>
                            {itemTotal.toLocaleString('vi-VN')} ₫
                          </td>

                          {/* DELETE ROW */}
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'none', border: 'none', color: '#be123c', cursor: 'pointer', padding: '4px' }}
                              title="Xóa dòng"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD (EXCEL/CSV) */}
          {activeTab === 'FILE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdfa', padding: '14px 18px', borderRadius: '12px', border: '1px solid #ccfbf1' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#0f766e', fontWeight: 800, fontSize: '0.95rem' }}>File Mẫu Nhập Kho (Template CSV/Excel Mẫu 01-VT)</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Tải file mẫu về máy, điền danh sách hàng nhập theo chứng từ và tải lên hệ thống.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#0f766e', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(15,118,110,0.2)'
                  }}
                >
                  <Download size={16} /> Tải File Mẫu (.csv)
                </button>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #0f766e',
                  borderRadius: '16px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Upload size={36} color="#0f766e" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  {uploadedFileName ? `Đã chọn: ${uploadedFileName}` : 'Nhấn vào đây để tải file danh sách nhập kho'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Hỗ trợ định dạng: .CSV, .XLSX (Tự động đọc mã SKU, SL chứng từ, SL thực nhập, đơn giá)
                </p>
              </div>

              {uploadError && (
                <div style={{ background: '#ffe4e6', color: '#be123c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} /> {uploadError}
                </div>
              )}

              {/* Parsed Items Preview */}
              {fileParsedItems.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Xem Trước Danh Sách Đọc Từ File ({fileParsedItems.length} sản phẩm)
                  </h4>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', width: '38px', textAlign: 'center' }}>STT</th>
                          <th style={{ padding: '8px 12px' }}>Tên Vật Tư</th>
                          <th style={{ padding: '8px 12px' }}>Mã SKU</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>ĐVT</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Theo CT</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Thực Nhập</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Đơn Giá</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Thành Tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileParsedItems.map((it, idx) => (
                          <tr key={idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.productName}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{it.sku}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.unit}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.expectedQuantity}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#0f766e' }}>{it.receivedQuantity}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{it.unitPrice.toLocaleString('vi-VN')} ₫</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f766e' }}>
                              {(it.receivedQuantity * it.unitPrice).toLocaleString('vi-VN')} ₫
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Summary & Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            marginTop: 'auto'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Tổng SL Theo CT: <b>{totalExpectedQty}</b> | Thực Nhập: <b style={{ color: '#0f766e', fontSize: '0.95rem' }}>{totalReceivedQty} sản phẩm</b>
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Tổng Giá Trị Phiếu Nhập: <b style={{ color: '#ea580c', fontSize: '1.15rem' }}>{totalAmount.toLocaleString('vi-VN')} ₫</b>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  background: '#0f766e', color: '#fff', cursor: 'pointer', fontWeight: 800,
                  fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(15,118,110,0.3)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <CheckCircle2 size={18} /> Tạo Phiếu Nhập Kho
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
