const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sfwms_product',
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL sfwms_product');

  // Xóa các sản phẩm có tiền tố seed mock hoặc nằm trong danh sách seed
  const deleteQuery = `
    DELETE FROM products 
    WHERE sku LIKE 'VEG-%' 
       OR sku LIKE 'FRUIT-%' 
       OR sku LIKE 'MEAT-%' 
       OR sku LIKE 'SEAFOOD-%' 
       OR sku LIKE 'MILK-%' 
       OR sku LIKE 'DRINK-%' 
       OR sku LIKE 'DRY-%' 
       OR sku LIKE 'SNACK-%'
    RETURNING sku, name;
  `;

  const res = await client.query(deleteQuery);
  console.log(`Đã xóa ${res.rowCount} sản phẩm seed mẫu:`);
  res.rows.forEach(r => console.log(` - [Đã xóa] ${r.sku}: ${r.name}`));

  const countRes = await client.query('SELECT COUNT(*) FROM products');
  console.log(`\n=> TỔNG SỐ SẢN PHẨM THẬT CÒN LẠI TRONG DB: ${countRes.rows[0].count}`);

  const catRes = await client.query(`
    SELECT category, COUNT(*) as count 
    FROM products 
    WHERE category IS NOT NULL AND category != '' 
    GROUP BY category 
    ORDER BY count DESC
  `);
  console.log(`\n=> CÁC DANH MỤC THẬT TRONG DB (${catRes.rows.length} danh mục):`);
  catRes.rows.slice(0, 15).forEach(c => console.log(`   * ${c.category}: ${c.count} sản phẩm`));

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
