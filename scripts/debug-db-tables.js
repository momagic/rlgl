
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log('Tables:', res.rows.map(r => r.table_name));

        for (const table of res.rows) {
            const tableName = table.table_name;
            const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [tableName]);
            console.log(`\nColumns for ${tableName}:`);
            cols.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

            // Peek at data
            const preview = await client.query(`SELECT * FROM ${tableName} LIMIT 5`);
            console.log(`Preview of ${tableName}:`, preview.rows);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

listTables();
