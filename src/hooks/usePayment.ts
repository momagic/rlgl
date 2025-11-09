import { useState, useCallback } from 'react'
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js'
import type { PayCommandInput } from '@worldcoin/minikit-js'
import type { PaymentResult } from '../types/contract'
import { CONTRACT_CONFIG } from '../types/contract'
import { useHapticFeedback } from './useHapticFeedback'

const DEFAULT_TURN_COST_WLD = '0.2' // Fallback price if dynamic fetch fails
const DEFAULT_WEEKLY_PASS_COST_WLD = '5.0' // Fallback price for weekly pass
const CONTRACT_ADDRESS = CONTRACT_CONFIG.worldchain.gameContract // Use actual deployed contract address

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastPaymentResult, setLastPaymentResult] = useState<PaymentResult | null>(null)
  const haptics = useHapticFeedback()

  const initiatePayment = useCallback(async (
    amount: string, 
    description: string
  ): Promise<PaymentResult> => {
    console.log('🔄 Payment initiated:', { amount, description, timestamp: new Date().toISOString() })
    
    if (!MiniKit.isInstalled()) {
      const error = 'MiniKit is not installed'
      console.error('❌ MiniKit not installed')
      setLastPaymentResult({ success: false, error })
      return { success: false, error }
    }

    console.log('✅ MiniKit is installed, proceeding with payment')
    setIsProcessing(true)
    setLastPaymentResult(null)

    try {
      // Generate unique reference for this payment
      const reference = crypto.randomUUID().replace(/-/g, '')
      console.log('📝 Generated payment reference:', reference)
      
      // Log contract address being used
      console.log('🏗️ Contract address:', CONTRACT_ADDRESS)
      console.log('💰 Amount conversion:', {
        inputAmount: amount,
        parsedAmount: parseFloat(amount),
        tokenDecimals: tokenToDecimals(parseFloat(amount), Tokens.WLD).toString()
      })
      
      // Create payment payload
      const payload: PayCommandInput = {
        reference,
        to: CONTRACT_ADDRESS,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(parseFloat(amount), Tokens.WLD).toString(),
          },
        ],
        description,
      }

      console.log('📦 Payment payload created:', JSON.stringify(payload, null, 2))

      // Send payment command to World App
      console.log('🚀 Sending payment command to MiniKit...')
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload)
      
      console.log('📨 Received payment response:', JSON.stringify(finalPayload, null, 2))
      
      // Log additional debugging for transaction failures
      if (finalPayload.status === 'error' && finalPayload.error_code === 'transaction_failed') {
        console.error('🔍 Transaction Failed Debug Info:', {
          contractAddress: CONTRACT_ADDRESS,
          amount: amount,
          tokenAmount: tokenToDecimals(parseFloat(amount), Tokens.WLD).toString(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          likelyCause: 'PAYMENT RECIPIENT NOT WHITELISTED',
          solution: 'Add contract address to World App Developer Portal -> Payment Recipients',
          note: 'Contract works for gameplay, so this is payment-specific authorization issue',
          potentialCauses: [
            '⭐ Contract address not whitelisted for payments (MOST LIKELY)',
            'App under review in World App store',
            'Payment permissions revoked during app update',
            'World App payment policy changes'
          ]
        })
      }
      
      if (finalPayload.status === 'success') {
        console.log('✅ Payment successful!', {
          transactionId: finalPayload.transaction_id,
          timestamp: new Date().toISOString()
        })
        haptics.paymentSuccess()
        const result: PaymentResult = {
          success: true,
          transactionHash: finalPayload.transaction_id,
        }
        setLastPaymentResult(result)
        return result
      } else {
        console.error('❌ Payment failed:', {
          status: finalPayload.status,
          errorCode: finalPayload.error_code,
          fullResponse: finalPayload,
          timestamp: new Date().toISOString()
        })
        haptics.paymentError()
        const error = `Payment failed: ${finalPayload.error_code || 'Unknown error'}`
        const result: PaymentResult = {
          success: false,
          error,
        }
        setLastPaymentResult(result)
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      console.error('💥 Payment exception caught:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        contractAddress: CONTRACT_ADDRESS,
        amount,
        description
      })
      haptics.paymentError()
      
      const result: PaymentResult = {
        success: false,
        error: errorMessage,
      }
      setLastPaymentResult(result)
      return result
    } finally {
      console.log('🏁 Payment process completed, setting isProcessing to false')
      setIsProcessing(false)
    }
  }, [haptics])

  const purchaseAdditionalTurns = useCallback(async (dynamicCost?: string): Promise<PaymentResult> => {
    const cost = dynamicCost || DEFAULT_TURN_COST_WLD
    return initiatePayment(cost, 'Purchase 3 additional game turns')
  }, [initiatePayment])

  const purchaseWeeklyPass = useCallback(async (dynamicCost?: string): Promise<PaymentResult> => {
    const cost = dynamicCost || DEFAULT_WEEKLY_PASS_COST_WLD
    return initiatePayment(cost, 'Purchase 7-day unlimited game turns')
  }, [initiatePayment])

  const verifyPayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      // In a real implementation, you would call your backend to verify the payment
      // For now, we'll assume the payment is valid if we get a transaction ID
      
      // This would typically involve:
      // 1. Call backend API with payment ID
      // 2. Backend verifies with World App API
      // 3. Backend confirms payment on-chain
      // 4. Return verification result
      
      return !!paymentId
    } catch (error) {
      return false
    }
  }, [])

  const clearLastResult = useCallback(() => {
    setLastPaymentResult(null)
  }, [])

  return {
    initiatePayment,
    purchaseAdditionalTurns,
    purchaseWeeklyPass,
    verifyPayment,
    isProcessing,
    lastPaymentResult,
    clearLastResult,
  }
}