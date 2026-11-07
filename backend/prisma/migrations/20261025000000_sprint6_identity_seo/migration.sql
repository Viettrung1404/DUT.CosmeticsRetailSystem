-- Abort for case-insensitive collisions; never silently merge/delete existing accounts.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING count(*)>1) THEN
   RAISE EXCEPTION 'Resolve case-insensitive duplicate user emails before Sprint 6 migration';
 END IF;
END $$;
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
-- Additive: existing identity uniqueness and all S4/S5 handwritten constraints are preserved.
CREATE INDEX "user_oauth_accounts_user_id_idx" ON "user_oauth_accounts"("user_id");
CREATE TABLE "oauth_pending_identities" (
 "id" UUID NOT NULL, "provider" VARCHAR(50) NOT NULL, "subject" VARCHAR(255) NOT NULL,
 "full_name" VARCHAR(100) NOT NULL, "email" VARCHAR(255), "target_user_id" UUID,
 "challenge_hash" VARCHAR(64) NOT NULL, "client_hash" VARCHAR(64) NOT NULL,
 "verification_hash" VARCHAR(64), "expires_at" TIMESTAMPTZ NOT NULL, "used_at" TIMESTAMPTZ,
 "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "oauth_pending_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "oauth_pending_identities_challenge_hash_key" ON "oauth_pending_identities"("challenge_hash");
CREATE INDEX "oauth_pending_identities_expires_at_idx" ON "oauth_pending_identities"("expires_at");
ALTER TABLE "blog_posts" ADD COLUMN "content_updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "blog_posts" SET "content_updated_at"="updated_at";
CREATE FUNCTION blog_content_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW) - ARRAY['views_count','updated_at','content_updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['views_count','updated_at','content_updated_at']) THEN
   NEW.content_updated_at := now();
 ELSE NEW.content_updated_at := OLD.content_updated_at;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER blog_content_timestamp BEFORE UPDATE ON "blog_posts" FOR EACH ROW EXECUTE FUNCTION blog_content_timestamp();

CREATE TABLE "public_cache_revision" ("id" INTEGER PRIMARY KEY CHECK (id=1), "generation" BIGINT NOT NULL DEFAULT 0);
INSERT INTO "public_cache_revision" (id,generation) VALUES (1,0);
CREATE FUNCTION sprint6_public_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE public_cache_revision SET generation=generation+1 WHERE id=1;
 RETURN NULL;
END $$;
CREATE TRIGGER sprint6_public_revision AFTER INSERT OR UPDATE OR DELETE ON "categories" FOR EACH STATEMENT EXECUTE FUNCTION sprint6_public_revision();
CREATE TRIGGER sprint6_public_revision AFTER INSERT OR UPDATE OR DELETE ON "pages" FOR EACH STATEMENT EXECUTE FUNCTION sprint6_public_revision();
CREATE TRIGGER sprint6_public_revision AFTER INSERT OR UPDATE OR DELETE ON "faqs" FOR EACH STATEMENT EXECUTE FUNCTION sprint6_public_revision();

-- EXPLAIN on 10k published rows showed a seq scan + top-N sort for mixed DESC/ASC order.
CREATE INDEX blog_posts_public_feed_idx ON blog_posts(status, published_at DESC, id ASC);
