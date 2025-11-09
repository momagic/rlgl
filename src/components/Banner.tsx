import { useState, useEffect, useRef } from 'react'
import { Card } from './ui'
import { sanitizeNumber } from '../utils/inputSanitizer'

interface BannerData {
  id: string
  image: string
  alt: string
  link?: string
}

interface BannerProps {
  banners: BannerData[]
  autoRotate?: boolean
  rotationInterval?: number
  className?: string
}

function Banner({ banners, autoRotate = true, rotationInterval = 5000, className = '' }: BannerProps) {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const swipeThreshold = 50 // Minimum distance for a swipe

  // Auto-rotate banners
  useEffect(() => {
    if (!autoRotate || banners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      )
    }, rotationInterval)

    return () => clearInterval(interval)
  }, [autoRotate, banners.length, rotationInterval])

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const clientX = e.targetTouches[0].clientX
    const validation = sanitizeNumber(clientX, { min: 0, max: window.innerWidth || 4000 })
    if (validation.isValid) {
      touchStartX.current = clientX
    } else {
      console.warn('Touch start X coordinate validation failed:', validation.errors)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const validation = sanitizeNumber(touchEndX.current, { min: 0, max: window.innerWidth || 4000 })
    
    if (validation.isValid) {
      const distance = touchStartX.current - touchEndX.current
      const isLeftSwipe = distance > swipeThreshold
      const isRightSwipe = distance < -swipeThreshold

      if (isLeftSwipe && banners.length > 1) {
        // Swipe left - next banner
        setCurrentBannerIndex((prevIndex) => 
          prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        )
      }

      if (isRightSwipe && banners.length > 1) {
        // Swipe right - previous banner
        setCurrentBannerIndex((prevIndex) => 
          prevIndex === 0 ? banners.length - 1 : prevIndex - 1
        )
      }
    } else {
      console.warn('Touch end X coordinate validation failed:', validation.errors)
    }

    // Reset touch positions
    touchStartX.current = null
    touchEndX.current = null
  }

  const goToNextBanner = () => {
    if (banners.length <= 1) return
    setCurrentBannerIndex((prevIndex) => 
      prevIndex === banners.length - 1 ? 0 : prevIndex + 1
    )
  }

  const goToPreviousBanner = () => {
    if (banners.length <= 1) return
    setCurrentBannerIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    )
  }

  if (banners.length === 0) return null

  const currentBanner = banners[currentBannerIndex]

  const handleBannerClick = () => {
    if (currentBanner.link) {
      window.open(currentBanner.link, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <div 
        className={`relative group ${
          currentBanner.link ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
        }`}
        onClick={handleBannerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentBanner.image}
          alt={currentBanner.alt}
          className="w-full h-auto object-cover rounded-lg select-none"
          loading="lazy"
          draggable={false}
        />
        
        {/* Navigation arrows for desktop */}
        {banners.length > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
              onClick={(e) => {
                e.stopPropagation()
                goToPreviousBanner()
              }}
              aria-label="Previous banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
              onClick={(e) => {
                e.stopPropagation()
                goToNextBanner()
              }}
              aria-label="Next banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Banner indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentBannerIndex
                    ? 'bg-white opacity-100'
                    : 'bg-white/50 opacity-60 hover:opacity-80'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentBannerIndex(index)
                }}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* External link indicator */}
        {currentBanner.link && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 rounded-full p-1">
              <svg 
                className="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default Banner