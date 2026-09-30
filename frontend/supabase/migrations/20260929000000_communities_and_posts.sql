-- Communities (Reddit-style r/) and posts (Twitter-style short text) for the
-- new Explore feed. A post always belongs to a community; posting requires
-- membership in that community. Likes are their own table (not a denormalized
-- counter) so counts stay correct without triggers.

CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "communities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "communities_slug_key" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "public"."community_members" (
    "community_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "profile_id"),
    CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE,
    CONSTRAINT "community_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "posts_content_length" CHECK ((char_length("content") BETWEEN 1 AND 500)),
    CONSTRAINT "posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE,
    CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "profile_id"),
    CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE,
    CONSTRAINT "post_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."community_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read communities" ON "public"."communities";
CREATE POLICY "Public read communities" ON "public"."communities" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read community_members" ON "public"."community_members";
CREATE POLICY "Public read community_members" ON "public"."community_members" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users join communities" ON "public"."community_members";
CREATE POLICY "Users join communities" ON "public"."community_members" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));

DROP POLICY IF EXISTS "Users leave communities" ON "public"."community_members";
CREATE POLICY "Users leave communities" ON "public"."community_members" FOR DELETE USING (("auth"."uid"() = "profile_id"));

DROP POLICY IF EXISTS "Public read posts" ON "public"."posts";
CREATE POLICY "Public read posts" ON "public"."posts" FOR SELECT USING (true);

-- Reddit-style rule: you must have joined a community to post in it.
DROP POLICY IF EXISTS "Members create posts" ON "public"."posts";
CREATE POLICY "Members create posts" ON "public"."posts" FOR INSERT WITH CHECK (
    ("auth"."uid"() = "author_id")
    AND EXISTS (
        SELECT 1 FROM "public"."community_members" "cm"
        WHERE "cm"."community_id" = "posts"."community_id"
        AND "cm"."profile_id" = "auth"."uid"()
    )
);

DROP POLICY IF EXISTS "Public read post_likes" ON "public"."post_likes";
CREATE POLICY "Public read post_likes" ON "public"."post_likes" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users like posts" ON "public"."post_likes";
CREATE POLICY "Users like posts" ON "public"."post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));

DROP POLICY IF EXISTS "Users unlike posts" ON "public"."post_likes";
CREATE POLICY "Users unlike posts" ON "public"."post_likes" FOR DELETE USING (("auth"."uid"() = "profile_id"));

-- Seed a handful of communities: general topic communities plus one per
-- school currently represented in profiles. "RIT" and "Rochester Institute
-- of Technology" are the same school entered two different ways (profiles.school
-- is free text, not a picklist like projects.discipline) — they map to one
-- community here. A real school-picker/normalization pass is future work.
INSERT INTO "public"."communities" ("slug", "name", "description") VALUES
    ('campus-life', 'Campus Life', 'Day-to-day chatter, events, and things happening around campus.'),
    ('project-showcase', 'Project Showcase', 'Share what you''re building and get feedback.'),
    ('internships-jobs', 'Internships & Jobs', 'Postings, referrals, and interview help.'),
    ('study-groups', 'Study Groups', 'Find people to grind problem sets and prep for exams with.'),
    ('rit', 'RIT', 'Community for Rochester Institute of Technology students.'),
    ('queens-college', 'Queens College', 'Community for Queens College students.')
ON CONFLICT ("slug") DO NOTHING;

-- Seed membership + a few example posts so the feed isn't empty on first
-- load. Uses the real profile ids already in this project's dev database.
INSERT INTO "public"."community_members" ("community_id", "profile_id")
SELECT "c"."id", "p"."profile_id" FROM (VALUES
    ('rit', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid),
    ('rit', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid),
    ('queens-college', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid),
    ('campus-life', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid),
    ('campus-life', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid),
    ('project-showcase', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid),
    ('project-showcase', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid),
    ('internships-jobs', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid),
    ('study-groups', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid),
    ('study-groups', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid)
) AS "p"("slug", "profile_id")
JOIN "public"."communities" "c" ON "c"."slug" = "p"."slug"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."posts" ("community_id", "author_id", "content", "created_at")
SELECT "c"."id", "x"."author_id", "x"."content", "now"() - "x"."age"
FROM (VALUES
    ('campus-life', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid, 'Anyone know if the library is doing extended hours this week?', interval '2 hours'),
    ('project-showcase', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid, 'Shipped v1 of a study-group matcher tonight. Looking for a few people to break it before I show it off. 👀', interval '5 hours'),
    ('internships-jobs', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid, 'My team is hiring a part-time frontend intern for spring. Reply or DM if you want the referral.', interval '1 day'),
    ('study-groups', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid, 'Forming a group for the linear algebra final. We meet Tuesdays in the library, 2 spots open.', interval '1 day 4 hours'),
    ('project-showcase', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid, 'Finally got RLS policies working on my side project without locking myself out. Small wins.', interval '3 days'),
    ('campus-life', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid, 'Passed my first technical interview! Onto the next round.', interval '4 days')
) AS "x"("slug", "author_id", "content", "age")
JOIN "public"."communities" "c" ON "c"."slug" = "x"."slug";

INSERT INTO "public"."post_likes" ("post_id", "profile_id")
SELECT "p"."id", "l"."profile_id" FROM "public"."posts" "p"
JOIN (VALUES
    ('Shipped v1 of a study-group matcher tonight. Looking for a few people to break it before I show it off. 👀', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid),
    ('Shipped v1 of a study-group matcher tonight. Looking for a few people to break it before I show it off. 👀', '775f443c-46e2-449d-9f78-754acc1d2fbd'::uuid),
    ('Passed my first technical interview! Onto the next round.', '4193e68d-f474-4c4d-9e53-114a7fb6f43f'::uuid),
    ('Passed my first technical interview! Onto the next round.', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid),
    ('Forming a group for the linear algebra final. We meet Tuesdays in the library, 2 spots open.', '0722a53a-e8cd-40e0-8622-771ddc6de3be'::uuid)
) AS "l"("content", "profile_id") ON "l"."content" = "p"."content"
ON CONFLICT DO NOTHING;
