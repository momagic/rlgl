# Secure Submission & V3 Upgrade Guide

## Overview

This guide documents the security-focused upgrade completed across the smart contract, server, and client to prevent cheating, ensure score integrity, and maintain proxy compatibility. It provides actionable details for future developers: design rationale, code locations, environment requirements, testing, deployment, and troubleshooting.

## Goals

- Prevent high-score and token minting abuse
- Enforce game session linkage before score submission
- Introduce server authority via EIP‑712 permits
- Reward tokens proportionally to actual score, not round
- Require on-chain verification for daily rewards
- Maintain UUPS proxy storage safety

## Contract Updates

### Summary

- Add session tracking (`activeSessions`) incremented by `startGame(...)`
- Require an active session to call `submitScore(...)`
- Switch rewards to score-based minting
- Add EIP‑712 `submitScoreWithPermit(...)` with replay protection
- Restrict localStorage compatibility setters to owner
- Require verification for `claimDailyReward(...)`

### Key Code Locations

- Imports and storage additions: `contracts/RedLightGreenLightGameV3.sol:4`, `contracts/RedLightGreenLightGameV3.sol:114`
- `startGame(...)` increments session: `contracts/RedLightGreenLightGameV3.sol:341`
- Session enforcement in `submitScore(...)`: `contracts/RedLightGreenLightGameV3.sol:358`
- Score-based minting: `contracts/RedLightGreenLightGameV3.sol:402`
- Session close after submit: `contracts/RedLightGreenLightGameV3.sol:413`
- EIP‑712 helpers & permit submission: `contracts/RedLightGreenLightGameV3.sol:417`, `contracts/RedLightGreenLightGameV3.sol:472`
- `setTrustedSigner(...)`: `contracts/RedLightGreenLightGameV3.sol:463`
- Owner-only setters: `contracts/RedLightGreenLightGameV3.sol:595`, `contracts/RedLightGreenLightGameV3.sol:601`
- Daily claim verification requirement: `contracts/RedLightGreenLightGameV3.sol:422`

### EIP‑712 Structure

Domain

- `name = "Red Light Green Light V3"`
- `version = "1"`
- `chainId = <network chain id>`
- `verifyingContract = <proxy address>`

Type: `ScorePermit`

- `address player`
- `uint256 score`
- `uint256 round`
- `uint8 gameMode` (0: Classic, 1: Arcade, 2: WhackLight)
- `bytes32 sessionId`
- `uint256 nonce`
- `uint256 deadline` (unix time)

Verification flow: recover signer from digest and require `recovered == trustedSigner`, plus `usedNonces[player][nonce] == false` and bounds checks.

### Storage Safety

- New state variables appended after existing storage
- No parent contract storage changes
- UUPS upgrade safe; proxy address preserved

## Server Updates

### Summary

- `POST /session/start` verifies World ID and issues a session ticket
- `POST /score/permit` validates inputs, signs typed data with the configured signer key
- Added simple rate limiting for permit issuance

### Key Code Locations

- Env vars: `api/server.js:46`, `api/server.js:57`, `api/server.js:695` (private keys and addresses)
- Session endpoint: `api/server.js:132`
- Permit endpoint and typed-data signing: `api/server.js:150`
- Rate limiting: `api/server.js:150`

### Environment

- `AUTHORIZED_SUBMITTER_PRIVATE_KEY` (optional; used for on-chain verification)
- `SIGNER_PRIVATE_KEY` (EIP‑712 signing; falls back to `AUTHORIZED_SUBMITTER_PRIVATE_KEY` if not set)
- `GAME_CONTRACT_ADDRESS` (proxy address)
- `WORLD_ID_APP_ID`, `WORLD_ID_ACTION_ID` (World ID verification)

### Testing via curl

```sh
curl -X POST https://<host>/api/score/permit \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "score": 30,
    "round": 1,
    "gameMode": "Classic",
    "sessionId": "0x<64-hex>",
    "nonce": 1731412345678,
    "deadline": 1731412445
  }'
```

