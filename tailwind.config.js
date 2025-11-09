/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@worldcoin/mini-apps-ui-kit-react/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Mobile-first breakpoints
    screens: {
      'xs': '375px',   // Small phones
      'sm': '640px',   // Large phones
      'md': '768px',   // Tablets
      'lg': '1024px',  // Small desktops
      'xl': '1280px',  // Large desktops
      '2xl': '1536px', // Extra large
    },
    extend: {
      fontFamily: {
        'squid': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'squid-heading': ['Bebas Neue', 'Impact', 'sans-serif'],
        'squid-mono': ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        // Squid Game TV Series Palette - Core Colors
        'squid-pink': '#FF1F8C',      // Iconic hot pink from guards/branding
        'squid-teal': '#00D9C0',      // Vibrant teal accent
        'squid-green': '#00A878',     // Green light color
        'squid-red': '#DC143C',       // Red light color (crimson)
        'squid-black': '#0A0A0F',     // Deep black with slight blue tint
        'squid-white': '#F8F8FF',     // Slightly warm white
        'squid-gray': '#1A1A20',      // Dark gray for cards
        'squid-border': '#2D2D35',    // Border color
        
        // Legacy Squid Game Modern Palette (for compatibility)
        'primary-green': '#00A878',
        'accent-pink': '#FF1F8C',
        'jet-black': '#0A0A0F',
        'pure-white': '#F8F8FF',
        'neutral-beige': '#F5F5F0',
        // Aliases for backwards compatibility
        'game-green': '#00A86B',
        'game-red': '#FF4B87',
        'game-dark': '#000000',
        'game-light': '#FFFFFF',
        'mobile-bg': {
          'primary': '#1f2937',
          'secondary': '#374151',
          'overlay': 'rgba(0, 0, 0, 0.4)',
        },
        // Squid Game inspired UI palette - New Color Scheme
        'tracksuit-green': '#034C3C',     // Contestant Tracksuit Green - Action buttons, primary highlights
        'guard-pink': '#F04E78',          // Guard Pink/Salmon - Danger alerts, secondary action buttons
        'pastel-teal': '#A0D1CA',         // Muted Pastel Teal - Backgrounds, soft cards, overlays
        'soft-sky-blue': '#9EC5E3',       // Soft Sky Blue - Light backgrounds, secondary text
        'dusty-beige': '#E6D3B3',         // Dusty Beige - Cards, modals, neutral UI areas
        'industrial-charcoal': '#2B2B2B', // Industrial Charcoal - Nav bars, overlays, dark backgrounds
        'bone-white': '#F9F7F1',          // Warm Bone White - Main text, icons on dark surfaces
        'blood-red': '#AA1E23',           // Rich Blood Red - Elimination alerts, high tension cues
        'faint-olive': '#8C8C60',         // Faint Olive Green - Dividers, subtle icons, muted text
        'gunmetal': '#3E3E3E',            // Shadowy Gunmetal - Frame elements, card borders, modals
      },
      // Mobile-optimized spacing + World's design system spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        '18': '4.5rem',    // 72px - good for mobile touch targets
        '22': '5.5rem',    // 88px
        '88': '22rem',     // 352px
        '100': '25rem',    // 400px
        // World's design system spacing values
        '2.5': '0.625rem', // 10px
        '3.5': '0.875rem', // 14px
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '6.5': '1.625rem', // 26px
        '7.5': '1.875rem', // 30px
        '8.5': '2.125rem', // 34px
        '9.5': '2.375rem', // 38px
        '15': '3.75rem',   // 60px
        '17': '4.25rem',   // 68px
        '18': '4.5rem',    // 72px
        '19': '4.75rem',   // 76px
        '21': '5.25rem',   // 84px
      },
      // Mobile-first typography
      fontSize: {
        'mobile-xs': ['12px', { lineHeight: '16px', letterSpacing: '0.025em' }],
        'mobile-sm': ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
        'mobile-base': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'mobile-lg': ['18px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
        'mobile-xl': ['20px', { lineHeight: '32px', letterSpacing: '-0.025em' }],
        'mobile-2xl': ['24px', { lineHeight: '36px', letterSpacing: '-0.05em' }],
        'mobile-3xl': ['30px', { lineHeight: '42px', letterSpacing: '-0.05em' }],
        'mobile-4xl': ['36px', { lineHeight: '48px', letterSpacing: '-0.1em' }],
      },
      animation: {
        'pulse-fast': 'pulse 0.5s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'mobile-bounce': 'mobile-bounce 0.15s ease-out',
        'mobile-press': 'mobile-press 0.1s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'glitch': 'glitch 0.3s ease-in-out',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'brutal-pop': 'brutal-pop 0.2s ease-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        'mobile-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
        },
        'mobile-press': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.98)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'neon-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            opacity: '1' 
          },
          '50%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            opacity: '0.8' 
          },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'brutal-pop': {
          '0%': { transform: 'scale(0.9) translate(0, 0)' },
          '50%': { transform: 'scale(1.05) translate(-2px, -2px)' },
          '100%': { transform: 'scale(1) translate(0, 0)' },
        },
      },
      // Mobile-optimized shadows + Neobrutalism
      boxShadow: {
        'mobile-sm': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'mobile-md': '0 4px 16px rgba(0, 0, 0, 0.16)',
        'mobile-lg': '0 8px 32px rgba(0, 0, 0, 0.24)',
        'mobile-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'brutal': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-lg': '6px 6px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-pink': '4px 4px 0px 0px rgba(255, 31, 140, 1)',
        'brutal-teal': '4px 4px 0px 0px rgba(0, 217, 192, 1)',
        'neon-pink': '0 0 20px rgba(255, 31, 140, 0.6), 0 0 40px rgba(255, 31, 140, 0.3)',
        'neon-teal': '0 0 20px rgba(0, 217, 192, 0.6), 0 0 40px rgba(0, 217, 192, 0.3)',
        'neon-green': '0 0 20px rgba(0, 168, 120, 0.6), 0 0 40px rgba(0, 168, 120, 0.3)',
      },
      // Mobile-optimized border radius
      borderRadius: {
        'mobile-sm': '0.5rem',  // 8px
        'mobile-md': '0.75rem', // 12px
        'mobile-lg': '1rem',    // 16px
        'mobile-xl': '1.5rem',  // 24px
      },
      // Touch-friendly minimum sizes
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
        'button': '48px',
      },
    },
  },
  plugins: [],
}