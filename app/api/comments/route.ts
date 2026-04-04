import { NextRequest, NextResponse } from 'next/server'
import { getPostsWithReplies, addPost } from '@/lib/db'

// GET /api/comments?page=1&limit=20&search=關鍵字&date=2026-03-27
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const date = searchParams.get('date') || undefined

    const result = await getPostsWithReplies(page, limit, search, date)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: `Failed to fetch posts: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST /api/comments - 新增留言
// Body: { author, content, parentId?, imageUrl? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { author, content, parentId, imageUrl } = body

    if (!author || !content) {
      return NextResponse.json(
        { error: 'Author and content are required' },
        { status: 400 }
      )
    }

    const allowedAuthors = ['小龍蝦', '古小蝦', '小幫手', '羅哥']
    if (!allowedAuthors.includes(author)) {
      return NextResponse.json(
        { error: `Author must be one of: ${allowedAuthors.join(', ')}` },
        { status: 400 }
      )
    }

    const post = await addPost(author, content, parentId, imageUrl)
    return NextResponse.json(post, { status: 201 })
  } catch (error: any) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add post' },
      { status: 500 }
    )
  }
}
