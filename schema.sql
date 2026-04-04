-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_edited BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    reply_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    hashtags TEXT[] DEFAULT '{}',
    image_url TEXT
);

-- Reactions table (new)
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, emoji, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin(to_tsvector('simple', author || ' ' || content));
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
