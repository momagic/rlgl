# Red Light Green Light - React Native Migration Guide

## Overview
This guide contains all the essential information to recreate the Red Light Green Light game as a React Native mobile app. The original web app has been analyzed and all core game logic, styling, and structure details are documented below.

## Game Concept
A reaction-based mobile game inspired by the Squid Game series where players must:
- **Red Light**: Don't tap the screen
- **Green Light**: Tap the screen quickly
- Miss a green light or tap during red = lose a life
- 3 lives total, game gets faster each round
- Score points for correct taps with streak bonuses

## Core Game Logic

### Game Configuration
```typescript
const DEFAULT_CONFIG = {
  initialLives: 3,
  baseInterval: 3000,      // 3 seconds initially
  minInterval: 800,        // Fastest possible interval
  speedIncreaseRate: 0.95, // Multiply interval by this each round
  pointsPerRound: 10,
  bonusPointsThreshold: 5  // Bonus points for streaks
}
```

### Game States & Types
```typescript
export type LightState = 'red' | 'green' | 'transition'
export type GameState = 'menu' | 'playing' | 'gameOver' | 'paused'

export interface PlayerStats {
  currentScore: number
  highScore: number
  livesRemaining: number
  round: number
  streak: number
  totalTaps: number
  correctTaps: number
}

export interface GameData {
  gameState: GameState
  lightState: LightState
  playerStats: PlayerStats
  config: GameConfig
  isTransitioning: boolean
  lastLightChange: number
  nextLightChange: number
  gameStartTime: number
  roundStartTime: number
  tappedDuringGreen: boolean
  showLightChangeFlash: boolean
  isConsecutiveLight: boolean
}
```

### Core Game Mechanics

#### Light Switching Logic
- **From Red Light**: 75% chance → Green, 25% chance → Another Red
- **From Green Light**: 70% chance → Red, 30% chance → Another Green
- **Consecutive lights** trigger special visual flash effects
- **Speed increases** each round: `interval = baseInterval * (speedIncreaseRate ^ round)`

#### Tap Handling Logic
```typescript
// During RED light - Player taps
if (lightState === 'red') {
  // Lose a life
  livesRemaining -= 1
  streak = 0
  if (livesRemaining <= 0) {
    // Game Over
    gameState = 'gameOver'
  }
}

// During GREEN light - Player taps
if (lightState === 'green') {
  // Correct tap
  const basePoints = 10
  const bonusPoints = streak >= 5 ? Math.floor(streak / 2) : 0
  currentScore += basePoints + bonusPoints
  correctTaps += 1
  streak += 1
  round += 1
  tappedDuringGreen = true
}

// Green light expires without tap
if (lightState === 'green' && !tappedDuringGreen) {
  // Lose a life for missing green light
  livesRemaining -= 1
  streak = 0
}
```

#### Game Loop
- Uses `requestAnimationFrame` for smooth 60fps updates
- Checks `now >= nextLightChange` to trigger light switches
- Calculates dynamic intervals based on current round
- Handles light transitions with visual feedback

## Visual Design & Styling

### Color Palette (Squid Game Inspired)
```typescript
const colors = {
  // Primary Colors
  'tracksuit-green': '#034C3C',     // Action buttons, primary highlights
  'guard-pink': '#F04E78',          // Danger alerts, secondary actions
  'blood-red': '#AA1E23',           // Elimination alerts, high tension
  
  // UI Colors
  'dusty-beige': '#E6D3B3',         // Cards, modals, neutral areas
  'industrial-charcoal': '#2B2B2B', // Nav bars, dark backgrounds
  'bone-white': '#F9F7F1',          // Main text, icons on dark
  'gunmetal': '#3E3E3E',            // Borders, frame elements
  'faint-olive': '#8C8C60',         // Dividers, muted text
  
  // Accent Colors
  'pastel-teal': '#A0D1CA',         // Soft backgrounds, overlays
  'soft-sky-blue': '#9EC5E3',       // Light backgrounds, secondary text
}
```

