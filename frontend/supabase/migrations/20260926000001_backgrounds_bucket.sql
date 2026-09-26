-- Profile banner images. background_url already exists on the live database
-- but was never tracked in a migration.
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "background_url" "text";

-- Public bucket for banners. Files live under "<user id>/...",
-- and users can only write inside their own folder.
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'backgrounds',
    'backgrounds',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT ("id") DO NOTHING;

-- Public buckets serve files by URL without a SELECT policy; this one lets
-- users list/remove their own files (Storage's delete needs SELECT too).
DROP POLICY IF EXISTS "Users read own backgrounds" ON "storage"."objects";
CREATE POLICY "Users read own backgrounds" ON "storage"."objects" FOR SELECT TO "authenticated"
    USING (("bucket_id" = 'backgrounds') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users upload own backgrounds" ON "storage"."objects";
CREATE POLICY "Users upload own backgrounds" ON "storage"."objects" FOR INSERT TO "authenticated"
    WITH CHECK (("bucket_id" = 'backgrounds') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users delete own backgrounds" ON "storage"."objects";
CREATE POLICY "Users delete own backgrounds" ON "storage"."objects" FOR DELETE TO "authenticated"
    USING (("bucket_id" = 'backgrounds') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));
