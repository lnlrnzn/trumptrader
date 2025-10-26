import { NextResponse } from 'next/server'
import { createAsterClient } from '@/lib/asterdex/client'

/**
 * GET /api/test-direct
 * Make a direct request to AsterDEX and return the full error response
 */
export async function GET() {
  try {
    console.log('🧪 Testing direct AsterDEX request...')

    const client = createAsterClient()

    try {
      const balance = await client.getAccountBalance()

      return NextResponse.json({
        success: true,
        balance
      })

    } catch (error: any) {
      // Return the full error details
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Test failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
