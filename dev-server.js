import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers
// Note: Redis-based API handlers removed as they're no longer needed with V2 contract

// API Routes
// Note: Legacy leaderboard API routes removed - frontend now uses V2 contract directly

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/leaderboard');
  console.log('  GET /api/leaderboard-optimized');
  console.log('  GET /api/redis-test');
  console.log('  GET /health');
});