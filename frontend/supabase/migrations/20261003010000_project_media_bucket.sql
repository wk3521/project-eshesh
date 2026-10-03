-- Public bucket for project media, so creating a project uploads real image
-- files instead of pasting external image links. Files live under
-- "<user id>/...", same convention as avatars/backgrounds/resumes.

INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'project-media',
    'project-media',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT ("id") DO NOTHING;

DROP POLICY IF EXISTS "Users read own project media" ON "storage"."objects";
CREATE POLICY "Users read own project media" ON "storage"."objects" FOR SELECT TO "authenticated"
    USING (("bucket_id" = 'project-media') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users upload own project media" ON "storage"."objects";
CREATE POLICY "Users upload own project media" ON "storage"."objects" FOR INSERT TO "authenticated"
    WITH CHECK (("bucket_id" = 'project-media') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users delete own project media" ON "storage"."objects";
CREATE POLICY "Users delete own project media" ON "storage"."objects" FOR DELETE TO "authenticated"
    USING (("bucket_id" = 'project-media') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));
