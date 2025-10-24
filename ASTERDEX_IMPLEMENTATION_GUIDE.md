# AsterDEX API Implementation Guide

A concise guide for implementing AsterDEX authentication and trading in TypeScript/JavaScript.

## Prerequisites

```bash
npm install ethers axios
```

## Authentication Flow

AsterDEX uses Web3 signing with these steps:

### 1. Prepare Parameters

```typescript
const params = {
  // Your API params (symbol, side, quantity, etc.)
  // For balance check, this is empty {}
}

// CRITICAL: Add timestamp and recvWindow to params BEFORE signing
const paramsWithAuth = {
  ...params,
  recvWindow: '50000',
  timestamp: String(Date.now())  // Milliseconds as string
}
```

### 2. Serialize to JSON

```typescript
// Sort keys alphabetically and stringify
const sortedKeys = Object.keys(paramsWithAuth).sort()
const sortedParams = {}
sortedKeys.forEach(key => {
  sortedParams[key] = String(paramsWithAuth[key])  // Convert all to strings
})
const jsonStr = JSON.stringify(sortedParams)
// Example: {"recvWindow":"50000","timestamp":"1761258426012"}
```

### 3. ABI Encode

```typescript
import { ethers } from 'ethers'

const nonce = BigInt(Date.now() * 1000)  // Microseconds as BigInt

const abiCoder = ethers.AbiCoder.defaultAbiCoder()
const encoded = abiCoder.encode(
  ['string', 'address', 'address', 'uint256'],
  [
    jsonStr,                           // Serialized params
    ethers.getAddress(userAddress),    // Main wallet (checksummed)
    ethers.getAddress(signerAddress),  // API wallet (checksummed)
    nonce                              // Microsecond timestamp
  ]
)
```

### 4. Keccak Hash

```typescript
const hash = ethers.keccak256(encoded)
```

### 5. Sign with EIP-191 Prefix

**CRITICAL:** Use `encode_defunct` equivalent (EIP-191 prefix), NOT raw ECDSA!

```typescript
const wallet = new ethers.Wallet(privateKey)

// Method 1: Using hashMessage
const messageHash = ethers.hashMessage(ethers.getBytes(hash))
const signingKey = new ethers.SigningKey(wallet.privateKey)
const signature = signingKey.sign(messageHash).serialized

// Method 2: Simpler (equivalent)
// const signature = wallet.signMessageSync(ethers.getBytes(hash))
```

### 6. Build Request

```typescript
const requestBody = {
  ...params,                    // Original params
  recvWindow: '50000',          // Must match signed value
  timestamp: Date.now(),        // Must match signed value
  nonce: nonce.toString(),      // Microseconds as string
  user: userAddress,            // Main wallet
  signer: signerAddress,        // API wallet
  signature                     // 0x... signature
}

// GET request
const response = await axios.get('https://fapi.asterdex.com/fapi/v3/balance', {
  params: requestBody
})

// POST request
const response = await axios.post('https://fapi.asterdex.com/fapi/v3/order', requestBody, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})
```

## Complete Working Example

```typescript
import { ethers } from 'ethers'
import axios from 'axios'

const USER_ADDRESS = '0x...'      // Your main wallet
const API_PRIVATE_KEY = '0x...'   // Your API wallet private key

async function getBalance() {
  // 1. Generate timestamps
  const nonce = BigInt(Date.now() * 1000)
  const timestamp = Date.now()

  // 2. Prepare params with timestamp and recvWindow
  const params = {
    recvWindow: '50000',
    timestamp: String(timestamp)
  }

  // 3. Serialize (sorted keys)
  const jsonStr = JSON.stringify(params, Object.keys(params).sort())

  // 4. Get signer address
  const wallet = new ethers.Wallet(API_PRIVATE_KEY)
  const signerAddress = wallet.address

  // 5. ABI encode
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const encoded = abiCoder.encode(
    ['string', 'address', 'address', 'uint256'],
    [jsonStr, ethers.getAddress(USER_ADDRESS), ethers.getAddress(signerAddress), nonce]
  )

  // 6. Keccak hash
  const hash = ethers.keccak256(encoded)

  // 7. Sign with EIP-191 prefix
  const messageHash = ethers.hashMessage(ethers.getBytes(hash))
  const signingKey = new ethers.SigningKey(wallet.privateKey)
  const signature = signingKey.sign(messageHash).serialized

  // 8. Make request
  const response = await axios.get('https://fapi.asterdex.com/fapi/v3/balance', {
    params: {
      timestamp,
      recvWindow: '50000',
      nonce: nonce.toString(),
      user: USER_ADDRESS,
      signer: signerAddress,
      signature
    }
  })

  return response.data
}
```

