CREATE TABLE "portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flat_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;