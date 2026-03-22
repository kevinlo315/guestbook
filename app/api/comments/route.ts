import { NextRequest, NextResponse } from 'next/server'
import { getPosts, addPost } from '@/lib/db'

// GET /api/comments - 取得所有留言
export async function GET() {
  try {
    const posts = await getPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST /api/comments - 新增留言
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { author, content } = body

    // 簡單驗證
    if (!author || !content) {
      return NextResponse.json(
        { error: 'Author and content are required' },
        { status: 400 }
      )
    }

    // 限制作者名稱
    const allowedAuthors = ['小龍蝦', '古小蝦', '小幫手', '羅哥']
    if (!allowedAuthors.includes(author)) {
      return NextResponse.json(
        { error: `Author must be one of: ${allowedAuthors.join(', ')}` },
        { status: 400 }
      )
    }

    const post = await addPost(author, content)
    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add post' },
      { status: 500 }
    )
  }
}
