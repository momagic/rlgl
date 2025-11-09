import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { languages } from '../i18n'

interface LanguageSwitcherProps {
  onClose?: () => void
}

function LanguageSwitcher({ onClose }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentLanguage = i18n.language
  const currentLanguageName = languages[currentLanguage as keyof typeof languages] || 'English'

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      })
    }
  }, [isOpen, isMobile])

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    setIsOpen(false)
    if (onClose) {
      onClose()
    }
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // Mobile native select implementation
  if (isMobile) {
    return (
      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="appearance-none bg-gray-800/50 text-white rounded-lg px-3 py-2 pr-8 text-sm border border-gray-600 focus:border-game-green focus:outline-none"
          aria-label="Change language"
        >
          {Object.entries(languages).map(([code, name]) => (
            <option key={code} value={code} className="bg-gray-800 text-white">
              {name}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }

  // Desktop dropdown implementation with improved z-index handling
  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
          aria-label="Change language"
        >
          <span className="text-sm">🌍</span>
          <span className="mobile-text-sm">{currentLanguageName}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Portal-style dropdown rendered at document level to escape stacking context */}
      {isOpen && (
        <>
          {/* Backdrop with highest z-index */}
          <div 
            className="fixed inset-0 z-[99998]" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown positioned absolutely at calculated coordinates */}
          <div 
            className="fixed z-[99999] w-48 bg-gray-800 rounded-lg shadow-2xl border border-gray-700"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="p-2">
              <div className="text-gray-300 mobile-text-xs font-medium px-3 py-2 border-b border-gray-700 mb-2">
                {t('settings.language.title')}
              </div>
              
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(languages).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors mobile-text-sm ${
                      currentLanguage === code
                        ? 'bg-game-green text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {name}
                      {currentLanguage === code && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default LanguageSwitcher