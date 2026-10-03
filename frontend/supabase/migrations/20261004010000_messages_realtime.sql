-- Turns on Postgres Changes for the messages table, so a conversation
-- thread can subscribe to new rows instead of needing a page refresh.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "pg_publication_tables"
        WHERE "pubname" = 'supabase_realtime' AND "schemaname" = 'public' AND "tablename" = 'messages'
    ) THEN
        ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."messages";
    END IF;
END $$;
