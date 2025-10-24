/**
 * Test using API wallet for BOTH user and signer
 * Based on Discord finding: user might need to be a software wallet, not hardware wallet
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import axios from 'axios'

config({ path: resolve(__dirname, '../.env.local') })

const API_URL = 'https://fapi.asterdex.com'
const API_WALLET = process.env.API_WALLET_ADDRESS!
const API_PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY!

async function testSameWallet() {
  console.log('🧪 Testing with API wallet as BOTH user AND signer...')
  console.log('   (Based on Discord finding: Hardware wallets might not work)\n')

  const wallet = new ethers.Wallet(
    API_PRIVATE_KEY.startsWith('0x') ? API_PRIVATE_KEY : `0x${API_PRIVATE_KEY}`
  )

  console.log('User (API Wallet):', API_WALLET)
  console.log('Signer (API Wallet):', wallet.address)
  console.log()

  const nonce = BigInt(Date.now() * 1000)
  const timestamp = Date.now()
  const params: Record<string, any> = {}

  // Serialize params (empty object for balance endpoint)
  const sortedKeys = Object.keys(params).sort()
  const pairs: string[] = []
  for (const key of sortedKeys) {
    const value = params[key]
    if (value !== undefined && value !== null) {
      pairs.push(`${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    }
  }
  const serialized = pairs.join('&')

  console.log('Serialized params:', serialized === '' ? '(empty)' : serialized)

  // ABI encode
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const encoded = abiCoder.encode(
    ['string', 'address', 'address', 'uint256'],
    [serialized, API_WALLET, wallet.address, nonce]
  )

  console.log('Encoded:', encoded.substring(0, 66) + '...')

  // Keccak hash
  const hash = ethers.keccak256(encoded)
  console.log('Hash:', hash)

  // Sign with Ethereum message prefix (encode_defunct)
  const messageHash = ethers.hashMessage(ethers.getBytes(hash))
  const signingKey = new ethers.SigningKey(wallet.privateKey)
  const signature = signingKey.sign(messageHash).serialized

  console.log('Signature:', signature)
  console.log()

  // Make request
  try {
    console.log('📡 Calling /fapi/v3/balance...')
    const response = await axios.get(`${API_URL}/fapi/v3/balance`, {
      params: {
        timestamp,
        nonce: nonce.toString(),
        user: API_WALLET,
        signer: wallet.address,
        signature
      }
    })

    console.log('✅ SUCCESS!')
    console.log(JSON.stringify(response.data, null, 2))
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data)
      console.error('Status:', error.response.status)
    } else {
      console.error('❌ Network Error:', error.message)
    }
  }
}

testSameWallet()
