const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sfwms_inventory'
  });

  await client.connect();
  console.log('Connected to sfwms_inventory database.');

  await client.query(`
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code VARCHAR UNIQUE;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS short_name VARCHAR;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'RAU_CU_QUA';
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR DEFAULT 'Công nợ 30 ngày (Net 30)';
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 4.8;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 2;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS certifications VARCHAR DEFAULT 'HACCP, ISO 22000';
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `);
  console.log('Suppliers table columns altered successfully.');

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'suppliers'
    ORDER BY ordinal_position;
  `);
  console.log('Updated suppliers columns:', cols.rows.map(r => `${r.column_name} (${r.data_type})`));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

