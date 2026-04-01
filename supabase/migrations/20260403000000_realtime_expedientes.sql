-- Enable Supabase Realtime for expedientes table
-- This allows clients to receive real-time notifications when expedientes change
ALTER PUBLICATION supabase_realtime ADD TABLE expedientes;
