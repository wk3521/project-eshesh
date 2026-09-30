-- Communities are meant to be campuses only (one per partner university), not
-- general topic forums. Reassign the only real content (2 projects) into the
-- owner's actual campus community before dropping the non-campus communities;
-- their seed posts go with them via ON DELETE CASCADE.

UPDATE "public"."projects" SET "community_id" = (SELECT "id" FROM "public"."communities" WHERE "slug" = 'queens-college')
WHERE "community_id" = (SELECT "id" FROM "public"."communities" WHERE "slug" = 'project-showcase');

DELETE FROM "public"."communities" WHERE "slug" IN ('campus-life', 'project-showcase', 'internships-jobs', 'study-groups');
