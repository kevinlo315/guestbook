import { NextRequest, NextResponse } from 'next/server'
import { getPostsWithReplies, addPost, updatePost, deletePost } from '@/lib/db'

// GET /api/comments?page=1&limit=20 - 取得所有留言（分頁）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    console.log(`GET /api/comments page=${page} limit=${limit}`)
    
    const result = await getPostsWithReplies(page, limit)
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
// Body: { author, content, parentId? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { author, content, parentId } = body

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

    const post = await addPost(author, content, parentId)
    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add post' },
      { status: 500 }
    )
  }
}
