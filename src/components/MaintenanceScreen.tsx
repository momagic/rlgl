function MaintenanceScreen() {

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-fade-in">
      <div className="bg-jet-black rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-md border border-neutral-beige/20 text-center space-y-6">
        {/* Maintenance Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-accent-pink/20 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔧</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-pure-white mobile-text-2xl font-bold tracking-wide">
          Game Under Maintenance
        </h1>

        {/* Message */}
        <div className="space-y-4">
          <p className="text-soft-sky-blue mobile-text-base leading-relaxed">
            We're currently updating to a new contract to improve your gaming experience.
          </p>
          <p className="text-neutral-beige mobile-text-sm opacity-80">
            The game will be back online shortly. Thank you for your patience!
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-accent-pink mobile-text-sm">
          <div className="w-2 h-2 bg-accent-pink rounded-full animate-pulse"></div>
          <span>Updating...</span>
        </div>

        {/* Additional Info */}
        <div className="bg-gunmetal/30 rounded-lg p-4 border border-neutral-beige/10 space-y-2">
          <p className="text-neutral-beige mobile-text-xs opacity-70">
            💡 Your progress and tokens are safe. All data will be preserved during the update.
          </p>
          <p className="text-tracksuit-green mobile-text-xs font-medium">
            🔒 Token balances are SAFU (Secure Asset Fund for Users)
          </p>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceScreen