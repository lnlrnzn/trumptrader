import { NextRequest, NextResponse } from 'next/server'
import { createAccountService } from '@/lib/accounts/service'
import type { CreateAccountInput } from '@/types/account'

/**
 * GET /api/accounts
 * Get all Twitter accounts with optional stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    const service = createAccountService()

    const accounts = includeStats
      ? await service.getAllAccountsWithStats()
      : await service.getAllAccounts()

    return NextResponse.json({
      success: true,
      data: accounts
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/accounts
 * Create a new Twitter account
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateAccountInput = await request.json()

    // Validate required fields
    if (!body.username || !body.display_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username and display_name are required'
        },
        { status: 400 }
      )
    }

    // Validate username format (no @ symbol, alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username format (use alphanumeric and underscore only, no @ symbol)'
        },
        { status: 400 }
      )
    }

    // Validate confidence_multiplier
    if (body.confidence_multiplier !== undefined &&
        (body.confidence_multiplier < 0 || body.confidence_multiplier > 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confidence multiplier must be between 0 and 1'
        },
        { status: 400 }
      )
    }

    const service = createAccountService()
    const account = await service.createAccount(body)

    return NextResponse.json(
      {
        success: true,
        data: account,
        message: `Account @${account.username} created successfully`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating account:', error)

    // Check for duplicate username
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create account'
      },
      { status: 500 }
    )
  }
}
