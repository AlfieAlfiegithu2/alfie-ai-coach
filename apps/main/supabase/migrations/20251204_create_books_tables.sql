-- Migration: Create books, book_chapters, and book_processing_jobs tables
-- Purpose: Support the Book Creation feature for paraphrasing and publishing educational content

-- Books table: stores book metadata
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    original_author TEXT, -- Store original author name for reference
    company TEXT,
    original_company TEXT, -- Store original company name for reference
    description TEXT,
    cover_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published', 'archived')),
    processing_model TEXT CHECK (processing_model IN ('gemini-3.0-pro', 'deepseek-v3.2')),
    total_chapters INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Book chapters table: stores chunked content (original and processed)
CREATE TABLE IF NOT EXISTS book_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    chapter_title TEXT,
    original_content TEXT NOT NULL,
    processed_content TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_model TEXT,
    error_message TEXT,
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(book_id, chapter_number)
);

-- Book processing jobs table: tracks overall processing progress
CREATE TABLE IF NOT EXISTS book_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    total_chunks INTEGER NOT NULL DEFAULT 0,
    processed_chunks INTEGER NOT NULL DEFAULT 0,
    current_chunk INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
    processing_model TEXT NOT NULL,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_created_by ON books(created_by);
CREATE INDEX IF NOT EXISTS idx_books_published_at ON books(published_at);
CREATE INDEX IF NOT EXISTS idx_book_chapters_book_id ON book_chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_status ON book_chapters(status);
CREATE INDEX IF NOT EXISTS idx_book_processing_jobs_book_id ON book_processing_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_book_processing_jobs_status ON book_processing_jobs(status);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users (admin check is client-side)
CREATE POLICY "Authenticated users can manage books" ON books
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view published books" ON books
    FOR SELECT
    TO anon
    USING (status = 'published');

CREATE POLICY "Authenticated users can manage book chapters" ON book_chapters
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view chapters of published books" ON book_chapters
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_chapters.book_id 
            AND books.status = 'published'
        )
    );

CREATE POLICY "Authenticated users can manage processing jobs" ON book_processing_jobs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON books TO anon;
GRANT SELECT ON book_chapters TO anon;
GRANT ALL ON books TO authenticated;
GRANT ALL ON book_chapters TO authenticated;
GRANT ALL ON book_processing_jobs TO authenticated;

