# MiniKit World ID Integration Setup

## Overview
Your Red Light Green Light game now requires World ID verification to play. Only verified humans can access the game, ensuring a sybil-resistant gaming experience.

## Configuration
- **App ID**: `app_29198ecfe21e2928536961a63cc85606`
- **Action**: `play-game`
- **Verification Level**: Orb (can be changed to Device for testing)

## Testing in World App

### 1. Development Setup
```bash
npm run dev
```

### 2. Access via World App
- Use ngrok or similar tunneling service to make your local app accessible
- Add your app to the World App developer portal
- Test the verification flow in World App

### 3. Testing Flow
1. Open app in World App
2. You'll see the World ID login screen
3. Tap "Verify with World ID"
4. World App will open a verification drawer
5. Complete verification in World App
6. Return to game - you should now see the game interface
7. User info will be displayed at the top with a logout option

## Key Components

### MiniKit Provider (`src/components/MiniKitProvider.tsx`)
- Initializes MiniKit SDK with your app ID
- Must wrap your entire app

### Auth Context (`src/contexts/AuthContext.tsx`)
- Manages World ID verification state
- Handles verification flow using MiniKit's `verify` command
- Uses cloud verification for proof validation

### World ID Login (`src/components/WorldIDLogin.tsx`)
- Beautiful login screen with verification button
- Shows loading state during verification
- Explains why verification is required

### User Info (`src/components/UserInfo.tsx`)
- Shows verified user status
- Displays verification level (orb/device)
- Provides logout functionality

## Game Flow
```
User opens app → 
Check verification status → 
If not verified: Show World ID login → 
User verifies → 
Proof validated → 
Game unlocked → 
Show game interface with user info
```

## Verification Process
1. MiniKit `verify` command triggers World App verification
2. User completes verification in World App
3. Proof is returned to your app
4. Cloud verification validates the proof
5. User state is updated and game is unlocked

## Security Features
- Cloud verification ensures proof validity
- App ID and action prevent proof reuse
- Orb verification ensures human uniqueness
- No sensitive data stored locally

## Next Steps
- Deploy to production
- Add smart contract integration for on-chain verification
- Implement leaderboards with verified users only
- Add more game features for verified users 