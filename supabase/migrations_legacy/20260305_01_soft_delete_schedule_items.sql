-- Soft Delete Implementation for Schedule Items
-- Date: 2026-03-05
-- Purpose:
--   1. Add archived_at column to schedule_items
--   2. Update status CHECK constraint to include 'archived'
--   3. Enable soft delete pattern instead of hard deletes

-- =============================================
-- ALTER TABLE: Add archived_at column
-- =============================================

ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- =============================================
-- UPDATE STATUS CONSTRAINT
-- =============================================

-- Drop existing constraint
ALTER TABLE public.schedule_items
DROP CONSTRAINT IF EXISTS schedule_items_status_check;

-- Add new constraint with 'archived' status
ALTER TABLE public.schedule_items
ADD CONSTRAINT schedule_items_status_check 
CHECK (status IN ('pending', 'completed', 'skipped', 'rescheduled', 'archived'));

-- =============================================
-- CREATE INDEX for soft delete queries
-- =============================================

-- Index for finding active items (not archived)
CREATE INDEX IF NOT EXISTS idx_schedule_items_archived 
ON public.schedule_items(config_id, archived_at) 
WHERE archived_at IS NULL;

-- =============================================
-- CREATE VIEW: Active schedule items only
-- =============================================

-- Update existing views to filter out archived items
-- Views should filter: WHERE archived_at IS NULL OR ... (depending on use case)

-- =============================================
-- DOCUMENTATION
-- =============================================

COMMENT ON COLUMN public.schedule_items.archived_at 
IS 'Timestamp when item was soft-deleted. NULL means item is active. Used instead of hard delete to preserve audit trail.';

COMMENT ON CONSTRAINT schedule_items_status_check ON public.schedule_items
IS 'Status values: pending, completed, skipped, rescheduled, archived (for soft-deleted items)';
