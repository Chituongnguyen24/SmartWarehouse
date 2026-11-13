const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/web-dashboard/src/components/Warehouse3DDigitalTwin.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Update A1-A8 to 600
for (let i = 1; i <= 8; i++) {
  const rackId = `RACK-COOL-0${i}`;
  const regex = new RegExp(`(id:\\s*'${rackId}'[\\s\\S]*?maxCapacity:\\s*)\\d+`);
  content = content.replace(regex, `$1600`);
}

// Update B1-B8 to 600
for (let i = 1; i <= 8; i++) {
  const rackId = `RACK-FROZEN-0${i}`;
  const regex = new RegExp(`(id:\\s*'${rackId}'[\\s\\S]*?maxCapacity:\\s*)\\d+`);
  content = content.replace(regex, `$1600`);
}

// Update C1-C10 to 800
for (let i = 1; i <= 10; i++) {
  const rackId = i < 10 ? `RACK-DRY-0${i}` : `RACK-DRY-${i}`;
  const regex = new RegExp(`(id:\\s*'${rackId}'[\\s\\S]*?maxCapacity:\\s*)\\d+`);
  content = content.replace(regex, `$1800`);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Đã cập nhật maxCapacity chuẩn công nghiệp (600 - 800) trong Warehouse3DDigitalTwin.tsx');

