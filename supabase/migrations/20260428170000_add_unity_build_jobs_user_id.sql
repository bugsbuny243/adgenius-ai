ALTER TABLE public.unity_build_jobs
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
