import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PLAYER_ADDRESS = '0x1fce79ea8510ee137f2aa2cc870ae701e240d5da';

async function main() {
  try {
    await db.connect();
    console.log(`🔌 Connected to DB. Checking records for: ${PLAYER_ADDRESS}`);
    
    // Check recent games in history
    const res = await db.query(`
      SELECT * FROM game_history 
      WHERE player ILIKE $1 
      ORDER BY timestamp DESC 
      LIMIT 5
    `, [PLAYER_ADDRESS]);
    
    if (res.rows.length > 0) {
      console.log('\nRecent Game History:');
      res.rows.forEach(row => {
        console.log(`- Time: ${row.timestamp}`);
        console.log(`  Round: ${row.round}`);
        console.log(`  Score: ${row.score}`);
        console.log(`  Mode: ${row.game_mode}`);
        console.log(`  Tx: ${row.transaction_hash}`);
        console.log('---');
      });
    } else {
      console.log('No game history found for this user.');
    }

    // Check user profile stats
    const userRes = await db.query(`
      SELECT * FROM users WHERE address ILIKE $1
    `, [PLAYER_ADDRESS]);

    if (userRes.rows.length > 0) {
        console.log('\nUser Profile Stats:');
        console.log(userRes.rows[0]);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.end();
  }
}

main();
