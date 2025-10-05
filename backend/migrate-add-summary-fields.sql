-- Migration script to add missing columns to summaries table
-- Run this script to update the existing database schema

-- Add missing columns to summaries table
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add trigger for updated_at column
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have updated_at = created_at
UPDATE summaries 
SET updated_at = created_at 
WHERE updated_at IS NULL;
