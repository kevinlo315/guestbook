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
}

export interface PostWithReplies extends Post {
  replies: Post[]
}

export async function getPosts(page: number = 1, limit: number = 20): Promise<{ posts: Post[], total: number, totalPages: number }> {
  const offset = (page - 1) * limit
  
  let countResult
  try {
    countResult = await pool.query('SELECT COUNT(*) FROM posts WHERE parent_id IS NULL')
  } catch (err: any) {
    console.error('Count query error:', err)
    throw new Error(`Count query failed: ${err.message}`)
  }
  const total = parseInt(countResult.rows[0].count)
  const totalPages = Math.ceil(total / limit)

  let result
  try {
    result = await pool.query(
      `SELECT id, author, content, created_at, updated_at, is_edited, parent_id, reply_count 
       FROM posts 
       WHERE parent_id IS NULL 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
  } catch (err: any) {
    console.error('Select query error:', err)
    console.error('Query was:', `SELECT id, author, content, created_at, updated_at, is_edited, parent_id, reply_count FROM posts WHERE parent_id IS NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)
    throw new Error(`Select query failed: ${err.message}`)
  }
  
  return { posts: result.rows, total, totalPages }
}

export async function getPostReplies(parentId: number): Promise<Post[]> {
  const result = await pool.query(
    `SELECT id, author, content, created_at, updated_at, is_edited, parent_id, reply_count 
     FROM posts 
     WHERE parent_id = $1 
     ORDER BY created_at ASC`,
    [parentId]
  )
  return result.rows
}

export async function getPostsWithReplies(page: number = 1, limit: number = 20): Promise<{ posts: PostWithReplies[], total: number, totalPages: number }> {
  let posts, total, totalPages
  try {
    const result = await getPosts(page, limit)
    posts = result.posts
    total = result.total
    totalPages = result.totalPages
  } catch (err: any) {
    console.error('getPostsWithReplies -> getPosts failed:', err)
    throw err
  }
  
  const postsWithReplies = await Promise.all(
    posts.map(async (post) => {
      try {
        const replies = await getPostReplies(post.id)
        return { ...post, replies }
      } catch (err: any) {
        console.error(`getPostReplies for post ${post.id} failed:`, err)
        return { ...post, replies: [] }
      }
    })
  )
  
  return { posts: postsWithReplies, total, totalPages }
}

export async function addPost(author: string, content: string, parentId?: number | null): Promise<Post> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    const result = await client.query(
      'INSERT INTO posts (author, content, parent_id) VALUES ($1, $2, $3) RETURNING id, author, content, created_at, updated_at, is_edited, parent_id, reply_count',
      [author, content, parentId || null]
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
  const result = await pool.query(
    `UPDATE posts 
     SET content = $1, updated_at = CURRENT_TIMESTAMP, is_edited = TRUE 
     WHERE id = $2 
     RETURNING id, author, content, created_at, updated_at, is_edited, parent_id, reply_count`,
    [content, id]
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

export default pool
