-- The resumes bucket and profiles.resume_path were created in the dashboard;
-- this records them and adds the policies uploads need. Safe to re-run.
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "resume_path" "text";

INSERT INTO "storage"."buckets" ("id", "name", "public", "allowed_mime_types")
VALUES (
    'resumes',
    'resumes',
    true,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT ("id") DO NOTHING;

-- Files live under "<user id>/...", and users can only write inside their own folder.
-- Public buckets serve files by URL without a SELECT policy; this one lets
-- users list/remove their own files (Storage's delete needs SELECT too).
DROP POLICY IF EXISTS "Users read own resumes" ON "storage"."objects";
CREATE POLICY "Users read own resumes" ON "storage"."objects" FOR SELECT TO "authenticated"
    USING (("bucket_id" = 'resumes') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users upload own resumes" ON "storage"."objects";
CREATE POLICY "Users upload own resumes" ON "storage"."objects" FOR INSERT TO "authenticated"
    WITH CHECK (("bucket_id" = 'resumes') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));

DROP POLICY IF EXISTS "Users delete own resumes" ON "storage"."objects";
CREATE POLICY "Users delete own resumes" ON "storage"."objects" FOR DELETE TO "authenticated"
    USING (("bucket_id" = 'resumes') AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text"));