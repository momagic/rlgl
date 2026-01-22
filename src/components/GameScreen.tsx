import LightDisplay from './LightDisplay'
import WhackLightDisplay from './WhackLightDisplay'
import ScoreBoard from './ScoreBoard'
import LivesDisplay from './LivesDisplay'
import PowerUpBar from './PowerUpBar'
import FloatingPowerUp from './FloatingPowerUp'
import PowerUpEffects from './PowerUpEffects'
import type { GameData } from '../types/game'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

interface GameScreenProps {
  gameData: GameData
  onPause: () => void
  onQuit: () => void
  onActivatePowerUp: (powerUpId: string) => void
  onCollectPowerUp: (powerUpId: string) => void
}

function GameScreen({ gameData, onPause, onQuit, onActivatePowerUp }: GameScreenProps) {
  const { gameState, lightState, playerStats, config, isTransitioning, showLightChangeFlash, isConsecutiveLight } = gameData
  const haptics = useHapticFeedback()





  if (gameState === 'paused') {
    return (
      <div className="min-h-screen w-full flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
        {/* Background image layer */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "url(/backgrounds/game-background.webp)",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.5,
            filter: 'brightness(0.4) saturate(1.1) contrast(1.1)'
          }}
        />
        {/* Squid Game Neon Accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #FF1F8C 0%, transparent 70%)' }}></div>
          <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #00A878 0%, transparent 70%)' }}></div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-4 animate-fade-in relative z-10">
          <div
            className="w-full max-w-md text-center p-6 rounded-lg border-4 border-squid-border bg-squid-gray animate-scale-in"
            style={{ boxShadow: '6px 6px 0px 0px #0A0A0F' }}
          >
            <h2 className="text-squid-white text-3xl font-squid-heading font-bold uppercase mb-6 flex items-center justify-center">
              <span className="mr-3 text-4xl">⏸️</span>
              Paused
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => {
                  haptics.buttonPress()
                  onPause()
                }}
                className="w-full py-4 px-6 rounded-lg font-squid-heading font-bold uppercase tracking-wider text-squid-white border-3 border-squid-black transition-all duration-150"
                style={{ background: '#FF1F8C', boxShadow: '4px 4px 0px 0px #0A0A0F' }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '4px 4px 0px 0px #0A0A0F'
                }}
              >
                🚦 Resume Game
              </button>

              <button
                onClick={() => {
                  haptics.buttonPress()
                  onQuit()
                }}
                className="w-full py-3 px-4 rounded-lg text-squid-white font-squid-heading font-bold uppercase tracking-wider border-3 border-squid-black transition-all duration-150"
                style={{ background: '#DC143C', boxShadow: '4px 4px 0px 0px #0A0A0F' }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '4px 4px 0px 0px #0A0A0F'
                }}
              >
                ❌ Quit Game
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
      {/* Background image layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url(/backgrounds/game-background.webp)",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
          filter: 'brightness(0.4) saturate(1.1) contrast(1.1)'
        }}
      />
      {/* Squid Game Neon Accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #FF1F8C 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #00A878 0%, transparent 70%)' }}></div>
      </div>

      <div className="flex-1 flex flex-col p-3 sm:p-4 animate-fade-in relative z-10">
        {/* Header with navigation */}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => {
              haptics.buttonPress()
              onPause()
            }}
            className="px-3 py-2 rounded border-3 border-squid-black text-squid-white text-sm font-squid-heading font-bold uppercase tracking-wider transition-all duration-150"
            style={{ background: '#FF1F8C', boxShadow: '3px 3px 0px 0px #0A0A0F' }}
            onPointerDown={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '3px 3px 0px 0px #0A0A0F'
            }}
          >
            ⏸️ Pause
          </button>

          {/* Round indicator */}
          <div
            className="px-3 py-2 rounded border-3 border-squid-border bg-squid-gray"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <span className="neon-text-teal font-squid-mono font-bold">Round {playerStats.round}</span>
          </div>
        </div>

        {/* Game Stats Section */}
        <div className="mb-4 space-y-2">
          {/* Lives Display */}
          <div className="p-2 rounded-lg border-3 border-squid-border bg-squid-gray" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
            <LivesDisplay
              livesRemaining={playerStats.livesRemaining}
              maxLives={config.initialLives}
            />
          </div>

          {/* Score Board */}
          <div className="p-2 rounded-lg border-3 border-squid-border bg-squid-gray" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
            <ScoreBoard playerStats={playerStats} />
          </div>

          {/* Power-up Bar - Only show in Arcade mode */}
          {gameData.gameMode === 'arcade' && (
            <div className="p-2 rounded-lg border-3 border-squid-teal bg-squid-teal/10" style={{ boxShadow: '3px 3px 0px 0px #00D9C0' }}>
              <PowerUpBar
                powerUpState={gameData.powerUpState}
                onActivatePowerUp={onActivatePowerUp}
              />
            </div>
          )}
        </div>

        {/* Main Game Area - Light Display */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-4 relative">
          {gameData.gameMode === 'whack' ? (
            <WhackLightDisplay
              lights={gameData.whackLights || []}
              onTapLight={(id) => gameData.tapWhackLight ? gameData.tapWhackLight(id) : undefined}
            />
          ) : (
            <LightDisplay
              lightState={lightState}
              isTransitioning={isTransitioning}
              showLightChangeFlash={showLightChangeFlash}
              isConsecutiveLight={isConsecutiveLight}
            />
          )}

          {/* Floating Power-ups - Only show in Arcade mode */}
          {gameData.gameMode === 'arcade' && gameData.powerUpState.availablePowerUps.map((powerUp) => (
            <FloatingPowerUp
              key={powerUp.id}
              powerUp={powerUp}
              onCollect={gameData.tapToActivatePowerUp}
              onExpire={(expiredPowerUp) => {
                // Remove expired power-up from available list
                if (gameData.removePowerUp) {
                  gameData.removePowerUp(expiredPowerUp.id)
                }
              }}
            />
          ))}

          {/* Power-up Effects Overlay - Only show in Arcade mode */}
          {gameData.gameMode === 'arcade' && (
            <PowerUpEffects
              activePowerUps={gameData.powerUpState.activePowerUps}
              gameSpeedMultiplier={gameData.gameSpeedMultiplier}
              hasShield={gameData.hasShield}
              scoreMultiplier={gameData.scoreMultiplier}
            />
          )}
        </div>

        {/* Bottom Instructions Section */}
        <div className="mt-4 p-3 rounded-lg border-3 border-squid-red bg-squid-red/10 text-center" style={{ boxShadow: '4px 4px 0px 0px #DC143C' }}>
          {gameData.gameMode === 'whack' ? (
            <>
              <p className="text-squid-red text-sm sm:text-base font-squid-heading font-bold uppercase mb-1 animate-pulse">
                🚨 Tap Green Only!
              </p>
              <p className="text-squid-white/80 text-xs font-squid font-semibold">
                Red lights end the round
              </p>
            </>
          ) : (
            <>
              <p className="text-squid-red text-sm sm:text-base font-squid-heading font-bold uppercase mb-1 animate-pulse">
                🚨 Don't Tap Red!
              </p>
              <p className="text-squid-white/80 text-xs font-squid font-semibold">
                Tap anywhere to play
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameScreen