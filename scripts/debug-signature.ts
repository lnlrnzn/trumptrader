/**
 * Debug script to show all intermediate values in signature generation
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'

config({ path: resolve(__dirname, '../.env.local') })

const USER = process.env.ASTER_DEX_KEY!
const SIGNER = process.env.API_WALLET_ADDRESS!
const PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY!

console.log('🔍 DEBUG: Signature Generation Step-by-Step\n')

// Step 1: Parameters
const params = {}
console.log('Step 1: Parameters')
console.log('  Input params:', params)

// Step 2: JSON Stringify
const sortedKeys = Object.keys(params).sort()
const sortedParams: Record<string, any> = {}
sortedKeys.forEach(key => {
  sortedParams[key] = params[key]
})
const jsonStr = JSON.stringify(sortedParams)
console.log('  JSON string:', jsonStr)
console.log('  JSON length:', jsonStr.length)
console.log()

// Step 3: Prepare values
const nonce = BigInt(Date.now() * 1000)
const timestamp = Date.now()
console.log('Step 2: Values')
console.log('  User:', USER)
console.log('  User (checksummed):', ethers.getAddress(USER))
console.log('  Signer:', SIGNER)
console.log('  Signer (checksummed):', ethers.getAddress(SIGNER))
console.log('  Nonce:', nonce.toString())
console.log('  Timestamp:', timestamp)
console.log()

// Step 4: ABI Encode
console.log('Step 3: ABI Encoding')
const abiCoder = ethers.AbiCoder.defaultAbiCoder()
const encoded = abiCoder.encode(
  ['string', 'address', 'address', 'uint256'],
  [jsonStr, ethers.getAddress(USER), ethers.getAddress(SIGNER), nonce]
)
console.log('  Types: [\'string\', \'address\', \'address\', \'uint256\']')
console.log('  Values: [jsonStr, user, signer, nonce]')
console.log('  Encoded (hex):', encoded)
console.log('  Encoded length:', encoded.length)
console.log()

// Step 5: Keccak Hash
console.log('Step 4: Keccak256 Hash')
const hash = ethers.keccak256(encoded)
console.log('  Hash:', hash)
console.log()

// Step 6: Sign (both methods)
const wallet = new ethers.Wallet(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`)

console.log('Step 5: Signing')
console.log('  Wallet address:', wallet.address)
console.log('  Match signer?', wallet.address.toLowerCase() === SIGNER.toLowerCase())
console.log()

// Method 1: RAW signature (no prefix)
const signingKey = new ethers.SigningKey(wallet.privateKey)
const sigRaw = signingKey.sign(hash).serialized
console.log('  Method 1 - RAW ECDSA (no prefix):')
console.log('    Signature:', sigRaw)
console.log()

// Method 2: With EIP-191 prefix
const sigPrefixed = wallet.signMessageSync(ethers.getBytes(hash))
console.log('  Method 2 - With EIP-191 prefix:')
console.log('    Signature:', sigPrefixed)
console.log()

// Step 7: Build URL
const queryParams = new URLSearchParams({
  timestamp: timestamp.toString(),
  nonce: nonce.toString(),
  user: USER,
  signer: SIGNER,
  signature: sigRaw
})
const url = `https://fapi.asterdex.com/fapi/v3/balance?${queryParams.toString()}`
console.log('Step 6: Request URL')
console.log('  URL:', url)
console.log()

console.log('=' .repeat(80))
console.log('COMPARE THESE VALUES WITH PYTHON IMPLEMENTATION:')
console.log('=' .repeat(80))
console.log('jsonStr:', jsonStr)
console.log('encoded:', encoded)
console.log('hash:', hash)
console.log('signature (raw):', sigRaw)
console.log('signature (prefixed):', sigPrefixed)
