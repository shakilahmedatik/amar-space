DROP INDEX "audit_logs_org_action_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "actor_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_user_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_role" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "old_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "new_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("organization_id","actor_user_id");--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "actor_id";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "details";