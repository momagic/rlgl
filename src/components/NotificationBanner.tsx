import { useState } from 'react'
import { Card, Typography } from './ui'
import { cn } from '../utils/cn'

interface NotificationBannerProps {
  title: string
  message: string
  type?: 'info' | 'warning' | 'success' | 'error'
  className?: string
  onClose?: () => void
  closable?: boolean
}

function NotificationBanner({ 
  title, 
  message, 
  type = 'info', 
  className = '',
  onClose,
  closable = true
}: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  const typeStyles = {
    info: {
      card: 'border-squid-teal bg-squid-teal/10',
      title: 'text-squid-teal',
      icon: '🔔'
    },
    warning: {
      card: 'border-squid-pink bg-squid-pink/10',
      title: 'text-squid-pink',
      icon: '⚠️'
    },
    success: {
      card: 'border-squid-green bg-squid-green/10',
      title: 'text-squid-green',
      icon: '✅'
    },
    error: {
      card: 'border-red-500 bg-red-500/10',
      title: 'text-red-500',
      icon: '❌'
    }
  }

  const styles = typeStyles[type]

  return (
    <Card 
      className={cn(
        'relative overflow-hidden',
        styles.card,
        'animate-fade-in',
        className
      )}
      variant={type === 'info' ? 'teal' : type === 'warning' ? 'pink' : 'default'}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0 text-lg">
          {styles.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <Typography 
            variant="h4" 
            className={cn(styles.title, 'font-squid-heading font-bold uppercase tracking-wider mb-1')}
          >
            {title}
          </Typography>
          <Typography 
            variant="body" 
            className="text-squid-white/80 text-sm leading-relaxed"
          >
            {message}
          </Typography>
        </div>

        {closable && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-full text-squid-white/60 hover:text-squid-white hover:bg-squid-white/10 transition-all duration-150"
            aria-label="Close notification"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}
      </div>
    </Card>
  )
}

export default NotificationBanner