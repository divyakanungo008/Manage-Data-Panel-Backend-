-- Manage Data Panel - Complete Supabase Database Setup
-- Run this file in Supabase SQL Editor before testing the Node backend.
-- This resets the assignment table, so existing records will be deleted.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS public.records CASCADE;
DROP FUNCTION IF EXISTS public.set_records_updated_at() CASCADE;

CREATE TABLE public.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone_number text,
  address text,
  organisation text,
  type text NOT NULL,
  link_status text NOT NULL DEFAULT 'Pending',
  link_url text,
  download_status text NOT NULL DEFAULT 'Pending',
  download_url text,
  date_added date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT records_name_not_blank
    CHECK (length(btrim(name)) > 0),
  CONSTRAINT records_type_valid
    CHECK (type IN ('Student', 'Teacher', 'Mentor', 'Job Seeker', 'Institute', 'Other')),
  CONSTRAINT records_link_status_valid
    CHECK (link_status IN ('Pending', 'Sent')),
  CONSTRAINT records_download_status_valid
    CHECK (download_status IN ('Pending', 'Downloaded', 'Completed')),
  CONSTRAINT records_link_url_valid
    CHECK (link_url IS NULL OR link_url = '' OR link_url ~* '^https?://.+'),
  CONSTRAINT records_download_url_valid
    CHECK (download_url IS NULL OR download_url = '' OR download_url ~* '^https?://.+'),
  CONSTRAINT records_email_valid
    CHECK (email IS NULL OR email = '' OR email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  CONSTRAINT records_phone_valid
    CHECK (phone_number IS NULL OR phone_number = '' OR phone_number ~ '^[+]?[0-9[:space:]\-()]{7,20}$')
);

CREATE INDEX idx_records_type ON public.records(type);
CREATE INDEX idx_records_link_status ON public.records(link_status);
CREATE INDEX idx_records_download_status ON public.records(download_status);
CREATE INDEX idx_records_date_added ON public.records(date_added DESC);
CREATE INDEX idx_records_created_at ON public.records(created_at DESC);
CREATE INDEX idx_records_name_trgm ON public.records USING gin (name gin_trgm_ops);
CREATE INDEX idx_records_email_trgm ON public.records USING gin (email gin_trgm_ops);
CREATE INDEX idx_records_phone_trgm ON public.records USING gin (phone_number gin_trgm_ops);
CREATE INDEX idx_records_link_url_trgm ON public.records USING gin (link_url gin_trgm_ops);
CREATE INDEX idx_records_download_url_trgm ON public.records USING gin (download_url gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.set_records_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER records_set_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_records_updated_at();

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Single-tenant assignment app: reviewers can use the panel without login.
-- The Node backend uses the service-role key server-side; these policies also keep
-- anon/authenticated access valid if the public Supabase REST API is tested.
CREATE POLICY records_select_policy
  ON public.records FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY records_insert_policy
  ON public.records FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY records_update_policy
  ON public.records FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY records_delete_policy
  ON public.records FOR DELETE
  TO anon, authenticated
  USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.records TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_records_updated_at() TO anon, authenticated, service_role;

COMMENT ON TABLE public.records IS 'Imported Excel/CSV records for the Manage Data admin panel.';
COMMENT ON COLUMN public.records.type IS 'Category tab value: Student, Teacher, Mentor, Job Seeker, Institute, or Other.';
COMMENT ON COLUMN public.records.link_status IS 'Link workflow status shown in Manage Data filters and badges.';
COMMENT ON COLUMN public.records.link_url IS 'Optional URL imported from CSV/Excel for the link sent to a record.';
COMMENT ON COLUMN public.records.download_status IS 'Download workflow status shown in Manage Data filters and badges.';
COMMENT ON COLUMN public.records.download_url IS 'Optional URL imported from CSV/Excel for downloadable record files.';

COMMIT;
