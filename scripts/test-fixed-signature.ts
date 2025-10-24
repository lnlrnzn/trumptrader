/**
 * Test the FIXED signature implementation
 * Key changes:
 * 1. Include timestamp and recvWindow in the params that get signed
 * 2. Use EIP-191 prefixed signature (encode_defunct equivalent)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import axios from 'axios'

config({ path: resolve(__dirname, '../.env.local') })

const USER = process.env.ASTER_DEX_KEY!
const PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY!
const API_URL = 'https://fapi.asterdex.com'

async function testFixedSignature() {
  console.log('🧪 Testing FIXED signature implementation\n')
  console.log('Key changes:')
  console.log('  1. Include timestamp and recvWindow in signed params')
  console.log('  2. Use EIP-191 prefixed signature (encode_defunct)\n')

  const wallet = new ethers.Wallet(
    PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
  )
  const signer = wallet.address

  console.log('User:', USER)
  console.log('Signer:', signer)
  console.log()

  // Generate timestamps
  const nonce = BigInt(Date.now() * 1000)
  const timestamp = Date.now()

  // Step 1: Build params dict with timestamp and recvWindow
  const params: Record<string, any> = {
    recvWindow: '50000',
    timestamp: String(timestamp)
  }

  console.log('Step 1: Params (including timestamp and recvWindow)')
  console.log(params)
  console.log()

  // Step 2: Serialize to JSON (sorted keys)
  const sortedKeys = Object.keys(params).sort()
  const sortedParams: Record<string, any> = {}
  sortedKeys.forEach(key => {
    sortedParams[key] = params[key]
  })
  const jsonStr = JSON.stringify(sortedParams)

  console.log('Step 2: JSON String (sorted keys)')
  console.log(jsonStr)
  console.log()

  // Step 3: ABI encode
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const encoded = abiCoder.encode(
    ['string', 'address', 'address', 'uint256'],
    [jsonStr, ethers.getAddress(USER), ethers.getAddress(signer), nonce]
  )

  console.log('Step 3: ABI Encoded')
  console.log(encoded.substring(0, 66) + '...')
  console.log()

  // Step 4: Keccak hash
  const hash = ethers.keccak256(encoded)
  console.log('Step 4: Keccak Hash')
  console.log(hash)
  console.log()

  // Step 5: Sign with EIP-191 prefix (encode_defunct)
  const messageHash = ethers.hashMessage(ethers.getBytes(hash))
  const signingKey = new ethers.SigningKey(wallet.privateKey)
  const signature = signingKey.sign(messageHash).serialized

  console.log('Step 5: Signature (with EIP-191 prefix)')
  console.log(signature)
  console.log()

  // Step 6: Build request
  const requestParams = {
    timestamp,
    recvWindow: '50000',
    nonce: nonce.toString(),
    user: USER,
    signer,
    signature
  }

  console.log('Step 6: Request Params')
  console.log(requestParams)
  console.log()

  // Step 7: Make API call
  try {
    console.log('📡 Calling /fapi/v3/balance...')
    const response = await axios.get(`${API_URL}/fapi/v3/balance`, {
      params: requestParams
    })

    console.log('✅ SUCCESS!')
    console.log(JSON.stringify(response.data, null, 2))
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data)
      console.error('Status:', error.response.status)
      console.error('\nDebug info:')
      console.error('  jsonStr:', jsonStr)
      console.error('  hash:', hash)
      console.error('  signature:', signature)
    } else {
      console.error('❌ Network Error:', error.message)
    }
  }
}

testFixedSignature()
