-- Public bucket for profile pictures. Files live under "<user id>/...",
-- and users can only write inside their own folder.

INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT ("id") DO NOTHING;

-- Public buckets serve files by URL without a SELECT policy; this one lets
-- users list/remove their own files (Storage's delete needs SELECT too).
DROP POLICY IF EXISTS "Users read own avatars" ON "storage"."objects";
CREATE POLICY "Users read own avatars" ON "storage"."objects" FOR SELECT TO "authenticated"
    USING (("bucket_id" = 'avatars') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users upload own avatars" ON "storage"."objects";
CREATE POLICY "Users upload own avatars" ON "storage"."objects" FOR INSERT TO "authenticated"
    WITH CHECK (("bucket_id" = 'avatars') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users delete own avatars" ON "storage"."objects";
CREATE POLICY "Users delete own avatars" ON "storage"."objects" FOR DELETE TO "authenticated"
    USING (("bucket_id" = 'avatars') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));
