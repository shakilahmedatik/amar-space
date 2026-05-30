ALTER TABLE "users" ADD COLUMN "approval_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;