import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const schema = `
  -- 1. Create users table with comprehensive profile data
  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    
    -- High scores per mode
    high_score_classic BIGINT DEFAULT 0,
    high_score_arcade BIGINT DEFAULT 0,
    high_score_whack BIGINT DEFAULT 0,
    
    -- Stats
    total_tokens_earned NUMERIC DEFAULT 0,
    claim_streak INTEGER DEFAULT 0,
    last_claim_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Verification
    verification_level INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 2. Create game_history table (formerly leaderboard) for individual game records
  CREATE TABLE IF NOT EXISTS game_history (
    id BIGSERIAL PRIMARY KEY,
    player TEXT NOT NULL REFERENCES users(address),
    score BIGINT NOT NULL,
    round INTEGER NOT NULL,
    game_mode TEXT NOT NULL,
    tokens_earned NUMERIC,
    game_id BIGINT,
    block_number BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to prevent duplicate game entries
    CONSTRAINT unique_game_entry UNIQUE (game_id, game_mode)
  );

  -- 3. Create indexes for fast querying
  CREATE INDEX IF NOT EXISTS idx_users_high_score_classic ON users(high_score_classic DESC);
  CREATE INDEX IF NOT EXISTS idx_users_high_score_arcade ON users(high_score_arcade DESC);
  CREATE INDEX IF NOT EXISTS idx_users_high_score_whack ON users(high_score_whack DESC);
  CREATE INDEX IF NOT EXISTS idx_users_total_tokens ON users(total_tokens_earned DESC);
  
  CREATE INDEX IF NOT EXISTS idx_game_history_player ON game_history(player);
  CREATE INDEX IF NOT EXISTS idx_game_history_score ON game_history(score DESC);
  CREATE INDEX IF NOT EXISTS idx_game_history_game_mode ON game_history(game_mode);
  CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp DESC);

  -- 4. Enable Row Level Security (RLS)
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

  -- 5. Create Policies (Idempotent)
  DO $$ 
  BEGIN
    -- Users policies
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_policies WHERE tablename = 'users' AND policyname = 'Public read access') THEN
      CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
    END IF;
    
    -- Game history policies
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_policies WHERE tablename = 'game_history' AND policyname = 'Public read access') THEN
      CREATE POLICY "Public read access" ON game_history FOR SELECT USING (true);
    END IF;
  END $$;
`;

// Helper to safely add columns if they don't exist (for existing table updates)
const migration = `
  DO $$ 
  BEGIN
    -- Add columns to users if they don't exist
    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS high_score_classic BIGINT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS high_score_arcade BIGINT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS high_score_whack BIGINT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_tokens_earned NUMERIC DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS claim_streak INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claim_timestamp TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'Table users does not exist yet, skipping ALTER';
    END;
  END $$;
`;

async function setupDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected.');

    console.log('🛠️  Running schema migration...');
    await client.query(schema);
    await client.query(migration);
    console.log('✅ Schema created/updated successfully.');

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables in public schema:', res.rows.map(r => r.table_name).join(', '));
    
    // Verify users columns
    const cols = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
    `);
    console.log('📋 User columns:', cols.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    console.error('❌ Error setting up database:', err);
  } finally {
    await client.end();
    console.log('🔌 Disconnected.');
  }
}

setupDatabase();
