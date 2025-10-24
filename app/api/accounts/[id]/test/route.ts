import { NextRequest, NextResponse } from 'next/server'
import { createAccountService } from '@/lib/accounts/service'

/**
 * POST /api/accounts/[id]/test
 * Test account's LLM analysis with a sample tweet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    if (!body.tweet_text || typeof body.tweet_text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'tweet_text is required'
        },
        { status: 400 }
      )
    }

    const service = createAccountService()
    const result = await service.testAccountAnalysis(params.id, body.tweet_text)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.decision
    })
  } catch (error) {
    console.error('Error testing account analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test account analysis'
      },
      { status: 500 }
    )
  }
}