### Light Display Design
- **Red Light**: Large circular display with red background
- **Green Light**: Same circle with green background
- **Transition Effects**: Flash animation for light changes
- **Consecutive Light Flash**: Special longer flash (1000ms vs 800ms)
- **Size**: Responsive from 128px (mobile) to 256px (large screens)

### Mobile-First Layout
```css
/* Safe Area Support */
padding-top: calc(env(safe-area-inset-top) + 68px)
padding-bottom: calc(env(safe-area-inset-bottom) + 80px)

/* Touch Targets */
min-height: 48px  /* All buttons */
min-width: 44px   /* Touch targets */

/* Typography Scale */
mobile-text-xs: 12px/16px
mobile-text-sm: 14px/20px  
mobile-text-base: 16px/24px
mobile-text-lg: 18px/28px
mobile-text-xl: 20px/32px
mobile-text-2xl: 24px/36px
```

## Component Structure

### Main App Structure
```
App
├── AuthProvider (simplified - no Web3)
├── GameApp
    ├── UserInfo (top bar)
    ├── Mobile Container
    │   ├── StartMenu (game state: menu)
    │   ├── GameScreen (game state: playing/paused)
    │   └── GameOverScreen (game state: gameOver)
    └── BottomNavigation
        ├── Game Tab
        ├── Leaderboard Tab
        └── Settings Tab
```

### Key Components

#### GameScreen (Full-screen during play)
- **LightDisplay**: Main circular light with animations
- **ScoreBoard**: Current score, round, streak display
- **LivesDisplay**: Hearts/icons showing remaining lives
- **Pause/Quit buttons**: Top overlay controls

#### StartMenu
- Game title with styling
- High score display
- How to play instructions
- Start game button

#### GameOverScreen
- Final score display
- Performance stats (accuracy, rounds, streak)
- Performance messages based on score
- Play again / Main menu buttons

## Audio & Haptic Feedback

### Sound Effects Needed
- `correctTap`: Success sound for green light taps
- `wrongTap`: Error sound for red light taps or missed green
- `lightSwitch`: Sound when lights change
- `gameOver`: Game over sound
- `newHighScore`: Special sound for new records

### Haptic Patterns
- `correctTap`: Light success vibration
- `incorrectTap`: Error vibration
- `loseLife`: Stronger warning vibration
- `lightChange`: Subtle notification vibration
- `lightChangeAlert`: Stronger vibration for consecutive lights
- `gameOver`: Strong failure pattern
- `newHighScore`: Celebration pattern

## Internationalization (i18n)

### Supported Languages
- English (en)
- Spanish (es) 
- Thai (th)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)

### Key Translation Keys
```json
{
  "startMenu": {
    "title": "Red Light Green Light",
    "subtitle": "Tap to Survive!",
    "instructions": {
      "redLight": "Red Light = Don't tap!",
      "greenLight": "Green Light = Tap quickly!",
      "lives": "3 lives only - miss or tap wrong!",
      "speed": "Game gets faster each round!"
    }
  },
  "gameScreen": {
    "round": "Round {{round}}",
    "pause": "⏸️ Pause"
  },
  "gameOver": {
    "title": "Game Over",
    "finalScore": "FINAL SCORE",
    "stats": {
      "rounds": "ROUNDS",
      "streak": "STREAK", 
      "accuracy": "ACCURACY"
    }
  }
}
```

## React Native Implementation Plan

### 1. Project Setup
```bash
npx react-native init RLGLMobile --template react-native-template-typescript
cd RLGLMobile
```

### 2. Essential Dependencies
```json
{
  "dependencies": {
    "react-navigation": "^6.x",
    "react-native-reanimated": "^3.x",
    "react-native-haptic-feedback": "^2.x", 
    "react-native-sound": "^0.11.x",
    "react-native-localize": "^3.x",
    "react-i18next": "^13.x",
    "react-native-async-storage": "^1.x",
    "react-native-safe-area-context": "^4.x"
  }
}
```

