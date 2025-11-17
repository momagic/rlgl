import { createPublicClient, http, type PublicClient } from 'viem'
import { worldchain } from 'viem/chains'

// Public RPC endpoints for World Chain
const PUBLIC_RPC_ENDPOINTS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro',
  'https://worldchain.drpc.org',
] as const

// Rate limiting configuration
const RATE_LIMITS = {
  requestsPerSecond: 5, // Conservative limit for public RPCs
  burstLimit: 20, // Allow short bursts
  cooldownMs: 1000, // Cooldown after hitting limits
}

// Cache configuration
const CACHE_CONFIG = {
  leaderboardTTL: 60000, // 60 seconds
  playerStatsTTL: 15000, // 15 seconds
  contractDataTTL: 60000, // 1 minute
  blockNumberTTL: 5000, // 5 seconds
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

interface RPCEndpoint {
  url: string
  client: any // Using any to avoid viem type compatibility issues
  isHealthy: boolean
  lastError?: Error
  lastErrorTime?: number
  requestCount: number
  lastRequestTime: number
  consecutiveErrors: number
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface RequestQueue {
  resolve: (value: any) => void
  reject: (error: Error) => void
  request: () => Promise<any>
  timestamp: number
}

class RPCManager {
  private endpoints: RPCEndpoint[] = []
  private currentEndpointIndex = 0
  private cache = new Map<string, CacheEntry<any>>()
  private requestQueue: RequestQueue[] = []
  private isProcessingQueue = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    this.initializeEndpoints()
    this.startHealthChecks()
    this.startQueueProcessor()
  }

  private initializeEndpoints() {
    this.endpoints = PUBLIC_RPC_ENDPOINTS.map(url => ({
      url,
      client: createPublicClient({
        chain: worldchain,
        transport: http(url, {
          timeout: 10000, // 10 second timeout
          retryCount: 0, // We handle retries ourselves
        })
      }),
      isHealthy: true,
      requestCount: 0,
      lastRequestTime: 0,
      consecutiveErrors: 0,
    }))
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, 60000) // Check every minute
  }

  private async performHealthChecks() {
    const healthCheckPromises = this.endpoints.map(async (endpoint) => {
      try {
        const blockNumber = await endpoint.client.getBlockNumber()
        if (blockNumber > 0) {
          endpoint.isHealthy = true
          endpoint.consecutiveErrors = 0
          endpoint.lastError = undefined
          endpoint.lastErrorTime = undefined
        }
      } catch (error) {
        endpoint.isHealthy = false
        endpoint.lastError = error as Error
        endpoint.lastErrorTime = Date.now()
        endpoint.consecutiveErrors++
        console.warn(`RPC endpoint ${endpoint.url} health check failed:`, error)
      }
    })

    await Promise.allSettled(healthCheckPromises)
  }

  private startQueueProcessor() {
    setInterval(() => {
      this.processQueue()
    }, 100) // Process queue every 100ms
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      const healthyEndpoints = this.endpoints.filter(ep => ep.isHealthy)
      
      if (healthyEndpoints.length === 0) {
        // All endpoints unhealthy, wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000))
        this.isProcessingQueue = false
        return
      }

      // Process requests respecting rate limits
      const requestsToProcess = Math.min(
        this.requestQueue.length,
        RATE_LIMITS.burstLimit
      )

      for (let i = 0; i < requestsToProcess; i++) {
        const queueItem = this.requestQueue.shift()
        if (!queueItem) break

        try {
          const result = await this.executeWithRetry(queueItem.request)
          queueItem.resolve(result)
        } catch (error) {
          queueItem.reject(error as Error)
        }

        // Rate limiting delay
        if (i < requestsToProcess - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 / RATE_LIMITS.requestsPerSecond))
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  private async executeWithRetry<T>(request: () => Promise<T>): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await request()
      } catch (error) {
        lastError = error as Error
        
        // Log detailed error information for debugging
        console.warn(`RPC request attempt ${attempt + 1} failed:`, {
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
          maxRetries: RETRY_CONFIG.maxRetries
        })
        
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
            RETRY_CONFIG.maxDelayMs
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }

  private getNextHealthyEndpoint(): RPCEndpoint | null {
    const healthyEndpoints = this.endpoints.filter(ep => ep.isHealthy)
    
    if (healthyEndpoints.length === 0) {
      return null
    }

    // Round-robin through healthy endpoints
    const endpoint = healthyEndpoints[this.currentEndpointIndex % healthyEndpoints.length]
    this.currentEndpointIndex++
    
    return endpoint
  }

  private getCacheKey(method: string, params: any[]): string {
    try {
      // Handle BigInt values in params by converting them to strings for cache key generation
      const serializedParams = JSON.stringify(params, (_, value) => {
        if (typeof value === 'bigint') {
          return value.toString()
        }
        return value
      })
      return `${method}:${serializedParams}`
    } catch (error) {
      // Fallback to a simple string representation if JSON.stringify fails
      console.warn('Failed to serialize cache key params:', error)
      return `${method}:${params.map(p => String(p)).join(',')}`
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now()
      for (const [k, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(k)
        }
      }
    }
  }

  // Public methods
  async request<T>(method: string, params: any[] = [], cacheTTL?: number): Promise<T> {
    const cacheKey = this.getCacheKey(method, params)
    
    // Check cache first
    if (cacheTTL) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    return new Promise<T>((resolve, reject) => {
      const request = async () => {
        const endpoint = this.getNextHealthyEndpoint()
        if (!endpoint) {
          throw new Error('No healthy RPC endpoints available')
        }

        try {
          endpoint.requestCount++
          endpoint.lastRequestTime = Date.now()
          
          // Execute the request based on method
          let result: T
          switch (method) {
            case 'getBlockNumber':
              result = await endpoint.client.getBlockNumber() as T
              break
            case 'readContract':
              result = await endpoint.client.readContract(params[0]) as T
              break
            case 'multicall':
              result = await endpoint.client.multicall(params[0]) as T
              break
            case 'getBalance':
              result = await endpoint.client.getBalance(params[0]) as T
              break
            case 'getTransaction':
              result = await endpoint.client.getTransaction(params[0]) as T
              break
            case 'getTransactionReceipt':
              result = await endpoint.client.getTransactionReceipt(params[0]) as T
              break
            case 'getLogs':
              result = await endpoint.client.getLogs(params[0]) as T
              break
            default:
              throw new Error(`Unsupported method: ${method}`)
          }

          // Cache the result if TTL is specified
          if (cacheTTL) {
            this.setCache(cacheKey, result, cacheTTL)
          }

          endpoint.consecutiveErrors = 0
          return result
        } catch (error) {
          endpoint.consecutiveErrors++
          if (endpoint.consecutiveErrors >= 3) {
            endpoint.isHealthy = false
            endpoint.lastError = error as Error
            endpoint.lastErrorTime = Date.now()
          }
          throw error
        }
      }

      this.requestQueue.push({ resolve, reject, request, timestamp: Date.now() })
    })
  }

  // Convenience methods with appropriate caching
  async getBlockNumber(): Promise<bigint> {
    return this.request<bigint>('getBlockNumber', [], CACHE_CONFIG.blockNumberTTL)
  }

  async readContract(config: any): Promise<any> {
    return this.executeWithRetry(async () => {
      const endpoint = this.getNextHealthyEndpoint()
      if (!endpoint) throw new Error('No healthy RPC endpoints available')

      console.log('📖 Contract read attempt:', {
        address: config.address,
        functionName: config.functionName,
        args: config.args,
        abiFunction: config.abi?.find((item: any) => item.name === config.functionName)?.name
      })

      try {
        const result = await endpoint.client.readContract(config)
        console.log('✅ Contract read success:', {
          functionName: config.functionName,
          result
        })
        return result
      } catch (error) {
        console.error('❌ Contract read failed:', {
          functionName: config.functionName,
          address: config.address,
          args: config.args,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }
    })
  }

  async multicall(params: any): Promise<any> {
    return this.request('multicall', [params])
  }

  async getBalance(params: any): Promise<bigint> {
    return this.request<bigint>('getBalance', [params])
  }

  async getTransaction(params: any): Promise<any> {
    return this.request('getTransaction', [params])
  }

  async getTransactionReceipt(params: any): Promise<any> {
    return this.request('getTransactionReceipt', [params])
  }

  async getLogs(params: any): Promise<any> {
    return this.request('getLogs', [params])
  }

  // Get current client for direct access (fallback)
  getCurrentClient(): PublicClient | null {
    const endpoint = this.getNextHealthyEndpoint()
    return endpoint?.client || null
  }

  // Get health status
  getHealthStatus() {
    return {
      totalEndpoints: this.endpoints.length,
      healthyEndpoints: this.endpoints.filter(ep => ep.isHealthy).length,
      queueLength: this.requestQueue.length,
      cacheSize: this.cache.size,
      endpoints: this.endpoints.map(ep => ({
        url: ep.url,
        isHealthy: ep.isHealthy,
        requestCount: ep.requestCount,
        consecutiveErrors: ep.consecutiveErrors,
        lastError: ep.lastError?.message,
        lastErrorTime: ep.lastErrorTime,
      }))
    }
  }

  getLeaderboardClient(): any | null {
    try {
      const url = (import.meta as any)?.env?.VITE_LEADERBOARD_RPC_URL as string | undefined
      if (url && typeof url === 'string' && url.length > 0) {
        return (createPublicClient({
          chain: worldchain,
          transport: http(url, { timeout: 10000, retryCount: 0 })
        }) as any)
      }
    } catch {}
    return this.getCurrentClient()
  }

  async readContractLeaderboard(config: any): Promise<any> {
    const cacheKey = this.getCacheKey('leaderboard', [config.address, config.functionName, config.args])
    const cached = this.getFromCache<any>(cacheKey)
    if (cached !== null) {
      return cached
    }

    const client = this.getLeaderboardClient()
    if (!client) {
      const result = await this.readContract(config)
      this.setCache(cacheKey, result, CACHE_CONFIG.leaderboardTTL)
      return result
    }

    try {
      const result = await this.executeWithRetry(async () => {
        return client.readContract(config)
      })
      this.setCache(cacheKey, result, CACHE_CONFIG.leaderboardTTL)
      return result
    } catch (error) {
      const fallback = await this.readContract(config)
      this.setCache(cacheKey, fallback, CACHE_CONFIG.leaderboardTTL)
      return fallback
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.cache.clear()
    this.requestQueue.length = 0
  }
}

// Singleton instance
export const rpcManager = new RPCManager()

// Export types
export type { RPCEndpoint }
export { CACHE_CONFIG, RATE_LIMITS, RETRY_CONFIG }
