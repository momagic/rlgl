import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { Typography, Container, Stack, Button } from './ui'
import { WorldIDInfoModal } from './WorldIDInfoModal'

export function WorldIDLogin() {
  const { t } = useTranslation()
  const { login, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  async function handleLogin() {
    setError(null)
    try {
      await login()
    } catch (err) {
      console.error('❌ Login failed:', err)
      setError(t('worldIdLogin.error'))
    }
  }

  return (
    <>
      <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-[#0a0a12] via-[#0a0c15] to-black overflow-hidden relative fixed inset-0">
        {/* Cinematic background accents */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute -top-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-20 bg-pink-600/30"></div>
          <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 bg-emerald-500/20"></div>
          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none w-full h-full z-0 opacity-60"
          style={{
            backgroundImage: 'url(/backgrounds/splash.webp)'
          }}
        />

        {/* Top Navigation */}
        <div className="flex justify-end p-4 relative z-60">
          <button
            onClick={() => setShowInfoModal(true)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
            aria-label="Info"
          >
            <span className="text-white text-lg font-bold font-squid-mono">i</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-60 p-6 space-y-12">

          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-6 animate-fade-in-up">
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-full"></div>
              <img
                src="/logo.webp"
                alt={t('app.title')}
                className="h-24 md:h-32 w-auto drop-shadow-2xl relative z-10"
              />
            </div>


          </div>

          {/* Action Section */}
          <div className="w-full max-w-xs space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-center space-y-2">
              <Typography variant="body" className="text-white/80 font-squid text-sm">
                Enter the game using your World ID
              </Typography>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              variant="primary"
              size="lg"
              className="w-full relative overflow-hidden group shadow-[0_0_20px_rgba(255,31,140,0.4)]"
            >
              {isLoading ? (
                <Stack direction="row" spacing="sm" className="items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('worldIdLogin.connecting')}</span>
                </Stack>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>LOGIN WITH WORLD ID</span>
                </span>
              )}
            </Button>

            <Typography variant="caption" className="text-white/40 text-center block text-xs">
              Authentication powered by World Network
            </Typography>
          </div>
        </div>

        {/* Bottom Error Display */}
        <Container className="flex-shrink-0 pb-safe-bottom px-4 relative z-60 min-h-[80px]">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-900/40 backdrop-blur-md animate-shake">
              <Typography variant="body" className="text-red-200 font-medium text-xs text-center flex items-center justify-center gap-2">
                <span>⚠️</span> {error}
              </Typography>
            </div>
          )}
        </Container>
      </div>

      <WorldIDInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  )
}
