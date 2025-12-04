-- Migration: Create templates table for admin-uploaded images
-- Purpose: Store template images (charts, diagrams, etc.) for student practice

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('writing-task1', 'writing-task2', 'speaking', 'reading', 'listening', 'general')),
    image_url TEXT NOT NULL, -- Cloudflare R2 URL
    thumbnail_url TEXT, -- Optional smaller version
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_published ON templates(is_published);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN(tags);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users (admin check is client-side)
CREATE POLICY "Authenticated users can manage templates" ON templates
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view published templates" ON templates
    FOR SELECT
    TO anon
    USING (is_published = true);

-- Grant permissions
GRANT SELECT ON templates TO anon;
GRANT ALL ON templates TO authenticated;

