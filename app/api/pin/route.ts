import { NextRequest, NextResponse } from 'next/server'
import { togglePinPost } from '@/lib/db'

// POST /api/pin - 切換置頂
// Body: { id }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const post = await togglePinPost(id)
    return NextResponse.json(post)
  } catch (error: any) {
    console.error('POST /pin error:', error)
    return NextResponse.json({ error: 'Failed to toggle pin' }, { status: 500 })
  }
}
