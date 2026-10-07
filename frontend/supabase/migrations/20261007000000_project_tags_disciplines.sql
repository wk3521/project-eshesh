-- Projects pick any number of tags and disciplines through join tables,
-- replacing the single projects.discipline picklist column. tags and
-- disciplines are seeded by backend/python/project_types_import.py and
-- backend/python/disciplines_import.py.

ALTER TABLE "public"."projects" DROP CONSTRAINT IF EXISTS "projects_discipline_check";
ALTER TABLE "public"."projects" DROP COLUMN IF EXISTS "discipline";

-- The join tables were first created keyed on project_id alone, which allows
-- only one tag/discipline per project; key them on the pair instead.
DO $$
DECLARE
    "pkey" "text";
    "join_table" "text";
BEGIN
    FOREACH "join_table" IN ARRAY ARRAY['project_tag', 'project_discipline'] LOOP
        SELECT "conname" INTO "pkey" FROM "pg_constraint"
        WHERE "conrelid" = ('"public".' || quote_ident("join_table"))::"regclass" AND "contype" = 'p';
        IF "pkey" IS NOT NULL THEN
            EXECUTE format('ALTER TABLE "public".%I DROP CONSTRAINT %I', "join_table", "pkey");
        END IF;
    END LOOP;
END $$;

ALTER TABLE "public"."project_tag"
    ALTER COLUMN "tag_id" SET NOT NULL,
    ADD CONSTRAINT "project_tag_pkey" PRIMARY KEY ("project_id", "tag_id");

ALTER TABLE "public"."project_discipline"
    ALTER COLUMN "discipline_id" SET NOT NULL,
    ADD CONSTRAINT "project_discipline_pkey" PRIMARY KEY ("project_id", "discipline_id");

ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."disciplines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_discipline" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tags" ON "public"."tags";
CREATE POLICY "Public read tags" ON "public"."tags" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read disciplines" ON "public"."disciplines";
CREATE POLICY "Public read disciplines" ON "public"."disciplines" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read project_tag" ON "public"."project_tag";
CREATE POLICY "Public read project_tag" ON "public"."project_tag" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage own project_tag" ON "public"."project_tag";
CREATE POLICY "Owners manage own project_tag" ON "public"."project_tag" USING (("auth"."uid"() = ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "project_tag"."project_id"))));

DROP POLICY IF EXISTS "Public read project_discipline" ON "public"."project_discipline";
CREATE POLICY "Public read project_discipline" ON "public"."project_discipline" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage own project_discipline" ON "public"."project_discipline";
CREATE POLICY "Owners manage own project_discipline" ON "public"."project_discipline" USING (("auth"."uid"() = ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "project_discipline"."project_id"))));
