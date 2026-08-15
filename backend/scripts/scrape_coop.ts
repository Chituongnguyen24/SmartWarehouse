import puppeteer from 'puppeteer';
import { Client } from 'pg';

// Map the extracted data to Product entity format
const mapToProduct = (item: any, keyword: string) => {
  // Try to parse price
  let price = 25000;
  if (item.price) price = item.price;
  if (item.sellPrice) price = item.sellPrice;
  if (item.latestPrice) price = item.latestPrice;

  // Try to parse image
  let image = item.image || item.imageUrl || item.thumbnail || '';
  if (item.images && item.images.length > 0) {
    image = item.images[0].url || item.images[0];
  }

  return {
    sku: item.sku || `COOP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    name: item.name || item.title || 'Sản phẩm',
    category: keyword,
    storageType: 'DRY',
    minTemp: null,
    maxTemp: null,
    maxHumidity: null,
    unit: 'Cái',
    price: price,
    imageUrl: image,
    description: item.description || '',
    origin: item.origin || 'Việt Nam',
    preservation: 'Nơi khô ráo',
    isFlashSale: false,
    discountPercent: 0,
    rating: 4.5,
    soldCount: Math.floor(Math.random() * 500),
    stock: 100,
  };
};

async function insertProducts(products: any[], client: Client) {
  let inserted = 0;
  for (const p of products) {
    try {
      await client.query(`
        INSERT INTO products (
          id, sku, name, category, storage_type, min_temp, max_temp, max_humidity, unit, 
          price, image_url, description, origin, preservation, is_flash_sale, discount_percent, 
          rating, sold_count, stock, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 
          $9, $10, $11, $12, $13, $14, $15, 
          $16, $17, $18, NOW()
        )
        ON CONFLICT (sku) DO NOTHING;
      `, [
        p.sku, p.name, p.category, p.storageType, p.minTemp, p.maxTemp, p.maxHumidity, p.unit,
        p.price, p.imageUrl, p.description, p.origin, p.preservation, p.isFlashSale, p.discountPercent,
        p.rating, p.soldCount, p.stock
      ]);
      inserted++;
    } catch (e: any) {
      console.error(`Error inserting ${p.sku}:`, e.message);
    }
  }
  return inserted;
}

async function scrapeCoopOnline() {
  const keywords = ['Gạo', 'Nước mắm', 'Rau củ', 'Thịt heo', 'Trái cây'];
  
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/sfwms_product',
  });

  try {
    await client.connect();
    console.log("Connected to database sfwms_product.");
    
    // Check if gen_random_uuid extension exists
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  } catch(e) {
    console.error("DB Connection Failed:", e);
    return;
  }

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  for (const keyword of keywords) {
    console.log(`\n=== Scraping for keyword: ${keyword} ===`);
    let capturedProducts: any[] = [];
    
    // Listen for Teko API responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('tekoapis.com') && response.request().method() !== 'OPTIONS') {
        try {
          const json = await response.json();
          // Teko discovery API structure might have products in "result.products" or similar
          if (json && json.result && json.result.products) {
            capturedProducts = capturedProducts.concat(json.result.products);
          } else if (json && json.products) {
            capturedProducts = capturedProducts.concat(json.products);
          } else if (json && json.data && json.data.products) {
            capturedProducts = capturedProducts.concat(json.data.products);
          }
        } catch (e) {
          // not json or failed to parse, ignore
        }
      }
    });

    const searchUrl = `https://cooponline.vn/search?query=${encodeURIComponent(keyword)}`;
    console.log(`Navigating to ${searchUrl}`);
    
    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      // Scroll a bit to trigger lazy loading API calls if any
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await new Promise(r => setTimeout(r, 2000));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 3000));
    } catch(e) {
      console.log(`Timeout or error loading page for ${keyword}. Checking if we captured anything anyway...`);
    }

    if (capturedProducts.length === 0) {
      console.log(`No products captured via API for ${keyword}. Falling back to DOM extraction...`);
      // Fallback DOM extraction
      const domProducts = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a[href*="/"]'));
        const products = [];
        for (const item of items) {
          // VERY rough heuristic to find product cards based on common ecommerce structures
          const img = item.querySelector('img');
          const textNodes = Array.from(item.querySelectorAll('*')).filter(el => el.children.length === 0 && el.textContent && el.textContent.trim().length > 0);
          const priceNode = textNodes.find(el => el.textContent?.includes('đ') || el.textContent?.includes('₫'));
          
          if (img && img.src && priceNode && item.textContent) {
            let name = "";
            const h3 = item.querySelector('h3');
            if (h3) name = h3.textContent || "";
            else {
               // usually the longest text block is the name
               const texts = textNodes.map(t => (t.textContent || "").trim()).filter(t => t.length > 5 && !t.includes('đ'));
               if (texts.length > 0) name = texts[0];
            }
            
            if (name.length > 5 && img.src.includes('http')) {
              let priceStr = priceNode.textContent?.replace(/[^\d]/g, '') || "0";
              products.push({
                name: name.trim(),
                price: parseInt(priceStr) || 25000,
                imageUrl: img.src,
                sku: 'DOM-' + Math.random().toString(36).substring(2, 10).toUpperCase()
              });
            }
          }
        }
        return products;
      });
      
      // Deduplicate by name
      const uniqueDom = [];
      const names = new Set();
      for(const p of domProducts) {
        if(!names.has(p.name)) {
          names.add(p.name);
          uniqueDom.push(p);
        }
      }
      capturedProducts = uniqueDom;
    }

    if (capturedProducts.length > 0) {
      console.log(`Found ${capturedProducts.length} products for ${keyword}.`);
      const mapped = capturedProducts.map(p => mapToProduct(p, keyword));
      const inserted = await insertProducts(mapped, client);
      console.log(`Successfully inserted ${inserted} products into DB.`);
    } else {
      console.log(`No products found for ${keyword}.`);
    }
    
    // Clear event listeners for the next iteration to avoid duplicating products
    page.removeAllListeners('response');
  }

  await browser.close();
  await client.end();
  console.log("\nDone scraping and inserting products!");
}

scrapeCoopOnline().catch(console.error);
