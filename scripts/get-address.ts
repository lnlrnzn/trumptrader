/**
 * Helper script to derive Ethereum address from private key
 *
 * Run with: npx tsx scripts/get-address.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

console.log('🔐 Deriving Ethereum addresses from private keys...\n')

// Get the private key from env
const privateKey = process.env.ASTER_SECRET_KEY

if (!privateKey) {
  console.error('❌ ASTER_SECRET_KEY not found in .env.local')
  process.exit(1)
}

try {
  // Add 0x prefix if missing
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`

  // Create wallet from private key
  const wallet = new ethers.Wallet(formattedKey)

  console.log('✅ Your Ethereum Address (ASTER_DEX_KEY):')
  console.log(wallet.address)
  console.log()
  console.log('📝 Update your .env.local with:')
  console.log(`ASTER_DEX_KEY=${wallet.address}`)
  console.log(`ASTER_SECRET_KEY=${privateKey}`)
  console.log()
  console.log('⚠️  IMPORTANT:')
  console.log('   - ASTER_DEX_KEY = Your wallet ADDRESS (0x...)')
  console.log('   - ASTER_SECRET_KEY = Your private key (64 hex chars)')
  console.log('   - These should be DIFFERENT values!')

} catch (error) {
  console.error('❌ Error deriving address:', error)
  if (error instanceof Error) {
    console.error(error.message)
  }
}
