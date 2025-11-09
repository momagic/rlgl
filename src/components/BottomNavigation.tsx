import type { ReactNode } from 'react'
import { Stack, Typography } from './ui'

export type TabType = 'game' | 'leaderboard' | 'howto' | 'settings'

interface Tab {
  id: TabType
  label: string
  icon: ReactNode
  activeIcon: ReactNode
  ariaLabel: string
}

interface BottomNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: Tab[] = [
    {
      id: 'game',
      label: 'Game',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16v-4a2 2 0 012-2h2a2 2 0 012 2v4M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16v-4a2 2 0 012-2h2a2 2 0 012 2v4M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      ariaLabel: 'Game tab'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      ariaLabel: 'Leaderboard tab'
    },
    {
      id: 'howto',
      label: 'How To',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      ariaLabel: 'How to play tab'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      ariaLabel: 'Settings tab'
    }
  ]

  const handleTabPress = (tabId: TabType) => {
    // Add haptic feedback if available
    if (navigator.vibrate && localStorage.getItem('vibrationEnabled') !== 'false') {
      navigator.vibrate(50) // Short vibration
    }
    onTabChange(tabId)
  }

  return (
    <nav 
      className="bottom-nav border-t border-white/20 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(30,30,30,0.95) 50%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
      role="tablist"
      aria-label="Main navigation"
    >
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      <Stack direction="row" className="relative items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[44px] min-h-[44px] px-3 py-2
                rounded-xl transition-all duration-200
                ${isActive 
                  ? 'text-white scale-105' 
                  : 'text-white/70 hover:text-white hover:scale-105 active:scale-95'
                }
                focus:outline-none focus:ring-2 focus:ring-white/30
                hover:bg-white/10 active:bg-white/20
              `}
              style={isActive ? {
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              } : {}}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.ariaLabel}
              tabIndex={0}
            >
              <Stack spacing="xs" className="items-center">
                <div className={isActive ? 'drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]' : ''}>
                  {isActive ? tab.activeIcon : tab.icon}
                </div>
                <Typography 
                  variant="caption" 
                  className={`font-medium tracking-wide text-xs ${isActive ? 'text-white' : 'text-white/70'}`}
                >
                  {tab.label}
                </Typography>
              </Stack>
              
              {/* Active indicator */}
              {isActive && (
                <div 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full animate-fade-in" 
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 100%)',
                    boxShadow: '0 0 8px 2px rgba(255,255,255,0.4)'
                  }}
                />
              )}
            </button>
          )
        })}
      </Stack>
    </nav>
  )
}

export default BottomNavigation