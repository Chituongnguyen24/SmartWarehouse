const assert = require('assert');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 KIỂM THỬ HỆ THỐNG GỢI Ý FLASHSALE & XẢ KHO THÔNG MINH');
  console.log('====================================================\n');

  // Test 1: Query Flash Sale suggestions from inventory-service
  console.log('👉 [1/3] KIỂM TRA API GỢI Ý XẢ KHO (inventory-service:3011)...');
  const res = await fetch('http://localhost:3011/inventory/flashsale-suggestions');
  assert.strictEqual(res.ok, true, `API FlashSale Suggestions phải trả về 200, got ${res.status}`);
  const data = await res.json();

  assert(typeof data.totalSuggestions === 'number', 'Phải có totalSuggestions');
  assert(typeof data.criticalCount === 'number', 'Phải có criticalCount');
  assert(typeof data.highRiskCount === 'number', 'Phải có highRiskCount');
  assert(typeof data.overstockCount === 'number', 'Phải có overstockCount');
  assert(typeof data.totalPotentialLossAtRisk === 'number', 'Phải có totalPotentialLossAtRisk');
  assert(Array.isArray(data.suggestions), 'Phải có mảng suggestions');

  console.log(`   ✅ Tổng số gợi ý phân tích: ${data.totalSuggestions}`);
  console.log(`   🚨 Báo động đỏ (<= 5 ngày): ${data.criticalCount}`);
  console.log(`   ⏰ Cảnh báo cao (6 - 12 ngày): ${data.highRiskCount}`);
  console.log(`   📦 Tồn ứ đọng (> 150 SP): ${data.overstockCount}`);
  console.log(`   💰 Giá trị vốn nguy cơ mất trắng: ${data.totalPotentialLossAtRisk.toLocaleString('vi-VN')}đ`);

  // Test 2: Validate suggestion item fields
  console.log('\n👉 [2/3] KIỂM TRA ĐỘ CHÍNH XÁC CỦA DỮ LIỆU ĐỀ XUẤT...');
  assert(data.suggestions.length > 0, 'Phải có ít nhất 1 gợi ý xả kho');
  const first = data.suggestions[0];
  assert(first.productId, 'Phải có productId');
  assert(first.sku, 'Phải có sku');
  assert(first.lotCode, 'Phải có lotCode');
  assert(first.urgencyTier, 'Phải có urgencyTier');
  assert(first.suggestedDiscountPercent > 0, 'Mức chiết khấu phải > 0');
  assert(first.suggestedFlashSalePrice > 0, 'Giá sale phải > 0');
  assert(first.suggestedQuota > 0, 'Suất bán quota phải > 0');
  assert(first.recommendationReason, 'Phải có lý do khuyến nghị');

  console.log(`   ✅ Sản phẩm đầu bảng đề xuất: ${first.productName} (${first.sku})`);
  console.log(`      • Lô hàng: ${first.lotCode} | Kho: ${first.warehouseCode}`);
  console.log(`      • Hạn dùng: ${new Date(first.earliestExpiryDate).toLocaleDateString('vi-VN')} (Còn ${first.daysRemaining} ngày)`);
  console.log(`      • Tồn kho: ${first.nearExpiryStock}/${first.totalStock} ${first.unit}`);
  console.log(`      • Giá gốc: ${first.originalPrice.toLocaleString('vi-VN')}đ -> Giảm: -${first.suggestedDiscountPercent}% -> Giá Flash Sale: ${first.suggestedFlashSalePrice.toLocaleString('vi-VN')}đ`);
  console.log(`      • Quota: ${first.suggestedQuota} ${first.unit} | Doanh thu thu hồi: ${first.estimatedRevenueSaved.toLocaleString('vi-VN')}đ`);
  console.log(`      • Lý do: "${first.recommendationReason}"`);

  // Test 3: Test batch flash sale activation on product-service
  console.log('\n👉 [3/3] KIỂM TRA API BATCH KÍCH HOẠT FLASHSALE (product-service:3010)...');
  const testProduct = data.suggestions.find(s => s.imageUrl && s.originalPrice > 0) || data.suggestions[0];
  const originalState = {
    productId: testProduct.productId,
    price: testProduct.currentPrice,
    originalPrice: testProduct.originalPrice,
    discountPercent: testProduct.currentDiscountPercent,
    isFlashSale: testProduct.isAlreadyFlashSale,
  };

  const activatePayload = {
    items: [
      {
        productId: testProduct.productId,
        price: testProduct.suggestedFlashSalePrice,
        originalPrice: testProduct.originalPrice,
        discountPercent: testProduct.suggestedDiscountPercent,
        isFlashSale: true,
      }
    ]
  };

  const batchRes = await fetch('http://localhost:3010/products/batch-flash-sale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
    body: JSON.stringify(activatePayload),
  });

  assert.strictEqual(batchRes.ok, true, `Batch Flash Sale phải thành công, got ${batchRes.status}`);
  const batchData = await batchRes.json();
  assert(batchData.successCount >= 1, 'Phải cập nhật ít nhất 1 sản phẩm');
  console.log(`   ✅ Kích hoạt thành công Flash Sale cho ${batchData.successCount} sản phẩm.`);

  // Verify on product service
  const verifyRes = await fetch(`http://localhost:3010/products/${testProduct.productId}`);
  assert.strictEqual(verifyRes.ok, true, 'Truy vấn sản phẩm phải thành công');
  const updatedProd = await verifyRes.json();
  assert.strictEqual(updatedProd.isFlashSale, true, 'Sản phẩm phải có isFlashSale = true');
  assert.strictEqual(Number(updatedProd.price), testProduct.suggestedFlashSalePrice, 'Giá phải bằng giá flash sale đề xuất');
  console.log(`   ✅ Đã xác thực trạng thái sản phẩm trên product-service: isFlashSale=true, giá=${updatedProd.price}đ`);

  // Revert product state
  await fetch('http://localhost:3010/products/batch-flash-sale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
    body: JSON.stringify({ items: [originalState] }),
  });
  console.log(`   🔄 Đã phục hồi trạng thái ban đầu an toàn cho sản phẩm test.`);

  console.log('\n====================================================');
  console.log('🎉 TẤT CẢ 3 BƯỚC KIỂM THỬ ĐÃ ĐẠT CHUẨN 100%!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