## Critical Gotchas

### ❌ Common Mistakes

1. **Not including timestamp/recvWindow in signed params**
   ```typescript
   // WRONG: Empty params
   const jsonStr = JSON.stringify({})

   // CORRECT: Include timestamp and recvWindow
   const jsonStr = JSON.stringify({
     recvWindow: '50000',
     timestamp: String(Date.now())
   })
   ```

2. **Using raw ECDSA instead of EIP-191 prefixed signature**
   ```typescript
   // WRONG: Raw signature
   const signature = signingKey.sign(hash).serialized

   // CORRECT: With EIP-191 prefix (encode_defunct)
   const messageHash = ethers.hashMessage(ethers.getBytes(hash))
   const signature = signingKey.sign(messageHash).serialized
   ```

3. **Mismatched timestamps**
   ```typescript
   // WRONG: Different timestamps
   const signature = createSignature({ timestamp: Date.now() })
   // ... later ...
   const body = { timestamp: Date.now() }  // Different value!

   // CORRECT: Same timestamp
   const timestamp = Date.now()
   const signature = createSignature({ timestamp })
   const body = { timestamp }
   ```

4. **Not checksumming addresses**
   ```typescript
   // WRONG: Lowercase address
   encode(['string', 'address', 'address', 'uint256'],
          [jsonStr, userAddress, signerAddress, nonce])

   // CORRECT: Checksummed addresses
   encode(['string', 'address', 'address', 'uint256'],
          [jsonStr, ethers.getAddress(userAddress), ethers.getAddress(signerAddress), nonce])
   ```

5. **Wrong nonce format**
   ```typescript
   // WRONG: Milliseconds
   const nonce = BigInt(Date.now())

   // CORRECT: Microseconds
   const nonce = BigInt(Date.now() * 1000)
   ```

## Trading Setup

Before trading, configure your account:

```typescript
// 1. Set leverage to 100x
await axios.post('https://fapi.asterdex.com/fapi/v3/leverage', {
  symbol: 'BTCUSDT',
  leverage: 100,
  // ... + auth params (timestamp, nonce, user, signer, signature)
})

// 2. Set position mode to ONE_WAY (not HEDGE)
await axios.post('https://fapi.asterdex.com/fapi/v3/positionSide/dual', {
  dualSidePosition: false,  // false = ONE_WAY, true = HEDGE
  // ... + auth params
})

// 3. Place market order
await axios.post('https://fapi.asterdex.com/fapi/v3/order', {
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: '0.001',
  // ... + auth params
})
```

## Useful Endpoints

- `GET /fapi/v3/balance` - Account balance
- `GET /fapi/v3/ticker/price?symbol=BTCUSDT` - Current price
- `GET /fapi/v3/positionRisk` - Open positions
- `POST /fapi/v3/order` - Place order
- `DELETE /fapi/v3/order` - Cancel order
- `POST /fapi/v3/leverage` - Set leverage
- `POST /fapi/v3/positionSide/dual` - Set position mode

## Testing

```bash
# Create test script
npx tsx test-aster.ts

# Check if authentication works
# You should see your account balance (even if $0)
```

## References

- AsterDEX API Docs: https://github.com/asterdex/api-docs
- Python Example: https://github.com/asterdex/api-docs/blob/master/aster-broker-api-key-registration.md
- ethers.js: https://docs.ethers.org/v6/

## Key Differences from Binance

AsterDEX uses Web3 signing (Keccak + ECDSA) instead of HMAC-SHA256:

| Binance                 | AsterDEX                        |
|-------------------------|----------------------------------|
| API Key + Secret        | Wallet Address + Private Key     |
| HMAC-SHA256             | Keccak256 + ECDSA (EIP-191)      |
| Query string signature  | JSON params → ABI encode → sign  |
| No nonce                | Microsecond nonce required       |

---

**Implementation verified working on 2025-10-23** ✅