Response contains `signature`, `domain`, `types`, `value` suitable for contract call.

## Client Updates

### Summary

- Call `startGame()` on-chain at game start to open a session
- At game over, request a permit and submit via `submitScoreWithPermit(...)`
- Fallback to direct `submitScore(...)` if permit API fails

### Key Code Locations

- On-chain start: `src/hooks/useGameLogic.ts:176`
- Permit flow and fallback: `src/hooks/useGameLogic.ts:200`
- Contract helper: `src/hooks/useContract.ts:312`
- Env: `VITE_VERIFICATION_API_BASE` consumed at `src/hooks/useGameLogic.ts:205`

### Environment

- Add to `.env.local`:

```env
VITE_VERIFICATION_API_BASE="https://rlgl.wecraftldn.com/api"
```

Restart dev client after changes.

## Tests & Scripts

### Tests

- Updated expectations for score-based minting and session requirement
- Added permit submission test and replay protection
- Adjusted owner-only localStorage setters

Key files:

- `test/RedLightGreenLightGameV3.test.cjs:79` (pricing)
- `test/RedLightGreenLightGameV3.test.cjs:115` (turns)
- `test/RedLightGreenLightGameV3.updated.test.cjs:29` (session requirement & mint amounts)
- `test/RedLightGreenLightGameV3.updated.test.cjs:74` (permit test)

### Scripts

- Upgrade proxy: `scripts/upgrade-v3.cjs`
- Set signer: `scripts/set-trusted-signer.cjs`
- Check signer & impl: `scripts/check-signer.cjs`

Usage examples:

```sh
# Compile
pnpm compile

# Upgrade proxy (World Chain)
npx hardhat run scripts/upgrade-v3.cjs --network worldchain

# Set trusted signer (defaults to owner if SIGNER_ADDRESS/SIGNER_PRIVATE_KEY not set)
npx hardhat run scripts/set-trusted-signer.cjs --network worldchain

# Verify implementation and signer
npx hardhat run scripts/check-signer.cjs --network worldchain
```

## Design Rationale

- **Session Enforcement**: Ensures score submissions relate to actual gameplay with consumed turns
- **EIP‑712 Permits**: Moves authority to the server; enables telemetry validation and replay protection
- **Score-Based Rewards**: Aligns minted tokens with actual performance and theoretical caps
- **Verification Requirement**: Daily rewards limited to verified players; reduces farming risk
- **Owner-Only Setters**: Closes turn inflation via public setters

## Deployment Steps

1. Upgrade the proxy to the new implementation
2. Set `trustedSigner` to your server signer address
3. Configure server env (`SIGNER_PRIVATE_KEY`, `GAME_CONTRACT_ADDRESS`)
4. Configure client env (`VITE_VERIFICATION_API_BASE`) and restart client
5. Run e2e tests on testnet; confirm permit flow and session enforcement

## Troubleshooting

- **Permit expired**: Ensure `deadline` is ahead of `block.timestamp`
- **Permit replay**: Check `nonce`; it must be unique per player; contract tracks `usedNonces`
- **"No active game session" revert**: Call `startGame()` first; confirm session increments
- **ABI mismatch**: Client ABI includes `submitScoreWithPermit(...)` (`src/types/contract.ts:161`)—rebuild if you change signatures
- **Server 429**: Rate limit hit; wait or increase thresholds

## Security Notes

- Never expose private keys in logs or client code
- Maintain tight bounds in `calculateMaxTheoreticalScore(...)`: `contracts/RedLightGreenLightGameV3.sol:406`
- Consider additional server-side anti-cheat with telemetry if needed

## References

- Anti-cheat overview: `docs/ANTI_CHEAT_SYSTEM.md`
- Security analysis: `docs/SECURITY_ANALYSIS.md`
- Contract submission logic: `contracts/RedLightGreenLightGameV3.sol:347`, `contracts/RedLightGreenLightGameV3.sol:472`
- Client submission hooks: `src/hooks/useGameLogic.ts:200`, `src/hooks/useContract.ts:312`

