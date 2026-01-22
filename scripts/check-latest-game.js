import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await db.connect();
    console.log('🔌 Connected to DB');
    
    const res = await db.query(`
      SELECT * FROM game_history 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (res.rows.length > 0) {
      console.log('Latest Game Record:', res.rows[0]);
    } else {
      console.log('No game records found.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.end();
  }
}

main();
