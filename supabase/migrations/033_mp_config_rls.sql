-- Drop the broad admin policy that allows reading access_token
DROP POLICY IF EXISTS "admin manage mp_config" ON mp_config;

-- Admin can only read safe columns via RPC or views
-- No direct client INSERT/UPDATE/DELETE policies = denied by RLS
-- All writes go through the mp-config Edge Function

-- Create a view that excludes access_token for client reads
CREATE OR REPLACE VIEW mp_config_safe AS
  SELECT id, consortium_id, public_key, enabled, created_at, updated_at
  FROM mp_config;

-- Allow admins to read only through the safe view
GRANT SELECT ON mp_config_safe TO authenticated;

-- The Edge Function uses service_role key which bypasses RLS
