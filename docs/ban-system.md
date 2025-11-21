# Ban System Guide

## Overview
The ban system allows administrators to block specific wallet addresses from playing, submitting scores, and appearing on the leaderboard. Bans are enforced in the backend API and reflected in the frontend UI.

## Components
### API Endpoints
- `GET /bans`: Returns the current list of banned addresses.
- `POST /admin/ban`: Adds an address to the ban list. Requires admin token.
- `POST /admin/unban`: Removes an address from the ban list. Requires admin token.

### Persistence
- Bans are stored in `api/bans.json` and loaded on API startup. This ensures bans persist across restarts without needing a database.

### Environment Variables
- `BAN_ADMIN_TOKEN` (or `ADMIN_TOKEN`): Required for admin ban/unban requests.
- `WORLD_ID_API_URL` or `API_URL`: Frontend/CLI base URL for API requests (default `http://localhost:3000`).
- `RPC_URL`: RPC endpoint for rank-based ban helper (default Worldchain mainnet Alchemy public).
- `GAME_CONTRACT_ADDRESS`: Contract address used by helper scripts for reading leaderboard.

## Enforcement
### Backend Checks
- `POST /session/start`: Banned users cannot start sessions.
- `POST /score/permit`: Banned users cannot receive signed score permits.
- `POST /world-id` and `GET /world-id`: Banned users are blocked at verification endpoints.

### Frontend Behavior
- Leaderboard excludes banned addresses when rendering entries.
- A dedicated banned screen appears for verified users whose wallet is banned. The screen shows:
  - Title: “Address Banned”
  - Message: “This wallet is banned from playing and submitting scores.”
  - Wallet address
  - Help: “If you believe this is a mistake, please contact support and provide your wallet address.”
  - Action: “Log Out”

## Admin Usage
### cURL Examples
- Ban:
  - `curl -X POST "http://localhost:3000/admin/ban" -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"address":"0x..."}'`
- Unban:
  - `curl -X POST "http://localhost:3000/admin/unban" -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"address":"0x..."}'`
- List:
  - `curl "http://localhost:3000/bans"`

### CLI Scripts
#### Get Top Scores
- Path: `scripts/get-top-scores.cjs`
- Prints top 10 entries for Classic, Arcade, and WhackLight including addresses.
- Usage:
  - `RPC_URL=... GAME_CONTRACT_ADDRESS=0x... node scripts/get-top-scores.cjs`

#### Ban Helper
- Path: `scripts/ban-player.cjs`
- Commands:
  - List bans: `WORLD_ID_API_URL=... BAN_ADMIN_TOKEN=... node scripts/ban-player.cjs --list`
  - Ban by address: `WORLD_ID_API_URL=... BAN_ADMIN_TOKEN=... node scripts/ban-player.cjs --ban --address 0x...`
  - Unban by address: `WORLD_ID_API_URL=... BAN_ADMIN_TOKEN=... node scripts/ban-player.cjs --unban --address 0x...`
  - Ban by leaderboard rank: `RPC_URL=... GAME_CONTRACT_ADDRESS=0x... WORLD_ID_API_URL=... BAN_ADMIN_TOKEN=... node scripts/ban-player.cjs --ban --mode Classic --rank 1`

## Security Notes
- Keep `BAN_ADMIN_TOKEN` secret and change it periodically.
- Prefer HTTPS and restrict admin endpoints behind a firewall or VPN.
- Monitor logs for repeated ban/unban attempts and rate-limit if necessary.

## Troubleshooting
- `Unauthorized`: Ensure `BAN_ADMIN_TOKEN` is set and provided via `Authorization: Bearer <TOKEN>`.
- `BAN_ADMIN_TOKEN not configured`: Set the token in environment and restart the API.
- `Route Not Found`: Confirm the API server is running and reachable; check `/health`.
- Empty addresses in leaderboard: Some entries may be incomplete; scripts normalize `player` field when possible.

## Limitations
- On-chain score removal is not implemented. The current system hides banned users in UI and blocks further participation. Removing on-chain entries would require contract-level support.