import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { Typography, Container, Stack } from './ui'
import { WorldIDInfoModal } from './WorldIDInfoModal'

export function WorldIDLogin() {
  const { t } = useTranslation()
  const { verify, isLoading, user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)

  async function handleVerify() {
    setError(null)
    try {
      await verify()
      // Only check verification status if verify() completed successfully
      setTimeout(() => {
        if (!user?.verified) {
          setError(t('worldIdLogin.error'))
        }
      }, 500)
    } catch (error) {
      console.error('❌ World ID verification failed:', error)
      setError(t('worldIdLogin.error'))
    }
  }

  if (user?.verified) {
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
            className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none w-full h-full z-0"
            style={{
              backgroundImage: 'url(/backgrounds/splash.webp)'
            }}
          />
      
          <Container className="flex-1 flex items-center justify-center p-4 sm:p-5 animate-fade-in relative z-50">
            <div className="bg-white/10 backdrop-blur-md text-pure-white p-8 text-center border border-white/20 shadow-2xl rounded-3xl">
              <Stack spacing="lg" className="items-center">
                <span className="text-6xl animate-bounce">🎉</span>
                <Typography variant="h2" className="font-black text-white text-3xl md:text-4xl tracking-tight drop-shadow-2xl">
                  {t('worldIdLogin.verifiedTitle')}
                </Typography>
                <Typography variant="body" className="text-white/95 text-lg font-semibold tracking-wide drop-shadow-lg">
                  {t('worldIdLogin.verifiedSubtitle')}
                </Typography>
              </Stack>
            </div>
          </Container>
        </div>
        
        <WorldIDInfoModal 
          isOpen={showInfoModal} 
          onClose={() => setShowInfoModal(false)} 
        />
      </>
    )
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
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none w-full h-full z-0"
        style={{
          backgroundImage: 'url(/backgrounds/splash.webp)'
        }}
      />
  
      {/* Top Navigation */}
      <div className="flex justify-start p-4 relative z-60">
        <button
          onClick={() => setShowInfoModal(true)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
        >
          <span className="text-white text-lg font-bold">i</span>
        </button>
      </div>

      {/* Main content area with invisible button */}
      <div className="flex-1 flex items-center justify-center relative z-60">
        {/* Invisible button covering middle area */}
        <button
          onClick={handleVerify}
          disabled={isLoading}
          className="absolute inset-0 w-full h-full bg-transparent cursor-pointer"
          aria-label="Login with World ID"
        />
      </div>

      {/* App name and instructions */}
      <Container className="flex-shrink-0 pb-4 relative z-60">
        <div className="px-4 text-center">
          <div className="mb-4 flex justify-center">
            <img 
              src="/logo.webp" 
              alt={t('app.title')}
              className="h-16 md:h-20 w-auto drop-shadow-2xl"
            />
          </div>
          <Typography variant="body" className="text-white/90 text-lg md:text-xl font-semibold tracking-wide drop-shadow-lg">
            {t('worldIdLogin.tapInstructions')}
          </Typography>
        </div>
      </Container>

      {/* Bottom section with error display */}
      <Container className="flex-shrink-0 pb-safe-bottom pt-2 relative z-60">
        {/* Error */}
        {error && (
          <div className="p-3 rounded-2xl border border-red-400/20 bg-red-500/10 animate-shake mb-4 mx-4">
            <Typography variant="body" className="text-red-200 font-medium text-xs">
              {error}
            </Typography>
          </div>
        )}

        {/* Commented out Visible Action Button for later use */}
        {/*
        <div className="px-4">
          <Button
            onClick={handleVerify}
            disabled={isLoading}
            variant={isLoading ? 'secondary' : 'primary'}
            size="lg"
            className={`w-full py-3.5 font-bold tracking-wide rounded-2xl border ${
              isLoading
                ? 'opacity-60 cursor-not-allowed border-pink-400/30'
                : 'text-white border-pink-400/60 shadow-[0_10px_30px_rgba(236,72,153,0.35)] hover:shadow-[0_12px_36px_rgba(236,72,153,0.5)] hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isLoading ? (
              <Stack direction="row" spacing="sm" className="items-center justify-center">
                <div className="w-5 h-5 border-3 border-pure-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('worldIdLogin.verifying')}</span>
              </Stack>
            ) : (
              <span className="font-semibold tracking-wide">Verify humanity</span>
            )}
          </Button>
        </div>
        */}
      </Container>

      {isLoading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-center shadow-2xl">
            <Stack direction="row" spacing="sm" className="items-center justify-center">
              <div className="w-6 h-6 border-3 border-pure-white border-t-transparent rounded-full animate-spin"></div>
              <Typography variant="body" className="text-white font-semibold">
                {t('worldIdLogin.verifying')}
              </Typography>
            </Stack>
            <Typography variant="caption" className="text-white/80 mt-2">
              {t('worldIdLogin.worldAppNote')}
            </Typography>
          </div>
        </div>
      )}
    </div>
    
    <WorldIDInfoModal 
      isOpen={showInfoModal} 
      onClose={() => setShowInfoModal(false)} 
    />
    </>
  )
}
