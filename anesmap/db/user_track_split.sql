-- Separate track control for Cards and Simulados per user
-- Safe to run multiple times.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_track_cards text
CHECK (assigned_track_cards IN ('ME1', 'ME2', 'ME3', 'ALL'))
DEFAULT 'ALL';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_track_simulados text
CHECK (assigned_track_simulados IN ('ME1', 'ME2', 'ME3', 'ALL'))
DEFAULT 'ALL';

-- Backfill from previous single-track column when available
UPDATE public.profiles
SET assigned_track_cards = COALESCE(assigned_track_cards, assigned_track, 'ALL')
WHERE assigned_track_cards IS NULL;

UPDATE public.profiles
SET assigned_track_simulados = COALESCE(assigned_track_simulados, assigned_track, 'ALL')
WHERE assigned_track_simulados IS NULL;

