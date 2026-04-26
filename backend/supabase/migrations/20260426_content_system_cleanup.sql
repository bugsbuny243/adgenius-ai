DROP TABLE IF EXISTS public.content_items CASCADE;
DROP TABLE IF EXISTS public.publish_jobs CASCADE;
DROP TABLE IF EXISTS public.external_publications CASCADE;
DROP TABLE IF EXISTS public.saved_outputs CASCADE;
DROP TABLE IF EXISTS public.project_items CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.agent_runs CASCADE;
DROP TABLE IF EXISTS public.agent_types CASCADE;
DROP TABLE IF EXISTS public.oauth_connections CASCADE;
DROP TABLE IF EXISTS public.workspace_users CASCADE;
DROP TABLE IF EXISTS public.usage_metering CASCADE;

TRUNCATE public.usage_counters;
