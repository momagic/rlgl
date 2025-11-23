import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameLogic } from './hooks/useGameLogic'
import { useAuth } from './contexts/AuthContext'
import { useHapticFeedback } from './hooks/useHapticFeedback'
import { useTurnManager } from './hooks/useTurnManager'
import { MiniKitProvider } from './components/MiniKitProvider'
import { AuthProvider } from './contexts/AuthContext'
import { WorldIDLogin } from './components/WorldIDLogin'
import { ApologyModal } from './components/ApologyModal'
import StartMenu from './components/StartMenu'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import Leaderboard from './components/Leaderboard'
import Settings from './components/Settings'
import HowTo from './components/HowTo'
import BottomNavigation from './components/BottomNavigation'
import MaintenanceScreen from './components/MaintenanceScreen'
import BannedScreen from './components/BannedScreen'
import { worldIDVerificationService } from './services/worldIDVerification'
import type { TabType } from './components/BottomNavigation'

function GameApp() {
  const { user } = useAuth()
  const turnManager = useTurnManager()
  const { gameData, startGame, handleTap, resetGame, togglePause, activatePowerUp, collectPowerUp } = useGameLogic(turnManager)
  const haptics = useHapticFeedback()
  const lastTapTime = useRef(0)
  const [activeTab, setActiveTab] = useState<TabType>('game')
  const [showApologyModal, setShowApologyModal] = useState(false)
  
  // Maintenance mode: toggled by API health
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [isBanned, setIsBanned] = useState(false)

  useEffect(() => {
    let mounted = true
    const checkHealth = async () => {
      const healthy = await worldIDVerificationService.checkApiHealth()
      if (mounted) setIsMaintenanceMode(!healthy)
    }
    checkHealth()
    const interval = setInterval(checkHealth, 60_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const checkBans = async () => {
      try {
        const bans = await worldIDVerificationService.getBans()
        const addr = user?.walletAddress?.toLowerCase()
        if (!mounted) return
        setIsBanned(!!addr && bans.includes(addr))
      } catch {}
    }
    checkBans()
    const interval = setInterval(checkBans, 60_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user?.walletAddress])

  // Show apology modal for leaderboard issues
  useEffect(() => {
    // Check if user is on leaderboard tab and show apology modal
    if (activeTab === 'leaderboard' && !showApologyModal) {
      // Show apology modal with a delay to avoid jarring experience
      const timer = setTimeout(() => {
        setShowApologyModal(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [activeTab, showApologyModal])



  const handleScreenTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Prevent duplicate events (both touch and click firing)
    const now = Date.now()
    if (now - lastTapTime.current < 100) {
      return // Ignore rapid duplicate events
    }
    lastTapTime.current = now

    // Only prevent default for mouse events, not touch events (which are passive)
    if (e.type === 'click') {
      e.preventDefault()
    }
    
    if (gameData.gameState === 'playing') {
      handleTap()
    }
  }, [gameData.gameState, handleTap])

  const handlePlayAgain = useCallback(async () => {
    haptics.importantButton()
    await startGame(gameData.gameMode) // Preserve the current game mode
  }, [startGame, haptics, gameData.gameMode])

  const isNewHighScore = gameData.gameState === 'gameOver' && 
    gameData.playerStats.currentScore > gameData.playerStats.highScore

  // Show maintenance screen if maintenance mode is active
  if (isMaintenanceMode) {
    return <MaintenanceScreen />
  }

  if (user?.verified && isBanned) {
    return <BannedScreen />
  }

  // Show login screen if user is not verified
  if (!user?.verified) {
    return <WorldIDLogin />
  }

  // Force game tab when playing or paused
  const currentTab = (gameData.gameState === 'playing' || gameData.gameState === 'paused') ? 'game' : activeTab

  const handleTabChange = (tab: TabType) => {
    // Don't allow tab switching during gameplay
    if (gameData.gameState === 'playing' || gameData.gameState === 'paused') {
      return
    }
    haptics.tabChange()
    setActiveTab(tab)
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'game':
        return (
          <div className="space-y-6">
            {gameData.gameState === 'menu' && (
              <StartMenu
                highScore={gameData.playerStats.highScore}
                onStartGame={startGame}
                turnManager={turnManager}
              />
            )}
            {gameData.gameState === 'gameOver' && (
              <GameOverScreen
                playerStats={gameData.playerStats}
                isNewHighScore={isNewHighScore}
                tokenReward={gameData.tokenReward}
                onPlayAgain={handlePlayAgain}
                onMainMenu={resetGame}
                turnManager={turnManager}
              />
            )}
          </div>
        )
      case 'leaderboard':
        return (
          <div className="space-y-6">
            <Leaderboard />
          </div>
        )
      case 'howto':
        return (
          <div className="space-y-6">
            <HowTo />
          </div>
        )
      case 'settings':
        return (
          <div className="space-y-6">
            <Settings />
          </div>
        )
      default:
        return null
    }
  }

  // Full-screen game mode
  if (gameData.gameState === 'playing' || gameData.gameState === 'paused') {
    return (
      <div className="mobile-container-fullscreen">
        <div 
          className="tap-area"
          onTouchStart={handleScreenTap}
          onClick={handleScreenTap}
          style={{ 
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        >
          <GameScreen
            gameData={gameData}
            onPause={togglePause}
            onQuit={resetGame}
            onActivatePowerUp={activatePowerUp}
            onCollectPowerUp={collectPowerUp}
          />
        </div>
      </div>
    )
  }

  // Main render logic with mobile-first container and bottom navigation
  return (
    <>
      <div className="mobile-container">
        {renderTabContent()}
      </div>
      <BottomNavigation 
        activeTab={currentTab} 
        onTabChange={handleTabChange}
      />
      <ApologyModal 
        isOpen={showApologyModal} 
        onClose={() => setShowApologyModal(false)}
      />
    </>
  )
}

function App() {
  return (
    <MiniKitProvider>
      <AuthProvider>
        <GameApp />
      </AuthProvider>
    </MiniKitProvider>
  )
}
export default App
