import { useTranslation } from 'react-i18next'
import { Typography, Stack } from './ui'

interface WorldIDInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WorldIDInfoModal({ isOpen, onClose }: WorldIDInfoModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101018]/95 p-3 sm:p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-semibold">{t('worldIdLogin.worldIdRequired')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20"
          >
            Close
          </button>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto pb-safe-bottom space-y-4">
          {/* Hero / Title */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Stack spacing="sm" className="items-center">
              <div className="flex items-center justify-center gap-3 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg flex items-center justify-center">
                  <div className="w-7 h-7 bg-gradient-to-br from-red-300 to-red-500 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-white text-[10px] font-semibold tracking-wide">STOP</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-lg flex items-center justify-center animate-pulse">
                  <div className="w-7 h-7 bg-gradient-to-br from-green-300 to-green-500 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-white text-[10px] font-semibold tracking-wide">GO!</span>
                  </div>
                </div>
              </div>
              <Typography variant="h1" className="font-bold text-white text-xl tracking-tight leading-tight">
                {t('worldIdLogin.title')}
              </Typography>
              <Typography variant="body" className="text-blue-300 font-medium text-sm leading-relaxed">
                {t('worldIdLogin.subtitle')}
              </Typography>
              <Typography variant="caption" className="text-gray-300 font-normal text-xs leading-relaxed opacity-90 text-center">
                {t('worldIdLogin.heroText')}
              </Typography>
            </Stack>
          </div>
    
          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-2 transition-all duration-300 hover:bg-white/12">
              <div className="text-center">
                <div className="text-base mb-0.5">👥</div>
                <Typography variant="caption" className="text-white font-medium text-xs leading-tight">
                  Real Players
                </Typography>
              </div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-2 transition-all duration-300 hover:bg-white/12">
              <div className="text-center">
                <div className="text-base mb-0.5">💎</div>
                <Typography variant="caption" className="text-white font-medium text-xs leading-tight">
                  Earn Rewards
                </Typography>
              </div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-2 transition-all duration-300 hover:bg-white/12">
              <div className="text-center">
                <div className="text-base mb-0.5">🌍</div>
                <Typography variant="caption" className="text-white font-medium text-xs leading-tight">
                  Global Ranks
                </Typography>
              </div>
            </div>
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-2 transition-all duration-300 hover:bg-white/12">
              <div className="text-center">
                <div className="text-base mb-0.5">⚡</div>
                <Typography variant="caption" className="text-white font-medium text-xs leading-tight">
                  Instant Play
                </Typography>
              </div>
            </div>
          </div>
    
          {/* World ID requirement copy */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Stack spacing="sm" className="items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg mb-1">
                <span className="text-white text-lg">🛡️</span>
              </div>
              <Typography variant="h3" className="font-semibold text-white text-base leading-tight">
                {t('worldIdLogin.worldIdRequired')}
              </Typography>
              <Typography variant="body" className="text-gray-300 font-normal text-xs leading-relaxed text-center whitespace-pre-line">
                {t('worldIdLogin.onlyVerifiedHumans')}
              </Typography>
            </Stack>
          </div>
    
          {/* Call to action */}
          <Typography variant="body" className="text-green-300 font-medium text-sm leading-relaxed">
            {t('worldIdLogin.callToAction')}
          </Typography>

          <Typography variant="caption" className="text-gray-400 font-normal text-xs leading-relaxed opacity-80 text-center">
            {t('worldIdLogin.worldAppNote')}
          </Typography>
        </div>
      </div>
    </div>
  )
}