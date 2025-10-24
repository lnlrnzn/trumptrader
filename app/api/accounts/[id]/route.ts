import { NextRequest, NextResponse } from 'next/server'
import { createAccountService } from '@/lib/accounts/service'
import type { UpdateAccountInput } from '@/types/account'

/**
 * GET /api/accounts/[id]
 * Get a single account by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = createAccountService()
    const account = await service.getAccountById(params.id)

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found'
        },
        { status: 404 }
      )
    }

    // Optionally include stats
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    if (includeStats) {
      const stats = await service.getAccountStats(params.id)
      return NextResponse.json({
        success: true,
        data: { ...account, stats }
      })
    }

    return NextResponse.json({
      success: true,
      data: account
    })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch account'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/accounts/[id]
 * Update an account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateAccountInput = await request.json()

    // Validate username format if provided
    if (body.username && !/^[a-zA-Z0-9_]+$/.test(body.username)) {
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
    const account = await service.updateAccount(params.id, body)

    return NextResponse.json({
      success: true,
      data: account,
      message: `Account @${account.username} updated successfully`
    })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update account'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/accounts/[id]
 * Delete an account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = createAccountService()

    // Check if account exists first
    const account = await service.getAccountById(params.id)
    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found'
        },
        { status: 404 }
      )
    }

    await service.deleteAccount(params.id)

    return NextResponse.json({
      success: true,
      message: `Account @${account.username} deleted successfully`
    })
  } catch (error) {
    console.error('Error deleting account:', error)

    // Check for foreign key constraint violation
    if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete account with existing trades. Disable it instead.'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete account'
      },
      { status: 500 }
    )
  }
}
