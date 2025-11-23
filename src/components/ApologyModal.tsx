import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Button } from './ui'

interface ApologyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApologyModal({ isOpen, onClose }: ApologyModalProps) {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(isOpen)

  useEffect(() => {
    setShowModal(isOpen)
  }, [isOpen])

  if (!showModal) return null

  const handleClose = () => {
    setShowModal(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 rounded-2xl border-4 border-squid-pink bg-[#101018]/95 p-6 shadow-[0_20px_60px_rgba(255,31,140,0.3)]">
        <div className="text-center space-y-6">
          {/* Header with icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-squid-pink to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">⚠️</span>
            </div>
          </div>

          {/* Title */}
          <Typography variant="h2" className="font-squid-heading font-bold text-white uppercase tracking-wide">
            {t('apologyModal.title')}
          </Typography>

          {/* Message */}
          <div className="space-y-4">
            <Typography variant="body" className="text-squid-white/90 text-sm leading-relaxed">
              {t('apologyModal.message1')}
            </Typography>
            
            <Typography variant="body" className="text-squid-white/90 text-sm leading-relaxed">
              {t('apologyModal.message2')}
            </Typography>
          </div>

          {/* Action button */}
          <div className="pt-4">
            <Button
              variant="pink"
              size="lg"
              onClick={handleClose}
              className="w-full"
            >
              {t('apologyModal.button')}
            </Button>
          </div>

          {/* Additional note */}
          <Typography variant="caption" className="text-squid-white/60 text-xs">
            {t('apologyModal.note')}
          </Typography>
        </div>
      </div>
    </div>
  )
}