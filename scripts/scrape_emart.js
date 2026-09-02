/**
 * EMART MALL PRODUCT SCRAPER
 * Cào toàn bộ danh mục sản phẩm từ emartmall.com.vn và chuẩn hóa dữ liệu
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Danh sách toàn bộ danh mục của Emart Mall
const CATEGORIES = [
  { path: '1', title: 'BÁNH - THỰC PHẨM CHẾ BIẾN SẴN', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '2', title: 'Bánh Mặn - Ngọt', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '3', title: 'THỰC PHẨM CHẾ BIẾN SẴN', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '4', title: 'Món Ăn Hàn Quốc', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '5', title: 'Món Ăn Việt Nam', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '6', title: 'Món Ăn Khác', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '7', title: 'Đồ Uống', parent: 'Bánh - Thực phẩm chế biến sẵn' },
  { path: '8', title: 'THỰC PHẨM TƯƠI SỐNG', parent: 'Thực phẩm tươi sống' },
  { path: '12', title: 'RAU CỦ QUẢ', parent: 'Thực phẩm tươi sống' },
  { path: '13', title: 'Rau Lá', parent: 'Thực phẩm tươi sống' },
  { path: '14', title: 'Củ Quả', parent: 'Thực phẩm tươi sống' },
  { path: '15', title: 'Rau Gia Vị', parent: 'Thực phẩm tươi sống' },
  { path: '16', title: 'Nấm', parent: 'Thực phẩm tươi sống' },
  { path: '17', title: 'Đậu Hũ', parent: 'Thực phẩm tươi sống' },
  { path: '18', title: 'Gap', parent: 'Thực phẩm tươi sống' },
  { path: '19', title: 'Hữu Cơ', parent: 'Thực phẩm tươi sống' },
  { path: '20', title: 'Rau Củ Cắt Sẵn', parent: 'Thực phẩm tươi sống' },
  { path: '9', title: 'TRÁI CÂY', parent: 'Thực phẩm tươi sống' },
  { path: '10', title: 'Trái Cây Nhập Khẩu', parent: 'Thực phẩm tươi sống' },
  { path: '11', title: 'Trái Cây Nội Địa', parent: 'Thực phẩm tươi sống' },
  { path: '21', title: 'TRỨNG, THỊT - THỦY HẢI SẢN', parent: 'Thực phẩm tươi sống' },
  { path: '22', title: 'Trứng', parent: 'Thực phẩm tươi sống' },
  { path: '23', title: 'Thịt Bò', parent: 'Thực phẩm tươi sống' },
  { path: '24', title: 'Thịt Heo', parent: 'Thực phẩm tươi sống' },
  { path: '25', title: 'Thịt Gia Cầm', parent: 'Thực phẩm tươi sống' },
  { path: '26', title: 'Thủy Hải Sản', parent: 'Thực phẩm tươi sống' },
  { path: '27', title: 'Sản Phẩm Khác', parent: 'Thực phẩm tươi sống' },
  { path: '28', title: 'Gạo', parent: 'Thực phẩm tươi sống' },
  { path: '29', title: 'THỰC PHẨM KHÔ', parent: 'Thực phẩm khô' },
  { path: '103', title: 'Bánh Kẹo - Trái Cây Sấy', parent: 'Thực phẩm khô' },
  { path: '104', title: 'Hạt - Trà', parent: 'Thực phẩm khô' },
  { path: '105', title: 'Thịt - Thủy Hải Sản Khô', parent: 'Thực phẩm khô' },
  { path: '30', title: 'SẢN PHẨM NO BRAND', parent: 'Sản phẩm No Brand' },
  { path: '31', title: 'Thực Phẩm Ăn Liền - Gia Vị', parent: 'Sản phẩm No Brand' },
  { path: '32', title: 'Bánh Kẹo', parent: 'Sản phẩm No Brand' },
  { path: '33', title: 'Đồ Uống', parent: 'Sản phẩm No Brand' },
  { path: '34', title: 'Thực Phẩm Đông Lạnh', parent: 'Sản phẩm No Brand' },
  { path: '35', title: 'Chăm Sóc Cá Nhân', parent: 'Sản phẩm No Brand' },
  { path: '36', title: 'Nhà Cửa - Đời Sống', parent: 'Sản phẩm No Brand' },
  { path: '37', title: 'THƯƠNG HIỆU HÀN QUỐC', parent: 'Thương hiệu Hàn Quốc' },
  { path: '38', title: 'THỰC PHẨM', parent: 'Thương hiệu Hàn Quốc' },
  { path: '39', title: 'Gia Vị - Xốt', parent: 'Thương hiệu Hàn Quốc' },
  { path: '40', title: 'Thực Phẩm Ăn Liền', parent: 'Thương hiệu Hàn Quốc' },
  { path: '41', title: 'Bánh Kẹo', parent: 'Thương hiệu Hàn Quốc' },
  { path: '42', title: 'Sữa - Thực Phẩm Dinh Dưỡng', parent: 'Thương hiệu Hàn Quốc' },
  { path: '43', title: 'Đồ Uống', parent: 'Thương hiệu Hàn Quốc' },
  { path: '44', title: 'Thực Phẩm Mát - Đông Lạnh', parent: 'Thương hiệu Hàn Quốc' },
  { path: '106', title: 'Rong Biển - Kim Chi', parent: 'Thương hiệu Hàn Quốc' },
  { path: '45', title: 'Chăm Sóc Cá Nhân', parent: 'Thương hiệu Hàn Quốc' },
  { path: '46', title: 'Nhà Cửa - Đời Sống', parent: 'Thương hiệu Hàn Quốc' },
  { path: '47', title: 'BÁCH HÓA', parent: 'Bách Hóa' },
  { path: '50', title: 'THỰC PHẨM ĂN LIỀN', parent: 'Bách Hóa' },
  { path: '51', title: 'Thực Phẩm Ăn Liền', parent: 'Bách Hóa' },
  { path: '52', title: 'Thực Phẩm Đóng Hộp', parent: 'Bách Hóa' },
  { path: '58', title: 'SỮA', parent: 'Bách Hóa' },
  { path: '59', title: 'Sữa Nước', parent: 'Bách Hóa' },
  { path: '60', title: 'Sữa Đặc - Sữa Bột', parent: 'Bách Hóa' },
  { path: '67', title: 'THỰC PHẨM BẢO QUẢN MÁT', parent: 'Bách Hóa' },
  { path: '68', title: 'Sản Phẩm Từ Sữa', parent: 'Bách Hóa' },
  { path: '69', title: 'Sản Phẩm Từ Thịt', parent: 'Bách Hóa' },
  { path: '70', title: 'Sản Phẩm Khác', parent: 'Bách Hóa' },
  { path: '71', title: 'THỰC PHẨM ĐÔNG LẠNH', parent: 'Bách Hóa' },
  { path: '72', title: 'Thực Phẩm Chế Biến Sẵn', parent: 'Bách Hóa' },
  { path: '73', title: 'Thịt - Thủy Hải Sản', parent: 'Bách Hóa' },
  { path: '74', title: 'Sản Phẩm Khác', parent: 'Bách Hóa' },
  { path: '54', title: 'BÁNH KẸO', parent: 'Bách Hóa' },
  { path: '55', title: 'Bánh', parent: 'Bách Hóa' },
  { path: '56', title: 'Kẹo - Mứt', parent: 'Bách Hóa' },
  { path: '57', title: 'Sản Phẩm Sấy Khô', parent: 'Bách Hóa' },
  { path: '62', title: 'ĐỒ UỐNG', parent: 'Bách Hóa' },
  { path: '63', title: 'Trà - Cà Phê', parent: 'Bách Hóa' },
  { path: '64', title: 'Nước Giải Khát', parent: 'Bách Hóa' },
  { path: '65', title: 'Nước Suối', parent: 'Bách Hóa' },
  { path: '66', title: 'Đồ Uống Có Cồn', parent: 'Bách Hóa' },
  { path: '48', title: 'Dầu Ăn - Bơ', parent: 'Bách Hóa' },
  { path: '107', title: 'Nước Chấm', parent: 'Bách Hóa' },
  { path: '49', title: 'Gia Vị - Xốt', parent: 'Bách Hóa' },
  { path: '108', title: 'Bột - Hạt - Nấm Khô', parent: 'Bách Hóa' },
  { path: '61', title: 'Thực Phẩm Dinh Dưỡng', parent: 'Bách Hóa' },
  { path: '75', title: 'Thực Phẩm Chay', parent: 'Bách Hóa' },
  { path: '76', title: 'CHĂM SÓC CÁ NHÂN', parent: 'Chăm sóc cá nhân' },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function parseProductsFromHtml(html, category) {
  const products = [];
  const blocks = html.split('<div class="product-block desktop-pdt">');
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    try {
      // 1. Tên sản phẩm & Link chi tiết
      const nameMatch = block.match(/<div class="name"><a\s+href="([^"]+)">([^<]+)<\/a><\/div>/);
      if (!nameMatch) continue;
      
      const productUrl = nameMatch[1].replace(/&amp;/g, '&');
      const name = nameMatch[2].replace(/&amp;/g, '&').trim();

      // 2. Product ID (từ link hoặc onclick)
      let productId = null;
      const idMatch = productUrl.match(/product_id=([0-9]+)/);
      if (idMatch) {
        productId = parseInt(idMatch[1], 10);
      } else {
        const wishMatch = block.match(/wishlist\.add\('([0-9]+)'\)/);
        if (wishMatch) productId = parseInt(wishMatch[1], 10);
      }
      if (!productId) continue;

      // 3. Ảnh sản phẩm & Barcode EAN-13 từ đường dẫn ảnh
      let imageUrl = '';
      let barcode = '';
      const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
        // Thường ảnh có dạng: .../catalog/products/8809750470611/8809750470611-600x600.jpg
        const barcodeMatch = imageUrl.match(/\/products\/([0-9]{8,14})\//);
        if (barcodeMatch) {
          barcode = barcodeMatch[1];
        }
      }
      if (!barcode) {
        // Dự phòng: tạo mã Barcode chuẩn EAN-13 giả định từ Product ID
        barcode = `893${String(productId).padStart(9, '0')}`;
      }

      // 4. Giá bán
      let price = 0;
      let originalPrice = 0;
      let discountPercent = 0;

      const priceNewMatch = block.match(/<span class="price-new">([^<]+)<\/span>/);
      const priceOldMatch = block.match(/<span class="price-old">([^<]+)<\/span>/);
      const saleMatch = block.match(/<span class="sale-exist">([0-9]+)%<\/span>/);

      if (priceNewMatch) {
        price = parseInt(priceNewMatch[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
      if (priceOldMatch) {
        originalPrice = parseInt(priceOldMatch[1].replace(/[^0-9]/g, ''), 10) || price;
      } else {
        // Nếu không có giảm giá, tìm thẻ price chung
        const priceGeneralMatch = block.match(/<div class="price">\s*([0-9.,]+₫|\d+)/);
        if (priceGeneralMatch) {
          price = parseInt(priceGeneralMatch[1].replace(/[^0-9]/g, ''), 10) || price;
        }
        originalPrice = price;
      }
      if (saleMatch) {
        discountPercent = parseInt(saleMatch[1], 10);
      } else if (originalPrice > price && originalPrice > 0) {
        discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      // 5. Trích xuất Đơn vị tính (Unit) & Trọng lượng / Thể tích
      let unit = 'Cái';
      let weightVolume = '';

      const nameLower = name.toLowerCase();
      if (nameLower.includes('gói') || nameLower.includes('goi')) unit = 'Gói';
      else if (nameLower.includes('chai')) unit = 'Chai';
      else if (nameLower.includes('lon')) unit = 'Lon';
      else if (nameLower.includes('hộp') || nameLower.includes('hop')) unit = 'Hộp';
      else if (nameLower.includes('túi') || nameLower.includes('tui')) unit = 'Túi';
      else if (nameLower.includes('khay')) unit = 'Khay';
      else if (nameLower.includes('lốc') || nameLower.includes('loc')) unit = 'Lốc';
      else if (nameLower.includes('thùng') || nameLower.includes('thung')) unit = 'Thùng';
      else if (nameLower.includes('kg') || nameLower.includes('kilogram')) unit = 'Kg';
      else if (nameLower.includes('bịch') || nameLower.includes('bich')) unit = 'Bịch';
      else if (nameLower.includes('hũ') || nameLower.includes('hu')) unit = 'Hũ';
      else if (nameLower.includes('vỉ') || nameLower.includes('vi')) unit = 'Vỉ';

      // Trích xuất trọng lượng như 500g, 1kg, 250ml, 1.5L...
      const wvMatch = name.match(/(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|gam|gr|lit|lít))\b/i);
      if (wvMatch) {
        weightVolume = wvMatch[1].toUpperCase();
      }

      // 6. Phân loại bảo quản kho & Hạn sử dụng (Phục vụ SmartWarehouse FEFO)
      let storageType = 'DRY'; // DRY, COLD, FROZEN
      let shelfLifeDays = 365;

      const catTitle = (category.title + ' ' + category.parent).toLowerCase();
      if (catTitle.includes('đông lạnh') || nameLower.includes('đông lạnh') || nameLower.includes('kem ')) {
        storageType = 'FROZEN';
        shelfLifeDays = 180; // 6 tháng
      } else if (
        catTitle.includes('tươi sống') || 
        catTitle.includes('rau củ') || 
        catTitle.includes('trái cây') || 
        catTitle.includes('trứng') || 
        catTitle.includes('thịt') || 
        catTitle.includes('thủy hải sản') || 
        catTitle.includes('bảo quản mát') ||
        catTitle.includes('sữa nước') ||
        catTitle.includes('sản phẩm từ sữa') ||
        nameLower.includes('sữa chua') ||
        nameLower.includes('phô mai')
      ) {
        storageType = 'COLD';
        shelfLifeDays = catTitle.includes('rau') ? 7 : catTitle.includes('thịt') ? 5 : 30;
      } else if (catTitle.includes('bánh kẹo') || catTitle.includes('ăn liền') || catTitle.includes('gia vị') || catTitle.includes('đồ hộp')) {
        storageType = 'DRY';
        shelfLifeDays = 365;
      }

      // 7. Xuất xứ (Origin)
      let origin = 'Việt Nam';
      if (nameLower.includes('no brand') || catTitle.includes('hàn quốc') || nameLower.includes('hàn quốc') || barcode.startsWith('880')) {
        origin = 'Hàn Quốc';
      } else if (nameLower.includes('nhật bản') || barcode.startsWith('49') || barcode.startsWith('45')) {
        origin = 'Nhật Bản';
      } else if (nameLower.includes('thái lan') || barcode.startsWith('885')) {
        origin = 'Thái Lan';
      } else if (nameLower.includes('mỹ') || nameLower.includes('usa') || barcode.startsWith('00') || barcode.startsWith('09')) {
        origin = 'Mỹ';
      } else if (nameLower.includes('úc') || barcode.startsWith('93')) {
        origin = 'Úc';
      }

      products.push({
        id: productId,
        sku: `EM-${productId}`,
        barcode,
        name,
        category: category.title,
        categoryPath: category.path,
        parentCategory: category.parent,
        price,
        originalPrice,
        discountPercent,
        unit,
        weightVolume,
        imageUrl,
        productUrl,
        storageType,
        shelfLifeDays,
        origin,
        status: 'ACTIVE',
        isAvailable: true
      });
    } catch (e) {
      // Bỏ qua lỗi 1 item lẻ để tiếp tục cào
    }
  }

  return products;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runScraper() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU CÀO DỮ LIỆU TỪ EMART MALL (emartmall.com.vn)');
  console.log(`📋 Tổng số danh mục cần quét: ${CATEGORIES.length}`);
  console.log('====================================================\n');

  const allProductsMap = new Map(); // Dùng Map để khử trùng lặp theo ID

  for (let idx = 0; idx < CATEGORIES.length; idx++) {
    const category = CATEGORIES[idx];
    const catUrl = `https://emartmall.com.vn/index.php?route=product/category&path=${category.path}&limit=200`;
    
    process.stdout.write(`[${idx + 1}/${CATEGORIES.length}] Đang cào: [Path ${category.path}] ${category.title} ... `);

    try {
      const html = await fetchUrl(catUrl);
      const products = parseProductsFromHtml(html, category);
      
      let newCount = 0;
      for (const p of products) {
        if (!allProductsMap.has(p.id)) {
          allProductsMap.set(p.id, p);
          newCount++;
        }
      }

      console.log(`Lấy được ${products.length} SP (+${newCount} mới). Tổng hiện tại: ${allProductsMap.size} SP`);

      // Polite delay
      await sleep(250);
    } catch (err) {
      console.log(`❌ Lỗi: ${err.message}`);
      await sleep(500);
    }
  }

  const finalProducts = Array.from(allProductsMap.values());

  console.log('\n====================================================');
  console.log(`🎉 HOÀN THÀNH CÀO DỮ LIỆU!`);
  console.log(`📦 TỔNG CỘNG ĐÃ THU THẬP: ${finalProducts.length} SẢN PHẨM KHÔNG TRÙNG LẶP`);
  console.log('====================================================\n');

  // Thống kê phân loại bảo quản
  const stats = {
    total: finalProducts.length,
    byStorage: {
      DRY: finalProducts.filter(p => p.storageType === 'DRY').length,
      COLD: finalProducts.filter(p => p.storageType === 'COLD').length,
      FROZEN: finalProducts.filter(p => p.storageType === 'FROZEN').length
    },
    byOrigin: {
      'Việt Nam': finalProducts.filter(p => p.origin === 'Việt Nam').length,
      'Hàn Quốc': finalProducts.filter(p => p.origin === 'Hàn Quốc').length,
      'Khác': finalProducts.filter(p => !['Việt Nam', 'Hàn Quốc'].includes(p.origin)).length
    },
    withDiscount: finalProducts.filter(p => p.discountPercent > 0).length
  };

  console.log('📊 Thống kê dữ liệu:', JSON.stringify(stats, null, 2));

  // Lưu file JSON
  const outputPaths = [
    path.join(__dirname, '../backend/data/emart_products.json'),
    path.join(__dirname, '../frontend/web-dashboard/src/data/emart_products.json')
  ];

  for (const outPath of outputPaths) {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(finalProducts, null, 2), 'utf-8');
    console.log(`💾 Đã xuất file JSON thành công: ${outPath}`);
  }

  // Tạo thêm file tóm tắt meta.json
  const metaPath = path.join(__dirname, '../backend/data/emart_products_summary.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    scrapedAt: new Date().toISOString(),
    stats,
    categoriesCount: CATEGORIES.length
  }, null, 2), 'utf-8');
}

runScraper().catch(err => {
  console.error('Fatal error during scraping:', err);
});
