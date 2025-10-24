/**
 * Verify if the private key matches the API wallet address
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'

config({ path: resolve(__dirname, '../.env.local') })

console.log('🔍 Verifying API Wallet credentials...\n')

const API_WALLET_ADDRESS = process.env.API_WALLET_ADDRESS!
const API_WALLET_PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY!

console.log('Expected Address:', API_WALLET_ADDRESS)
console.log()

try {
  const wallet = new ethers.Wallet(
    API_WALLET_PRIVATE_KEY.startsWith('0x') ? API_WALLET_PRIVATE_KEY : `0x${API_WALLET_PRIVATE_KEY}`
  )

  console.log('Derived Address:', wallet.address)
  console.log()

  if (wallet.address.toLowerCase() === API_WALLET_ADDRESS.toLowerCase()) {
    console.log('✅ MATCH! Private key is correct for this address.')
  } else {
    console.log('❌ MISMATCH! Private key does NOT match the address.')
    console.log()
    console.log('This means:')
    console.log('1. You need to get the REAL private key for', API_WALLET_ADDRESS)
    console.log('2. OR delete this API wallet and create a new one, saving the private key this time')
  }
} catch (error) {
  console.error('❌ Error:', error)
}
