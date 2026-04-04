import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
})

export interface Post {
  id: number
  author: string
  content: string
  created_at: Date
  updated_at: Date
  is_edited: boolean
  parent_id: number | null
  reply_count: number
  is_pinned?: boolean
  hashtags?: string[]
  image_url?: string | null
  reactions?: Reaction[]
}

export interface Reaction {
  emoji: string
  count: number
  users: string[]
}

export interface PostWithReplies extends Post {
  replies: Post[]
}

// ---- Posts queries ----

export async function getPosts(page: number = 1, limit: number = 20, search?: string, date?: string): Promise<{ posts: Post[], total: number, totalPages: number }> {
  const offset = (page - 1) * limit

  let where = 'WHERE parent_id IS NULL'
  const params: any[] = []

  if (search) {
    params.push(search)
    where += ` AND (to_tsvector('simple', author || ' ' || content) @@ plainto_tsquery('simple', $${params.length}))`
  }

  if (date) {
    params.push(date)
    where += ` AND DATE(created_at) = $${params.length}`
  }

  const countResult = await pool.query(`SELECT COUNT(*) FROM posts ${where}`, params)
  const total = parseInt(countResult.rows[0].count)
  const totalPages = Math.ceil(total / limit)

  params.push(limit, offset)
  const result = await pool.query(
    `SELECT id, author, content, created_at, updated_at, is_edited, parent_id, reply_count, is_pinned, hashtags, image_url
     FROM posts ${where}
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { posts: result.rows, total, totalPages }
}

export async function getPostReplies(parentId: number): Promise<Post[]> {
  const result = await pool.query(
    `SELECT id, author, content, created_at, updated_at, is_edited, parent_id, reply_count, is_pinned, hashtags, image_url
     FROM posts WHERE parent_id = $1 ORDER BY created_at ASC`,
    [parentId]
  )
  return result.rows
}

export async function getPostsWithReplies(page: number = 1, limit: number = 20, search?: string, date?: string): Promise<{ posts: PostWithReplies[], total: number, totalPages: number }> {
  const { posts, total, totalPages } = await getPosts(page, limit, search, date)

  const postsWithReplies = await Promise.all(
    posts.map(async (post) => {
      const [replies, reactions] = await Promise.all([
        getPostReplies(post.id),
        getPostReactions(post.id)
      ])
      return { ...post, replies, reactions }
    })
  )

  return { posts: postsWithReplies, total, totalPages }
}

export async function addPost(author: string, content: string, parentId?: number | null, imageUrl?: string): Promise<Post> {
  // Extract hashtags from content
  const hashtagMatches = content.match(/#[\w\u4e00-\u9fa5]+/g) || []
  const hashtags = hashtagMatches.map((h: string) => h.slice(1).toLowerCase())

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(
      'INSERT INTO posts (author, content, parent_id, hashtags, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [author, content, parentId || null, hashtags, imageUrl || null]
    )

    if (parentId) {
      await client.query(
        'UPDATE posts SET reply_count = reply_count + 1 WHERE id = $1',
        [parentId]
      )
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updatePost(id: number, content: string): Promise<Post> {
  const hashtagMatches = content.match(/#[\w\u4e00-\u9fa5]+/g) || []
  const hashtags = hashtagMatches.map((h: string) => h.slice(1).toLowerCase())

  const result = await pool.query(
    `UPDATE posts SET content = $1, updated_at = CURRENT_TIMESTAMP, is_edited = TRUE, hashtags = $2 WHERE id = $3 RETURNING *`,
    [content, hashtags, id]
  )
  return result.rows[0]
}

export async function deletePost(id: number): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const postResult = await client.query('SELECT parent_id FROM posts WHERE id = $1', [id])
    const parentId = postResult.rows[0]?.parent_id

    await client.query('DELETE FROM posts WHERE id = $1', [id])

    if (parentId) {
      await client.query(
        'UPDATE posts SET reply_count = reply_count - 1 WHERE id = $1 AND reply_count > 0',
        [parentId]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function togglePinPost(id: number): Promise<Post> {
  const result = await pool.query(
    `UPDATE posts SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *`,
    [id]
  )
  return result.rows[0]
}

// ---- Reactions ----

export async function getPostReactions(postId: number): Promise<Reaction[]> {
  const result = await pool.query(
    `SELECT emoji, ARRAY_AGG(user_id) as users, COUNT(*) as count
     FROM reactions WHERE post_id = $1 GROUP BY emoji`,
    [postId]
  )
  return result.rows.map((r: any) => ({
    emoji: r.emoji,
    count: parseInt(r.count),
    users: r.users
  }))
}

export async function toggleReaction(postId: number, emoji: string, userId: string): Promise<{ added: boolean }> {
  const client = await pool.connect()
  try {
    const existing = await client.query(
      'SELECT id FROM reactions WHERE post_id = $1 AND emoji = $2 AND user_id = $3',
      [postId, emoji, userId]
    )

    if (existing.rows.length > 0) {
      await client.query(
        'DELETE FROM reactions WHERE post_id = $1 AND emoji = $2 AND user_id = $3',
        [postId, emoji, userId]
      )
      await client.query('COMMIT')
      return { added: false }
    } else {
      await client.query(
        'INSERT INTO reactions (post_id, emoji, user_id) VALUES ($1, $2, $3)',
        [postId, emoji, userId]
      )
      await client.query('COMMIT')
      return { added: true }
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export default pool