### 3. File Structure
```
src/
├── components/
│   ├── GameScreen.tsx
│   ├── LightDisplay.tsx
│   ├── ScoreBoard.tsx
│   ├── LivesDisplay.tsx
│   ├── StartMenu.tsx
│   ├── GameOverScreen.tsx
│   ├── Settings.tsx
│   └── Leaderboard.tsx
├── hooks/
│   ├── useGameLogic.ts
│   ├── useHapticFeedback.ts
│   ├── useSoundEffects.ts
│   └── useAsyncStorage.ts
├── types/
│   └── game.ts
├── i18n/
│   ├── index.ts
│   └── locales/
├── styles/
│   └── colors.ts
└── utils/
    └── index.ts
```

### 4. Key React Native Adaptations

#### Touch Handling
```typescript
// Replace web mouse/touch events
<TouchableWithoutFeedback onPress={handleTap}>
  <View style={styles.tapArea}>
    <LightDisplay />
  </View>
</TouchableWithoutFeedback>
```

#### Styling with StyleSheet
```typescript
const styles = StyleSheet.create({
  lightCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#F9F7F1',
  },
  redLight: {
    backgroundColor: '#AA1E23',
  },
  greenLight: {
    backgroundColor: '#034C3C',
  }
})
```

#### Navigation
```typescript
// Bottom tab navigation
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Tab = createBottomTabNavigator()

function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Game" component={GameScreen} />
      <Tab.Screen name="Leaderboard" component={Leaderboard} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  )
}
```

#### Animations
```typescript
// Use react-native-reanimated for smooth animations
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

const lightScale = useSharedValue(1)

// Flash animation for light changes
const triggerFlash = () => {
  lightScale.value = withTiming(1.1, { duration: 200 }, () => {
    lightScale.value = withTiming(1, { duration: 200 })
  })
}
```

## Data Persistence

### Local Storage (AsyncStorage)
- High scores
- Game settings (sound, haptics)
- Language preference
- Game statistics

```typescript
// Save high score
await AsyncStorage.setItem('highScore', score.toString())

// Load settings
const settings = await AsyncStorage.getItem('gameSettings')
```

## Performance Considerations

### Game Loop Optimization
- Use `requestAnimationFrame` equivalent in React Native
- Minimize state updates during gameplay
- Use refs for frequently updated values
- Implement proper cleanup for timers/animations

### Memory Management
- Preload sound effects
- Optimize image assets
- Clean up event listeners
- Use React.memo for static components

## Testing Strategy

### Device Testing
- Test on various screen sizes (iPhone SE to iPad)
- Verify safe area handling
- Test haptic feedback on different devices
- Validate touch responsiveness

### Performance Testing
- Monitor frame rates during gameplay
- Test memory usage over extended play
- Verify smooth animations
- Check battery impact

## Deployment

### iOS
- Configure Info.plist for permissions
- Set up App Store Connect
- Handle device-specific optimizations

### Android
- Configure AndroidManifest.xml
- Set up Google Play Console
- Test on various Android versions

## Key Differences from Web Version

### Removed Features
- ❌ Web3/Blockchain integration
- ❌ World ID authentication  
- ❌ Token rewards/payments
- ❌ Smart contract interactions
- ❌ MiniKit provider

### Simplified Features
- ✅ Local high scores only
- ✅ Simple user profiles (no wallet)
- ✅ Offline gameplay
- ✅ Local leaderboards
- ✅ Settings persistence

### Enhanced Mobile Features
- ✅ Native haptic feedback
- ✅ Better touch handling
- ✅ Safe area support
- ✅ Native navigation
- ✅ Platform-specific optimizations

## Estimated Development Timeline

- **Week 1**: Project setup, basic navigation, core components
- **Week 2**: Game logic implementation, touch handling
- **Week 3**: Styling, animations, sound/haptic integration
- **Week 4**: i18n, settings, testing, polish

## Success Metrics

- **Performance**: 60fps gameplay on target devices
- **Responsiveness**: <50ms tap-to-feedback latency
- **Compatibility**: iOS 12+ and Android 8+
- **Size**: <50MB app bundle
- **Battery**: <5% drain per 10-minute session

This guide provides all the essential information needed to recreate the Red Light Green Light game as a polished React Native mobile application. The core game mechanics are well-defined and the visual design is thoroughly documented for implementation.