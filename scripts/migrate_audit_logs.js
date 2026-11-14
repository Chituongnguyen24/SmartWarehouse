const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  await client.connect();
  console.log('Connected to postgres database for user-service.');

  await client.query(`
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS client_app VARCHAR DEFAULT 'WEB_DASHBOARD';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_code VARCHAR;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload_before JSONB;
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload_after JSONB;
  `);
  console.log('audit_logs table altered successfully.');

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'audit_logs'
    ORDER BY ordinal_position;
  `);
  console.log('Updated audit_logs columns:', cols.rows.map(r => `${r.column_name} (${r.data_type})`));

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

