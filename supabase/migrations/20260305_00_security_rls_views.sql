-- RLS Security Hardening for Views and FK Constraints
-- Date: 2026-03-05
-- Purpose: 
--   1. Add RLS policies for upcoming_schedule and category_stats views
--   2. Ensure data isolation between users
--   3. Add FK constraint with ON DELETE RESTRICT

-- =============================================
-- RLS POLICIES FOR VIEWS
-- =============================================

-- Policy for upcoming_schedule view - users can only see their own schedules
DROP POLICY IF EXISTS "upcoming_schedule_own_data" ON public.upcoming_schedule;
CREATE POLICY "upcoming_schedule_own_data" ON public.upcoming_schedule
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy for category_stats view - users can only see their own statistics
DROP POLICY IF EXISTS "category_stats_own_data" ON public.category_stats;
CREATE POLICY "category_stats_own_data" ON public.category_stats
  FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- FK CONSTRAINT WITH ON DELETE RESTRICT
-- =============================================

-- Check if constraint exists and drop it if necessary
-- Then add the proper constraint with ON DELETE RESTRICT

-- Drop existing constraint if it has CASCADE
ALTER TABLE public.schedule_items
DROP CONSTRAINT IF EXISTS schedule_items_category_id_fkey;

-- Add new constraint with ON DELETE RESTRICT
ALTER TABLE public.schedule_items
ADD CONSTRAINT schedule_items_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- =============================================
-- COMMENT FOR DOCUMENTATION
-- =============================================

COMMENT ON POLICY "upcoming_schedule_own_data" ON public.upcoming_schedule 
IS 'Users can only view their own upcoming schedules. RLS enforced at view level.';

COMMENT ON POLICY "category_stats_own_data" ON public.category_stats 
IS 'Users can only view statistics for their own categories. RLS enforced at view level.';

COMMENT ON CONSTRAINT schedule_items_category_id_fkey ON public.schedule_items
IS 'Prevents deletion of categories that have schedule items. Must reschedule or mark items as orphaned first.';
