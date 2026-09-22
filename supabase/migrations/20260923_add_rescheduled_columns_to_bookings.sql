-- ============================================================================
-- Migration: Add Rescheduled Columns to Bookings
-- Description: Supports player court session rescheduling with audit tracking
-- ============================================================================

DO $$ 
BEGIN
  -- Add rescheduled_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bookings' 
      AND column_name = 'rescheduled_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN rescheduled_at TIMESTAMPTZ;
  END IF;

  -- Add reschedule_count counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bookings' 
      AND column_name = 'reschedule_count'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN reschedule_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add original_start_time timestamp for audit history
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bookings' 
      AND column_name = 'original_start_time'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN original_start_time TIMESTAMPTZ;
  END IF;
END $$;

-- Create performance index for rescheduled bookings
CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled_at 
  ON public.bookings(rescheduled_at) 
  WHERE rescheduled_at IS NOT NULL;
