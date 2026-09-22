-- Baseline for schema that was built directly in the Supabase dashboard and
-- never captured in a migration file: the profiles table itself, and the
-- projects / skills / project_skills / profile_skills / applications tables
-- with their constraints and RLS policies. Captured via `supabase db dump`
-- against the live database on 2026-09-21. This does not create or change
-- anything that isn't already live — it exists so local/future environments
-- can reproduce the current production schema.

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "major" "text",
    "grad_year" integer,
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "school" "text",
    CONSTRAINT "profiles_grad_year_check" CHECK ((("grad_year" >= 2026) AND ("grad_year" <= 2030))),
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "is_approved" boolean DEFAULT true,
    "submitted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "skills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "skills_name_key" UNIQUE ("name"),
    CONSTRAINT "skills_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id")
);

CREATE SEQUENCE IF NOT EXISTS "public"."skills_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."skills_id_seq" OWNED BY "public"."skills"."id";

ALTER TABLE ONLY "public"."skills" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."skills_id_seq"'::"regclass");

CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "discipline" "text",
    "status" "text" DEFAULT 'active'::"text",
    "media" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projects_discipline_check" CHECK (("discipline" = ANY (ARRAY[
        'Computer Science'::"text", 'Computer Programming'::"text", 'Electrical Engineering'::"text",
        'Mechanical Engineering'::"text", 'Finance'::"text", 'Accounting'::"text", 'Design'::"text", 'Marketing'::"text"
    ]))),
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."project_skills" (
    "project_id" "uuid" NOT NULL,
    "skill_id" integer NOT NULL,
    CONSTRAINT "project_skills_pkey" PRIMARY KEY ("project_id", "skill_id"),
    CONSTRAINT "project_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE,
    CONSTRAINT "project_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."profile_skills" (
    "profile_id" "uuid" NOT NULL,
    "skill_id" integer NOT NULL,
    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profile_id", "skill_id"),
    CONSTRAINT "profile_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "profile_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "applicant_id" "uuid" NOT NULL,
    "pitch" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applications_project_id_applicant_id_key" UNIQUE ("project_id", "applicant_id"),
    CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "applications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profile_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;

-- Extra profiles policies layered on top of the ones in
-- 20260916000002_profiles_rls.sql (that migration's owner-only SELECT policy
-- is still present but is superseded in practice by "Public read profiles").
DROP POLICY IF EXISTS "Public read profiles" ON "public"."profiles";
CREATE POLICY "Public read profiles" ON "public"."profiles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON "public"."profiles";
CREATE POLICY "Users manage own profile" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Public read skills" ON "public"."skills";
CREATE POLICY "Public read skills" ON "public"."skills" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read projects" ON "public"."projects";
CREATE POLICY "Public read projects" ON "public"."projects" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own projects" ON "public"."projects";
CREATE POLICY "Users manage own projects" ON "public"."projects" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));

DROP POLICY IF EXISTS "Public read project_skills" ON "public"."project_skills";
CREATE POLICY "Public read project_skills" ON "public"."project_skills" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage own project_skills" ON "public"."project_skills";
CREATE POLICY "Owners manage own project_skills" ON "public"."project_skills" USING (("auth"."uid"() = ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "project_skills"."project_id"))));

DROP POLICY IF EXISTS "Public read profile_skills" ON "public"."profile_skills";
CREATE POLICY "Public read profile_skills" ON "public"."profile_skills" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own profile_skills" ON "public"."profile_skills";
CREATE POLICY "Users manage own profile_skills" ON "public"."profile_skills" USING (("auth"."uid"() = "profile_id")) WITH CHECK (("auth"."uid"() = "profile_id"));

DROP POLICY IF EXISTS "Applicant creates own application" ON "public"."applications";
CREATE POLICY "Applicant creates own application" ON "public"."applications" FOR INSERT WITH CHECK (("auth"."uid"() = "applicant_id"));

DROP POLICY IF EXISTS "Applicant views own application" ON "public"."applications";
CREATE POLICY "Applicant views own application" ON "public"."applications" FOR SELECT USING (("auth"."uid"() = "applicant_id"));

DROP POLICY IF EXISTS "Owner views applications to own project" ON "public"."applications";
CREATE POLICY "Owner views applications to own project" ON "public"."applications" FOR SELECT USING (("auth"."uid"() = ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "applications"."project_id"))));

DROP POLICY IF EXISTS "Owner updates applications to own project" ON "public"."applications";
CREATE POLICY "Owner updates applications to own project" ON "public"."applications" FOR UPDATE USING (("auth"."uid"() = ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "applications"."project_id"))));
