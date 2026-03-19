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
}

export async function getPosts(): Promise<Post[]> {
  const result = await pool.query(
    'SELECT id, author, content, created_at FROM posts ORDER BY created_at DESC LIMIT 100'
  )
  return result.rows
}

export async function addPost(author: string, content: string): Promise<Post> {
  const result = await pool.query(
    'INSERT INTO posts (author, content) VALUES ($1, $2) RETURNING id, author, content, created_at',
    [author, content]
  )
  return result.rows[0]
}

export default pool
