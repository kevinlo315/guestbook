import { NextRequest, NextResponse } from 'next/server'
import { toggleReaction, getPostReactions } from '@/lib/db'

// POST /api/reactions -  toggles a reaction
// Body: { postId, emoji, userId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, emoji, userId } = body

    if (!postId || !emoji || !userId) {
      return NextResponse.json(
        { error: 'postId, emoji, and userId are required' },
        { status: 400 }
      )
    }

    const result = await toggleReaction(postId, emoji, userId)
    const reactions = await getPostReactions(postId)
    return NextResponse.json({ added: result.added, reactions })
  } catch (error: any) {
    console.error('POST /reactions error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    )
  }
}
