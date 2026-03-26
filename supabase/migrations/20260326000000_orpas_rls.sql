-- Enable RLS on orpas table  
ALTER TABLE orpas ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read ORPAs
CREATE POLICY "orpas_select_authenticated" ON orpas
  FOR SELECT TO authenticated USING (true);

-- Only service_role (admin API) can insert/update/delete
-- No policy for INSERT/UPDATE/DELETE means only service_role bypasses RLS
