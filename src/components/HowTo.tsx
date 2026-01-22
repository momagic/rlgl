import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserInfo } from './UserInfo'

function HowTo() {
  const { t } = useTranslation()
  const [activeInstructionTab, setActiveInstructionTab] = useState<'classic' | 'arcade' | 'whack'>('classic')

  return (
    <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F] relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
      </div>

      <UserInfo />

      <div className="flex-1 flex flex-col p-4 relative z-10 overflow-hidden">
        <div className="flex-shrink-0 mb-6 px-2">
          <h3 className="text-white text-2xl font-squid-heading font-bold uppercase tracking-widest flex items-center gap-3">
            <span className="text-3xl">📖</span>
            {t('startMenu.howToPlay')}
          </h3>
          <p className="text-zinc-400 text-sm mt-1 font-squid">Master the rules to survive and win.</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pb-8 pr-1">

          {/* VISUAL GUIDE: LIGHTS */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -z-10 transition-opacity group-hover:opacity-100 opacity-50"></div>

            <h4 className="text-white font-squid-heading text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
              The Signals
            </h4>

            <div className="flex items-center justify-around">
              {/* Stop Signal */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center border-4 border-black box-content">
                    <div className="w-16 h-16 rounded-full border-2 border-red-300/30"></div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-red-500 border border-red-500/30 uppercase tracking-wider">
                    Freeze
                  </div>
                </div>
                <p className="text-xs text-zinc-400 font-medium text-center max-w-[80px]">Stop moving instantly</p>
              </div>

              {/* Go Signal */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] flex items-center justify-center border-4 border-black box-content animate-pulse">
                    <div className="w-16 h-16 rounded-full border-2 border-green-300/30"></div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-green-500 border border-green-500/30 uppercase tracking-wider">
                    Move
                  </div>
                </div>
                <p className="text-xs text-zinc-400 font-medium text-center max-w-[80px]">Run to the finish line</p>
              </div>
            </div>
          </div>

          {/* GAME MODES */}
          <div className="space-y-4">
            <h4 className="text-white font-squid-heading text-sm uppercase tracking-wider px-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
              Game Modes
            </h4>

            {/* Custom Tabs */}
            <div className="flex p-1 bg-zinc-900/60 rounded-xl border border-white/5 mx-2">
              {(['classic', 'arcade', 'whack'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveInstructionTab(mode)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeInstructionTab === mode
                      ? 'bg-white text-black shadow-lg'
                      : 'text-zinc-500 hover:text-white'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Tab Content Card */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 min-h-[200px] relative transition-all duration-300">
              {activeInstructionTab === 'classic' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🎯</span>
                    <div>
                      <h5 className="text-pink-500 font-bold uppercase tracking-wider text-sm">Classic</h5>
                      <p className="text-zinc-400 text-xs">The original Red Light, Green Light experience.</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-pink-500/10 text-pink-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Wait for the Green Light signal to tap.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-pink-500/10 text-pink-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Stop tapping <strong>immediately</strong> when Red Light appears.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-pink-500/10 text-pink-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Cross the finish line before time runs out.</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeInstructionTab === 'arcade' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">⚡</span>
                    <div>
                      <h5 className="text-teal-400 font-bold uppercase tracking-wider text-sm">Arcade</h5>
                      <p className="text-zinc-400 text-xs">Fast-paced with power-ups and chaos.</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-teal-500/10 text-teal-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Includes all Classic rules, plus power-ups.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-teal-500/10 text-teal-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Collect floating orbs for <strong>Shields</strong> and <strong>Time Slow</strong>.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-teal-500/10 text-teal-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Use power-ups strategically to survive impossible patterns.</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeInstructionTab === 'whack' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🔨</span>
                    <div>
                      <h5 className="text-emerald-500 font-bold uppercase tracking-wider text-sm">Whack-a-Light</h5>
                      <p className="text-zinc-400 text-xs">Test your reflexes in a grid challenge.</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-emerald-500/10 text-emerald-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>Tap the <strong>Green Tiles</strong> as fast as you can.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-emerald-500/10 text-emerald-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Avoid the <strong>Red Tiles</strong> - they deduct points/lives.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-zinc-300">
                      <span className="bg-emerald-500/10 text-emerald-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>Speed increases with every successful round.</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* PRO TIPS */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-3xl p-5 border border-white/5">
            <h4 className="text-white font-squid-heading text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>💡</span> Pro Tips
            </h4>
            <div className="grid gap-3 text-xs text-zinc-300">
              <div className="bg-black/20 p-3 rounded-xl flex gap-3 items-center">
                <span className="text-pink-500 font-bold whitespace-nowrap">Rhythm</span>
                <span>Don't just mash. Find the rhythm of the lights.</span>
              </div>
              <div className="bg-black/20 p-3 rounded-xl flex gap-3 items-center">
                <span className="text-teal-400 font-bold whitespace-nowrap">Focus</span>
                <span>Watch the doll, not just the lights.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default HowTo