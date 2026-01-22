import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW(), version()');
    console.log('✅ DB Connected:', res.rows[0]);
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables:', tables.rows.map(r => r.table_name));
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

test();
