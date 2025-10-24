import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/tweets
 * Returns recent tweets with LLM decisions
 * Query params: limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch tweets with their LLM decisions and source account info
    const { data: tweets, error } = await supabase
      .from('tweets')
      .select(`
        *,
        llm_decisions(
          id,
          signal,
          confidence,
          adjusted_confidence,
          reasoning,
          expected_magnitude,
          executed,
          created_at
        ),
        source_account:twitter_accounts(
          id,
          username,
          display_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('tweets')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: tweets || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tweets'
      },
      { status: 500 }
    )
  }
}
