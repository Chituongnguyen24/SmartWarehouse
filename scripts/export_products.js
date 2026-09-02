const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function exportProducts() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'sfwms_product',
  });

  try {
    await client.connect();
    console.log('Connected to sfwms_product database.');

    const res = await client.query('SELECT * FROM products ORDER BY sku ASC');
    console.log(`Exported ${res.rows.length} products from database.`);

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'products.json');
    fs.writeFileSync(outputPath, JSON.stringify(res.rows, null, 2), 'utf-8');
    console.log(`Saved products data to: ${outputPath}`);

    // Thống kê danh mục
    const categories = {};
    for (const row of res.rows) {
      const cat = row.category || 'Chưa phân loại';
      categories[cat] = (categories[cat] || 0) + 1;
    }
    console.log('Categories count:', Object.keys(categories).length);

    await client.end();
  } catch (error) {
    console.error('Error exporting products:', error);
    process.exit(1);
  }
}

exportProducts();
