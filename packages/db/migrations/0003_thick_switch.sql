CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" varchar(50) NOT NULL,
	"flat_slug" varchar(100) NOT NULL,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flat_slugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flat_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flat_slugs_flat_id_unique" UNIQUE("flat_id"),
	CONSTRAINT "flat_slugs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "renter_access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flat_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "whatsapp_group_link" varchar(500);--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "manager_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "cover_image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "rules" text;--> statement-breakpoint
ALTER TABLE "flat_slugs" ADD CONSTRAINT "flat_slugs_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_access_codes" ADD CONSTRAINT "renter_access_codes_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_access_codes" ADD CONSTRAINT "renter_access_codes_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flat_slugs_slug_idx" ON "flat_slugs" USING btree ("slug");