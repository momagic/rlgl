import { useAuth } from '../contexts/AuthContext'

function BannedScreen() {
  const { user, logout } = useAuth() as any
  const address = (user?.walletAddress || '').toString()
  return (
    <div className="min-h-screen w-full flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #FF1F8C 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #00A878 0%, transparent 70%)' }}></div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md text-center p-6 rounded-lg border-4 border-squid-red bg-squid-red/10" style={{ boxShadow: '6px 6px 0px 0px #DC143C' }}>
          <h2 className="text-squid-white text-2xl font-squid-heading font-bold uppercase mb-4 flex items-center justify-center">
            <span className="mr-2 text-3xl">🚫</span>
            Address Banned
          </h2>
          <div className="text-squid-white/80 text-sm font-squid mb-4">
            This wallet is banned from playing and submitting scores.
          </div>
          {address && (
            <div className="text-squid-white/70 text-xs font-squid-mono mb-4">
              {address}
            </div>
          )}
          <div className="text-squid-white/60 text-xs font-squid mb-6">
            If you believe this is a mistake, please contact support and provide your wallet address.
          </div>
          <div className="space-y-2">
            <button
              onClick={() => logout?.()}
              className="w-full py-3 px-4 rounded-lg text-squid-white font-squid-heading font-bold uppercase tracking-wider border-3 border-squid-black"
              style={{ background: '#2D2D35', boxShadow: '4px 4px 0px 0px #0A0A0F' }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BannedScreen