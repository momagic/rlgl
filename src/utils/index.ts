/**
 * Truncates a wallet address to show first 6 and last 4 characters
 * @param address - The wallet address to truncate
 * @returns Truncated address in format "0x1234...5678"
 */
export function truncateAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Formats a display name from user data
 * @param user - User object with potential username and wallet address
 * @returns Formatted display name
 */
export function getDisplayName(user: { username?: string; walletAddress?: string }): string {
  if (user.username) return user.username
  if (user.walletAddress) return truncateAddress(user.walletAddress)
  return 'Unknown User'
} 