# V3 Integration Guide - TypeScript & Frontend Fixes

## 🎯 Overview

This guide documents the critical TypeScript fixes and frontend integration changes required for V3 contract deployment. These fixes ensure type safety and proper integration with Worldcoin MiniKit.

## 🌐 RPC Configuration & Resilience

The app uses multiple public World Chain RPCs with health checks, rotation, caching, and retry/backoff to reduce errors and rate limiting.

- Frontend (viem): `src/utils/rpcManager.ts` maintains a list of public endpoints and performs round-robin among healthy clients with request queuing, rate limits, caching, and retries.
- Backend (ethers): `api/server.js` and `api/world-id.js` rotate through the same endpoint list, validate health via `getBlockNumber`, and wrap calls with exponential backoff on transient errors.

Default endpoints:
- `https://worldchain-mainnet.g.alchemy.com/public`
- `https://480.rpc.thirdweb.com`
- `https://worldchain-mainnet.gateway.tenderly.co`
- `https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro`
- `https://worldchain.drpc.org`

Override via environment:
- Backend: set `RPC_URL` to prefer a specific RPC first; rotation still falls back to the public list.
- Frontend: edit `PUBLIC_RPC_ENDPOINTS` in `src/utils/rpcManager.ts` to add or remove endpoints.

Operational notes:
- If all endpoints are unhealthy, calls fail fast with `No healthy RPC endpoints available`.
- Avoid adding rate-limited/private RPC keys to the public list. Prefer keyless/public endpoints here.

## 🔧 Critical TypeScript Fixes Required

### 1. AuthContext Type Mismatch Fix

**Problem**: `DailyClaim.tsx` tries to access `address` property that doesn't exist in `AuthContextType`.

**Solution**: Extract address from `user.walletAddress` instead:

```typescript
// ❌ Wrong - This will cause TypeScript error
const { address } = useAuth();

// ✅ Correct - Extract from user object
const { user } = useAuth();
const address = user?.walletAddress;
```

### 2. VerificationLevel Enum Handling

**Problem**: `VerificationLevel` from `@worldcoin/minikit-js` is an enum, but code compares it with string literals.

**Solution**: Convert enum to lowercase string for comparison:

```typescript
// ❌ Wrong - TypeScript error
if (verificationLevel === VerificationLevel.OrbPlus) {
  // ...
}

// ✅ Correct - Convert to string first
const levelStr = verificationLevel.toLowerCase();
if (levelStr === 'orb_plus') {
  // ...
}
```

**Valid verification levels**: `'none'`, `'device'`, `'orb_plus'`, `'orb'`, `'secure_document'`, `'document'`

### 3. VerificationMultipliers Type Fix

**Problem**: `GameModeSelector.tsx` expects different structure than what `getVerificationMultipliers()` returns.

**Solution**: Map the returned multipliers to expected format:

```typescript
// getVerificationMultipliers() returns:
{
  orbPlusMultiplier: bigint,
  orbMultiplier: bigint,
  secureDocumentMultiplier: bigint,
  documentMultiplier: bigint
}

// Map to expected format:
const scoreMultiplier = getMultiplierForLevel(levelStr, multipliers);
const tokenMultiplier = getMultiplierForLevel(levelStr, multipliers);
const bonusTurns = 0; // V3 doesn't have bonus turns
```

### 4. GameSubmission Type Fix

**Problem**: `submitScore()` function returns `{ success: false }` which doesn't match `GameSubmission` interface.

**Solution**: Throw errors instead of returning success objects:

```typescript
// ❌ Wrong - TypeScript error
catch (error) {
  return { success: false, error: errorMessage };
}

// ✅ Correct - Throw error
catch (error) {
  throw new Error(errorMessage);
}
```

### 5. PlayerStats Type Flexibility

**Problem**: Contract returns 8 fields but `PlayerStats` interface expects 15 fields.

**Solution**: Make optional fields in `PlayerStats` interface:

```typescript
export interface PlayerStats {
  // Required fields (returned by contract)
  freeTurnsUsed: bigint;
  lastResetTime: bigint;
  totalGamesPlayed: bigint;
  highScore: bigint;
  totalPointsEarned: bigint;
  tokenBalance: bigint;
  availableTurns: bigint;
  timeUntilReset: bigint;
  
  // Optional fields (may not be returned)
  weeklyPassExpiry?: bigint;
  lastDailyClaim?: bigint;
  dailyClaimStreak?: bigint;
  extraGoes?: bigint;
  passes?: bigint;
  verificationLevel?: VerificationLevel;
  isVerified?: boolean;
  verificationMultiplier?: bigint;
}
```

## 🚀 Pre-Deployment Checklist

### Before Running `npm run build`:

1. **Check AuthContext Usage**
   - Search for `useAuth()` calls
   - Ensure `address` is extracted from `user.walletAddress`

2. **Verify VerificationLevel Comparisons**
   - Search for `VerificationLevel.` usage
   - Convert to lowercase string comparisons

3. **Test Multiplier Functions**
   - Verify `getVerificationMultipliers()` usage
   - Ensure proper mapping to expected format

4. **Check Error Handling**
   - Search for `return { success:` patterns
   - Replace with proper error throwing

5. **Validate Type Imports**
   - Ensure `VerificationLevel` import is from correct package
   - Remove unused imports

## 🔍 Post-Deployment Verification

### Build Verification
```bash
npm run build
```

**Expected Result**: Clean build with 0 TypeScript errors

**Common Warnings** (Acceptable):
- Rollup chunk size warnings
- Comment preservation warnings

### Runtime Verification
1. **Test Worldcoin Login**: Verify MiniKit integration works
2. **Check Verification Levels**: Test different verification states
3. **Test Game Submission**: Ensure score submission works
4. **Verify Multipliers**: Check score/token multiplier calculations

## 🚨 Common Integration Issues & Solutions

### Issue 1: "Property 'address' does not exist"
**Cause**: Using old AuthContext pattern
**Fix**: Use `user.walletAddress` instead

### Issue 2: "Cannot compare VerificationLevel with string"
**Cause**: Direct enum comparison
**Fix**: Convert to lowercase string first

### Issue 3: "Property 'success' does not exist"
**Cause**: Wrong error handling pattern
**Fix**: Throw errors instead of returning objects

### Issue 4: "Type 'X' is missing properties"
**Cause**: Type mismatch between contract and frontend
**Fix**: Make interface fields optional or update mapping

## 📋 Files That Required Updates

1. **src/components/DailyClaim.tsx** - AuthContext usage
2. **src/components/TurnDisplay.tsx** - VerificationLevel comparison
3. **src/components/GameModeSelector.tsx** - Multiplier mapping
4. **src/hooks/useContract.ts** - Error handling in submitScore
5. **src/types/contract.ts** - PlayerStats interface

## 🎉 Success Criteria

✅ **Build Success**: `npm run build` completes with 0 errors  
✅ **Type Safety**: All TypeScript errors resolved  
✅ **Functionality**: Worldcoin integration works properly  
✅ **Performance**: No runtime errors in browser console  

## 🔗 Related Documentation

- [V3 Contract Overview](V3-CONTRACT-OVERVIEW.md)
- [V3 Testing Guide](V3-TESTING-GUIDE.md)
- [World Chain Verification Guide](WORLD-CHAIN-VERIFICATION-GUIDE.md)
- [Original Deployment Guide](DEPLOYMENT_GUIDE.md)

---

**Note**: These fixes are critical for V3 integration. Without them, the build will fail and the application won't run properly with Worldcoin MiniKit integration.
