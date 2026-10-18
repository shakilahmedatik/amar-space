ALTER TABLE "maintenance_requests" DROP CONSTRAINT "maintenance_requests_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "maintenance_requests" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "maintenance_requests" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "photo_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "requested_by_user_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "assigned_to_staff_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "repair_cost" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "cost_billed_to" text DEFAULT 'landlord';--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "resolution_notes" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "resolution_photo_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "author_user_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_to_staff_id_users_id_fk" FOREIGN KEY ("assigned_to_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_action_idx" ON "audit_logs" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "maintenance_org_building_status_idx" ON "maintenance_requests" USING btree ("organization_id","building_id","status");--> statement-breakpoint
CREATE INDEX "maintenance_assigned_staff_idx" ON "maintenance_requests" USING btree ("assigned_to_staff_id");--> statement-breakpoint
CREATE INDEX "maintenance_requested_by_idx" ON "maintenance_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "notices_org_building_audience_idx" ON "notices" USING btree ("organization_id","target_building_id","target_audience");--> statement-breakpoint
CREATE INDEX "notices_pinned_idx" ON "notices" USING btree ("is_pinned");