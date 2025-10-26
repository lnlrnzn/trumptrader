import { NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'
import { prepareSignedRequest } from '@/lib/asterdex/signer'

/**
 * GET /api/debug-signature
 * Debug endpoint to see exact signature details
 */
export async function GET() {
  try {
    console.log('🔍 Debugging signature generation...')

    // Prepare a signed request for balance
    const signedReq = prepareSignedRequest(
      '/fapi/v3/balance',
      {},
      {
        userAddress: process.env.ASTER_DEX_KEY!,
        privateKey: process.env.ASTER_SECRET_KEY!
      }
    )

    return NextResponse.json({
      success: true,
      debug: {
        url: signedReq.url,
        headers: signedReq.headers,
        body: {
          ...signedReq.body,
          signature: signedReq.body.signature.substring(0, 20) + '...' // Truncate for display
        },
        fullSignature: signedReq.body.signature
      }
    })

  } catch (error) {
    console.error('❌ Debug error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
