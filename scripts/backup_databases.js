/**
 * BACKUP DATABASES SCRIPT
 * Sao lưu toàn bộ dữ liệu hiện tại trước khi reset
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres'
};

const DATABASES = [
  { name: 'sfwms_product', tables: ['products'] },
  { name: 'sfwms_inventory', tables: ['inventory_lots', 'inventory_transfers', 'inventory_audits', 'inventory_logs'] },
  { name: 'sfwms_inbound', tables: ['inbound_orders', 'inbound_order_items'] },
  { name: 'sfwms_outbound', tables: ['outbound_orders', 'outbound_order_items'] },
  { name: 'sfwms_order', tables: ['orders', 'order_items'] }
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../backend/data/backup_${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📁 Thư mục sao lưu: ${backupDir}\n`);

  for (const db of DATABASES) {
    console.log(`⏳ Đang sao lưu Database: ${db.name}...`);
    const client = new Client({ ...DB_CONFIG, database: db.name });
    try {
      await client.connect();
      for (const table of db.tables) {
        try {
          const res = await client.query(`SELECT * FROM ${table}`);
          const filePath = path.join(backupDir, `${db.name}_${table}.json`);
          fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf-8');
          console.log(`  ✅ Bảng [${table}]: ${res.rows.length} bản ghi -> ${path.basename(filePath)}`);
        } catch (tblErr) {
          console.log(`  ⚠️ Bảng [${table}] chưa tồn tại hoặc rỗng: ${tblErr.message}`);
        }
      }
    } catch (dbErr) {
      console.log(`  ❌ Lỗi kết nối DB ${db.name}: ${dbErr.message}`);
    } finally {
      await client.end();
    }
  }

  console.log(`\n🎉 SAO LƯU DỰ PHÒNG HOÀN TẤT VÀO: ${backupDir}`);
  return backupDir;
}

backup().catch(console.error);
