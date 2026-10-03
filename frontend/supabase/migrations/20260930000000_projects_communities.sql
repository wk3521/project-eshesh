-- Project proposals are the main content on Explore: students post projects
-- they're working on to advertise for collaborators on their campus. Ties
-- projects to a community (campus) the same way posts already are, and
-- keeps the existing applications table as the "apply to collaborate" flow.

ALTER TABLE "public"."projects"
    ADD COLUMN IF NOT EXISTS "community_id" "uuid" REFERENCES "public"."communities"("id") ON DELETE CASCADE;

-- Backfill the two existing test projects into an existing community so
-- they don't disappear from Explore.
UPDATE "public"."projects" SET "community_id" = (SELECT "id" FROM "public"."communities" WHERE "slug" = 'project-showcase')
WHERE "community_id" IS NULL;

-- Split the old catch-all "Users manage own projects" policy: owners still
-- manage their own rows, but creating a project in a community now requires
-- membership in it (same rule as posts). community_id IS NULL is allowed so
-- this doesn't retroactively break anything that isn't community-scoped.
DROP POLICY IF EXISTS "Users manage own projects" ON "public"."projects";

DROP POLICY IF EXISTS "Owner updates own projects" ON "public"."projects";
CREATE POLICY "Owner updates own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));

DROP POLICY IF EXISTS "Owner deletes own projects" ON "public"."projects";
CREATE POLICY "Owner deletes own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "owner_id"));

DROP POLICY IF EXISTS "Members create projects" ON "public"."projects";
CREATE POLICY "Members create projects" ON "public"."projects" FOR INSERT WITH CHECK (
    ("auth"."uid"() = "owner_id")
    AND (
        "community_id" IS NULL
        OR EXISTS (
            SELECT 1 FROM "public"."community_members" "cm"
            WHERE "cm"."community_id" = "projects"."community_id"
            AND "cm"."profile_id" = "auth"."uid"()
        )
    )
);
