-- Enable Realtime for shared_snippets table
BEGIN;
  -- Add the table to the supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE shared_snippets;
COMMIT;
