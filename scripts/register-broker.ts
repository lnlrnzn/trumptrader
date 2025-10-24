/**
 * Register as AsterDEX Broker/Agent
 *
 * Based on: https://github.com/asterdex/api-docs/blob/master/aster-broker-api-key-registration.md
 *
 * Run with: npx tsx scripts/register-broker.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import axios from 'axios'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

const API_URL = process.env.ASTER_API_URL || 'https://fapi.asterdex.com'
const USER_ADDRESS = process.env.ASTER_DEX_KEY!
const PRIVATE_KEY = process.env.API_WALLET_PRIVATE_KEY || process.env.ASTER_SECRET_KEY!

async function registerBroker() {
  console.log('🔐 Registering as AsterDEX Broker/Agent...\n')

  try {
    const wallet = new ethers.Wallet(
      PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
    )

    console.log('User Address:', USER_ADDRESS)
    console.log('Signer Address:', wallet.address)
    console.log()

    // Step 1: Get nonce
    console.log('Step 1: Getting nonce...')
    const nonceResponse = await axios.post(`${API_URL}/bapi/futures/v1/public/future/web3/get-nonce`, {
      walletAddress: USER_ADDRESS
    })

    const nonce = nonceResponse.data.data.nonce
    console.log('✅ Nonce:', nonce)
    console.log()

    // Step 2: Sign message
    console.log('Step 2: Signing message...')
    const message = `You are signing into Aster DEX ${nonce}`
    console.log('Message:', message)

    const signature = await wallet.signMessage(message)
    console.log('✅ Signature:', signature)
    console.log()

    // Step 3: Register from 3rd party (broker registration)
    console.log('Step 3: Registering broker account...')
    const registerResponse = await axios.post(`${API_URL}/bapi/futures/v1/public/future/web3/register-from-3party`, {
      walletAddress: USER_ADDRESS,
      signature,
      nonce
    })

    console.log('✅ Registration response:', JSON.stringify(registerResponse.data, null, 2))
    console.log()

    // Step 4: Create API key (if needed)
    if (registerResponse.data.success) {
      console.log('Step 4: Creating broker API key...')

      // Get new nonce for API key creation
      const nonceResponse2 = await axios.post(`${API_URL}/bapi/futures/v1/public/future/web3/get-nonce`, {
        walletAddress: USER_ADDRESS
      })
      const nonce2 = nonceResponse2.data.data.nonce
      const message2 = `You are signing into Aster DEX ${nonce2}`
      const signature2 = await wallet.signMessage(message2)

      const apiKeyResponse = await axios.post(`${API_URL}/bapi/futures/v1/public/future/web3/broker-create-api-key`, {
        walletAddress: USER_ADDRESS,
        signature: signature2,
        nonce: nonce2
      })

      console.log('✅ API Key created:', JSON.stringify(apiKeyResponse.data, null, 2))
      console.log()

      const { apiKey, apiSecret, uid, keyId } = apiKeyResponse.data.data

      console.log('📝 IMPORTANT - Save these credentials:')
      console.log(`BROKER_API_KEY=${apiKey}`)
      console.log(`BROKER_API_SECRET=${apiSecret}`)
      console.log(`BROKER_UID=${uid}`)
      console.log(`BROKER_KEY_ID=${keyId}`)
      console.log()
    }

    console.log('🎉 Broker registration complete!')

  } catch (error) {
    console.error('❌ Registration failed:', error)
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data)
      console.error('Status:', error.response?.status)
    }
  }
}

// Run registration
registerBroker()
