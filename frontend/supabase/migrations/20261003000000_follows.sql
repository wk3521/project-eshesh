-- Minimal follow/follower relationship, needed so Notifications has
-- something to notify about besides likes and applications.

CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "followed_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "followed_id"),
    CONSTRAINT "follows_not_self" CHECK ("follower_id" <> "followed_id"),
    CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read follows" ON "public"."follows";
CREATE POLICY "Public read follows" ON "public"."follows" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users follow others" ON "public"."follows";
CREATE POLICY "Users follow others" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));

DROP POLICY IF EXISTS "Users unfollow others" ON "public"."follows";
CREATE POLICY "Users unfollow others" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));
