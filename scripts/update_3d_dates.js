const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/web-dashboard/src/components/Warehouse3DDigitalTwin.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Update dates in DEFAULT_RACKS
content = content.replace(/expiryDate:\s*'02\/09\/2026'/g, "expiryDate: '20/11/2026'");
content = content.replace(/expiryDate:\s*'03\/09\/2026'/g, "expiryDate: '22/11/2026'");
content = content.replace(/expiryDate:\s*'04\/09\/2026'/g, "expiryDate: '18/12/2026'");
content = content.replace(/expiryDate:\s*'05\/09\/2026'/g, "expiryDate: '20/12/2026'");
content = content.replace(/\/09\/2026'/g, "/09/2027'");
content = content.replace(/\/10\/2026'/g, "/10/2027'");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Đã cập nhật ngày trong Warehouse3DDigitalTwin.tsx thành công!');

