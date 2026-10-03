-- Messaging: applying to a project with a pitch creates an implicit message
-- request on that application (no separate requests table — the pitch IS
-- the request). The project owner approves it from their inbox or the
-- project's Applicants section, which opens a 1:1 conversation. Declining
-- just leaves the application as a plain (message-less) application.

ALTER TABLE "public"."applications"
    ADD COLUMN IF NOT EXISTS "message_request_status" "text",
    ADD CONSTRAINT "applications_message_request_status_check" CHECK ("message_request_status" IS NULL OR "message_request_status" IN ('pending', 'accepted', 'declined'));

CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a_id" "uuid" NOT NULL,
    "user_b_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    -- Canonical ordering (enforced by the app, not the DB) so the same pair
    -- of users can't end up with two conversations.
    CONSTRAINT "conversations_ordered" CHECK ("user_a_id" < "user_b_id"),
    CONSTRAINT "conversations_pair_unique" UNIQUE ("user_a_id", "user_b_id"),
    CONSTRAINT "conversations_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "conversations_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_content_length" CHECK (char_length("content") BETWEEN 1 AND 2000),
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read own conversations" ON "public"."conversations";
CREATE POLICY "Participants read own conversations" ON "public"."conversations" FOR SELECT
    USING (("auth"."uid"() = "user_a_id") OR ("auth"."uid"() = "user_b_id"));

DROP POLICY IF EXISTS "Participants create own conversations" ON "public"."conversations";
CREATE POLICY "Participants create own conversations" ON "public"."conversations" FOR INSERT
    WITH CHECK (("auth"."uid"() = "user_a_id") OR ("auth"."uid"() = "user_b_id"));

DROP POLICY IF EXISTS "Participants read own messages" ON "public"."messages";
CREATE POLICY "Participants read own messages" ON "public"."messages" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "public"."conversations" "c"
        WHERE "c"."id" = "messages"."conversation_id"
        AND ("auth"."uid"() = "c"."user_a_id" OR "auth"."uid"() = "c"."user_b_id")
    ));

DROP POLICY IF EXISTS "Participants send own messages" ON "public"."messages";
CREATE POLICY "Participants send own messages" ON "public"."messages" FOR INSERT
    WITH CHECK (
        ("auth"."uid"() = "sender_id")
        AND EXISTS (
            SELECT 1 FROM "public"."conversations" "c"
            WHERE "c"."id" = "messages"."conversation_id"
            AND ("auth"."uid"() = "c"."user_a_id" OR "auth"."uid"() = "c"."user_b_id")
        )
    );
