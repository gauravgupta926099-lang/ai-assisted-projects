ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_gigs_status_expires ON public.gigs(status, expires_at);