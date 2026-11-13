const { Client } = require('pg');

const STANDARD_CATEGORIES = [
  { name: 'Rau củ, trái cây', slug: 'rau-cu-trai-cay', imageUrl: '/icons/rau-cu-qua.png', description: 'Rau sạch, củ quả và trái cây tươi theo chuẩn VietGAP' },
  { name: 'Thịt, trứng, hải sản', slug: 'thit-trung-hai-san', imageUrl: '/icons/thit-tung-hai-san.png', description: 'Thịt tươi ngon, trứng gia cầm và hải sản tươi sống được kiểm dịch' },
  { name: 'Thức ăn chế biến, bún tươi', slug: 'thuc-an-che-bien-bun-tuoi', imageUrl: '/icons/thuc-pham-an-lien.png', description: 'Bún tươi, món ăn chế biến sẵn hợp vệ sinh an toàn thực phẩm' },
  { name: 'Thực phẩm đông, mát', slug: 'thuc-pham-dong-mat', imageUrl: '/icons/thuc-pham-dong-lanh.png', description: 'Thực phẩm bảo quản kho mát và kho cấp đông tiêu chuẩn' },
  { name: 'Sữa, sản phẩm từ sữa', slug: 'sua-san-pham-tu-sua', imageUrl: '/icons/sua.png', description: 'Sữa tươi, sữa chua, phô mai và các chế phẩm từ sữa dinh dưỡng' },
  { name: 'Thức uống', slug: 'thuc-uong', imageUrl: '/icons/nuoc-ngot.png', description: 'Nước khoáng, nước ép trái cây, trà, cà phê và đồ uống giải khát' },
  { name: 'Bánh, kẹo, snack', slug: 'banh-keo-snack', imageUrl: '/icons/banh-keo.png', description: 'Bánh ngọt, kẹo, snack giòn rụm và món ăn vặt phong phú' },
  { name: 'Gia vị, gạo, thực phẩm khô', slug: 'gia-vi-gao-thuc-pham-kho', imageUrl: '/icons/gao-dokho.png', description: 'Gạo ST25, dầu ăn, nước mắm, gia vị nhà bếp và lương thực khô' },
  { name: 'Sản phẩm cho bé', slug: 'san-pham-cho-be', imageUrl: '/icons/san-pham-cho-be.png', description: 'Sữa công thức, bột ăn dặm, tã bỉm và đồ dùng an toàn cho bé' },
  { name: 'Chăm sóc cá nhân', slug: 'cham-soc-ca-nhan', imageUrl: '/icons/cham-soc-ca-nhan.png', description: 'Dầu gội, sữa tắm, kem đánh răng và sản phẩm vệ sinh cá nhân' },
  { name: 'Nhà cửa và đời sống', slug: 'nha-cua-va-doi-song', imageUrl: '/icons/nha-cua-doi-song.png', description: 'Nước giặt, nước rửa chén, chất tẩy rửa và vật dụng gia đình' },
  { name: 'Shop nổi bật', slug: 'shop-noi-bat', imageUrl: '/icons/shop-noi-bat.svg', description: 'Gian hàng đặc sắc và thương hiệu đối tác tiêu biểu' },
];

async function syncCats() {
  const client = new Client({ user: 'postgres', host: 'localhost', database: 'sfwms_product', password: 'postgres', port: 5432 });
  await client.connect();

  // Add columns if they don't exist yet
  await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug varchar(255)');
  await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text');
  await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true');

  // Truncate old mismatched categories and insert 12 standard
  await client.query('DELETE FROM categories');

  for (const cat of STANDARD_CATEGORIES) {
    const prodCountRes = await client.query('SELECT count(*)::int FROM products WHERE category = $1', [cat.name]);
    const pCount = prodCountRes.rows[0].count;
    await client.query(
      'INSERT INTO categories (id, name, slug, image_url, description, is_active, product_count, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW())',
      [cat.name, cat.slug, cat.imageUrl, cat.description, pCount]
    );
  }

  const { rows } = await client.query('SELECT name, slug, product_count FROM categories ORDER BY created_at ASC');
  console.log('Synchronized 12 standard categories:');
  console.table(rows);

  await client.end();
}

syncCats().catch(console.error);

