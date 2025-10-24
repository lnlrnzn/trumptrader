/**
 * Test with REVERSED user/signer - maybe API wallet should be the "user"
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import axios from 'axios'

config({ path: resolve(__dirname, '../.env.local') })

const API_URL = 'https://fapi.asterdex.com'
const API_WALLET = process.env.API_WALLET_ADDRESS!
const API_PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY!

async function testReversed() {
  console.log('🧪 Testing with API wallet as BOTH user AND signer...\n')

  const wallet = new ethers.Wallet(API_PRIVATE_KEY.startsWith('0x') ? API_PRIVATE_KEY : `0x${API_PRIVATE_KEY}`)
  const nonce = BigInt(Date.now() * 1000)
  const timestamp = Date.now()

  console.log('User (API Wallet):', API_WALLET)
  console.log('Signer (API Wallet):', wallet.address)
  console.log()

  // Create signature
  const params: Record<string, any> = {}

  const sortedKeys = Object.keys(params).sort()
  const pairs: string[] = []
  for (const key of sortedKeys) {
    const value = params[key]
    if (value !== undefined && value !== null) {
      pairs.push(`${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    }
  }
  const serialized = pairs.join('&')

  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const encoded = abiCoder.encode(
    ['string', 'address', 'address', 'uint256'],
    [serialized, API_WALLET, wallet.address, nonce]
  )

  const hash = ethers.keccak256(encoded)
  const messageHash = ethers.hashMessage(ethers.getBytes(hash))
  const signingKey = new ethers.SigningKey(wallet.privateKey)
  const signature = signingKey.sign(messageHash).serialized

  console.log('Signature:', signature)
  console.log()

  // Make request
  try {
    const response = await axios.get(`${API_URL}/fapi/v3/balance`, {
      params: {
        timestamp,
        nonce: nonce.toString(),
        user: API_WALLET,
        signer: wallet.address,
        signature
      }
    })

    console.log('✅ SUCCESS!', response.data)
  } catch (error: any) {
    console.error('❌ FAILED:', error.response?.data || error.message)
  }
}

testReversed()
