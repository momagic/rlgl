import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserInfo } from './UserInfo'

function HowTo() {
  const { t } = useTranslation()
  const [activeInstructionTab, setActiveInstructionTab] = useState<'classic' | 'arcade' | 'whack'>('classic')

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
      <UserInfo />
      <div 
        className="flex-1 flex flex-col rounded-lg shadow-2xl p-4 mx-4 border-3 border-squid-border bg-squid-gray overflow-hidden"
        style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
            <span className="mr-3 text-xl">📖</span>
            {t('startMenu.howToPlay')}
          </h3>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {/* Game Lights Section */}
          <div 
            className="rounded-lg p-4 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-base font-squid-heading font-bold uppercase mb-3 flex items-center">
              Game Lights
            </h4>
            <div className="flex items-center justify-center space-x-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center transform transition-all duration-300 hover:scale-110 border-3 border-squid-black" style={{ boxShadow: '0 0 20px rgba(220, 20, 60, 0.6)' }}>
                  <div className="w-12 h-12 bg-gradient-to-br from-red-300 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-squid-white font-squid-heading font-bold text-xs tracking-wide uppercase">
                      {t('startMenu.stop')}
                    </span>
                  </div>
                </div>
                <span className="text-squid-red font-squid font-medium text-sm neon-text-green" style={{ textShadow: '0 0 10px rgba(220, 20, 60, 0.8)' }}>
                  Stop Moving
                </span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center transform transition-all duration-300 hover:scale-110 animate-pulse border-3 border-squid-black" style={{ boxShadow: '0 0 20px rgba(0, 168, 120, 0.6)' }}>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-300 to-green-500 rounded-full flex items-center justify-center">
                    <span className="text-squid-white font-squid-heading font-bold text-xs tracking-wide uppercase">
                      {t('startMenu.tap')}
                    </span>
                  </div>
                </div>
                <span className="text-squid-green font-squid font-medium text-sm neon-text-green">
                  Tap to Move
                </span>
              </div>
            </div>
          </div>

          {/* Game Mode Instructions */}
          <div 
            className="rounded-lg p-4 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-base font-squid-heading font-bold uppercase mb-3 flex items-center">
              Game Modes
            </h4>
                
                {/* Game Mode Tabs */}
                <div className="flex rounded border-2 border-squid-border overflow-hidden bg-squid-gray p-1 mb-3" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                  <button
                    onClick={() => setActiveInstructionTab('classic')}
                    className={`flex-1 py-2 px-3 rounded text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
                      activeInstructionTab === 'classic'
                        ? 'bg-squid-pink text-squid-black'
                        : 'text-squid-white hover:bg-squid-border'
                    }`}
                  >
                    🎯 {t('gameModeSelector.classicMode.title')}
                  </button>
                  <button
                    onClick={() => setActiveInstructionTab('arcade')}
                    className={`flex-1 py-2 px-3 rounded text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
                      activeInstructionTab === 'arcade'
                        ? 'bg-squid-teal text-squid-black'
                        : 'text-squid-white hover:bg-squid-border'
                    }`}
                  >
                    🎮 {t('gameModeSelector.arcadeMode.title')}
                  </button>
                  <button
                    onClick={() => setActiveInstructionTab('whack')}
                    className={`flex-1 py-2 px-3 rounded text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
                      activeInstructionTab === 'whack'
                        ? 'bg-squid-green text-squid-black'
                        : 'text-squid-white hover:bg-squid-border'
                    }`}
                  >
                    🔨 {t('whackMode.title')}
                  </button>
                </div>

            {/* Tab Content */}
            <div className="rounded-lg border-2 border-squid-border bg-squid-gray p-3" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
              {activeInstructionTab === 'classic' ? (
                <div className="space-y-3">
                  <p className="text-squid-pink font-squid font-medium text-center mb-2 text-xs">
                    {t('gameModeSelector.classicMode.description')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-red bg-squid-red/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #DC143C' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.redLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-green bg-squid-green/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00A878' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.greenLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">❤️</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.lives')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">⚡</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.speed')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : activeInstructionTab === 'arcade' ? (
                <div className="space-y-3">
                  <p className="text-squid-teal font-squid font-medium text-center mb-2 text-xs">
                    {t('gameModeSelector.arcadeMode.description')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-red bg-squid-red/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #DC143C' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.redLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-green bg-squid-green/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00A878' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.greenLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">❤️</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.lives')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">⚡</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('startMenu.instructions.speed')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-teal bg-squid-teal/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}>
                      <span className="text-base">🔮</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        Collect floating power-ups for special abilities!
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-teal bg-squid-teal/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}>
                      <span className="text-base">🛡️</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        Shield, slow motion, score multiplier & more!
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-squid-green font-squid font-medium text-center mb-2 text-xs">
                    {t('whackMode.description')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-red bg-squid-red/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #DC143C' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.redLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-green bg-squid-green/10 p-2 animate-pulse" style={{ boxShadow: '2px 2px 0px 0px #00A878' }}>
                      <div className="w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex-shrink-0 border-2 border-squid-black"></div>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.greenLight')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">🎯</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.grid')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">📈</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.progression')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">⚡</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.scoring')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 rounded border-2 border-squid-border bg-squid-black p-2" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                      <span className="text-base">⏱️</span>
                      <span className="text-squid-white font-squid font-medium text-xs">
                        {t('instructions.whackMode.timing')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pro Tips Section */}
          <div 
            className="rounded-lg p-4 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-base font-squid-heading font-bold uppercase mb-3 flex items-center">
              💡 Pro Tips
            </h4>
            <div className="space-y-2">
              <div className="rounded border-2 border-squid-pink bg-squid-pink/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}>
                <p className="text-squid-white font-squid text-xs">
                  🎯 <strong className="text-squid-pink">Timing is everything:</strong> {t('proTips.timing')}
                </p>
              </div>
              <div className="rounded border-2 border-squid-teal bg-squid-teal/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}>
                <p className="text-squid-white font-squid text-xs">
                  🚀 <strong className="text-squid-teal">Speed increases:</strong> {t('proTips.speed')}
                </p>
              </div>
              <div className="rounded border-2 border-squid-teal bg-squid-teal/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}>
                <p className="text-squid-white font-squid text-xs">
                  💎 <strong className="text-squid-teal">Arcade mode:</strong> {t('proTips.arcade')}
                </p>
              </div>
              <div className="rounded border-2 border-squid-green bg-squid-green/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #00A878' }}>
                <p className="text-squid-white font-squid text-xs">
                  🔨 <strong className="text-squid-green">Whack-a-Light mode:</strong> {t('proTips.whack')}
                </p>
              </div>
              <div className="rounded border-2 border-squid-pink bg-squid-pink/10 p-2" style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}>
                <p className="text-squid-white font-squid text-xs">
                  🏆 <strong className="text-squid-pink">High scores:</strong> {t('proTips.leaderboard')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HowTo