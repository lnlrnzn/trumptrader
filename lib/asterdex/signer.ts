import { ethers } from 'ethers'

/**
 * AsterDEX Web3 Signing Implementation
 *
 * Based on AsterDEX API V3 documentation:
 * 1. Convert parameters to strings and sort by ASCII keys
 * 2. ABI encode with user, signer, and nonce
 * 3. Keccak256 hash
 * 4. ECDSA sign with private key
 */

export interface SignatureParams {
  user: string        // Main wallet address (ASTER_DEX_KEY)
  signer: string      // API wallet address (derived from ASTER_SECRET_KEY)
  privateKey: string  // ASTER_SECRET_KEY
  nonce: bigint       // Microsecond timestamp as BigInt
  timestamp: number   // Millisecond timestamp (MUST match request body)
  params: Record<string, any>
}

/**
 * Generate nonce (microsecond timestamp)
 */
export function generateNonce(): bigint {
  // Get current time in microseconds
  return BigInt(Date.now() * 1000)
}

/**
 * Convert parameters to sorted JSON string (matching Python implementation)
 * IMPORTANT: timestamp and recvWindow MUST be included in params before encoding!
 */
function serializeParams(params: Record<string, any>): string {
  // Remove null/undefined values
  const filtered: Record<string, any> = {}
  for (const key in params) {
    if (params[key] !== null && params[key] !== undefined) {
      // Convert all values to strings (Python treats all as strings)
      filtered[key] = String(params[key])
    }
  }

  // If no params, return empty object string "{}" not empty string
  // (Python json.dumps({}) returns "{}")
  if (Object.keys(filtered).length === 0) {
    return '{}'
  }

  // Convert to JSON with sorted keys, no spaces (matching Python)
  // Python: json.dumps(my_dict, sort_keys=True).replace(' ', '').replace('\'', '\"')
  return JSON.stringify(filtered, Object.keys(filtered).sort())
}

/**
 * Create AsterDEX signature for API request
 */
export function createAsterSignature({
  user,
  signer,
  privateKey,
  nonce,
  timestamp,
  params
}: SignatureParams): string {
  try {
    // Step 1: Add timestamp and recvWindow to params (CRITICAL!)
    // These MUST be in the params that get signed!
    // Use the timestamp passed in to ensure it matches the request body
    const paramsWithTimestamp = {
      ...params,
      recvWindow: '50000',
      timestamp: String(timestamp)
    }

    // Step 2: Serialize params to JSON string
    const serialized = serializeParams(paramsWithTimestamp)

    // Step 3: ABI encode
    // Format: ["string", "address", "address", "uint256"]
    // Values: [serialized, user, signer, nonce]
    // IMPORTANT: Addresses must be checksummed!
    const abiCoder = ethers.AbiCoder.defaultAbiCoder()
    const encoded = abiCoder.encode(
      ['string', 'address', 'address', 'uint256'],
      [serialized, ethers.getAddress(user), ethers.getAddress(signer), nonce]
    )

    // Step 4: Keccak256 hash
    const hash = ethers.keccak256(encoded)

    // Step 5: Sign with EIP-191 prefix (encode_defunct in Python)
    // Python: signable_msg = encode_defunct(hexstr=keccak_hex)
    // ethers.js equivalent: hashMessage then sign
    const wallet = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
    const messageHash = ethers.hashMessage(ethers.getBytes(hash))
    const signingKey = new ethers.SigningKey(wallet.privateKey)
    const signature = signingKey.sign(messageHash).serialized

    return signature
  } catch (error) {
    console.error('Error creating AsterDEX signature:', error)
    throw new Error(`Failed to create signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get signer address from private key
 */
export function getSignerAddress(privateKey: string): string {
  const wallet = new ethers.Wallet(
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  )
  return wallet.address
}

/**
 * Prepare signed request headers and body for AsterDEX API
 */
export function prepareSignedRequest(
  endpoint: string,
  params: Record<string, any>,
  config: {
    userAddress: string
    privateKey: string
  }
): {
  headers: Record<string, string>
  body: Record<string, any>
  url: string
} {
  const nonce = generateNonce()
  const signerAddress = getSignerAddress(config.privateKey)
  const timestamp = Date.now()

  // Create signature (timestamp must match what we send in request body!)
  const signature = createAsterSignature({
    user: config.userAddress,
    signer: signerAddress,
    privateKey: config.privateKey,
    nonce,
    timestamp,
    params
  })

  // Final request body must include:
  // - Original params
  // - recvWindow (was added during signing)
  // - timestamp (was added during signing)
  // - nonce, user, signer, signature (added here)
  return {
    headers: {
      'Content-Type': 'application/json'
      // NO X-MBX-APIKEY header - authentication is via signature in body/params only
    },
    body: {
      ...params,
      recvWindow: '50000',          // Must match what was signed
      timestamp,                    // Must match what was signed (milliseconds)
      nonce: nonce.toString(),      // Microsecond timestamp (required in body)
      user: config.userAddress,     // Main wallet address (required in body)
      signer: signerAddress,        // API wallet address (required in body)
      signature                     // ECDSA signature with EIP-191 prefix
    },
    url: endpoint
  }
}

/**
 * Validate AsterDEX configuration
 */
export function validateAsterConfig(config: {
  userAddress?: string
  privateKey?: string
  apiUrl?: string
}): { valid: boolean; error?: string } {
  if (!config.userAddress) {
    return { valid: false, error: 'ASTER_DEX_KEY (user address) is required' }
  }

  if (!config.privateKey) {
    return { valid: false, error: 'ASTER_SECRET_KEY (private key) is required' }
  }

  if (!config.apiUrl) {
    return { valid: false, error: 'ASTER_API_URL is required' }
  }

  // Validate address format
  if (!ethers.isAddress(config.userAddress)) {
    return { valid: false, error: 'Invalid user address format' }
  }

  // Validate private key format
  try {
    new ethers.Wallet(
      config.privateKey.startsWith('0x') ? config.privateKey : `0x${config.privateKey}`
    )
  } catch (error) {
    return { valid: false, error: 'Invalid private key format' }
  }

  return { valid: true }
}
