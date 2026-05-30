ALTER TABLE "flat_slugs" DROP CONSTRAINT "flat_slugs_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "portal_sessions" DROP CONSTRAINT "portal_sessions_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "registration_requests" DROP CONSTRAINT "registration_requests_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "renter_access_codes" DROP CONSTRAINT "renter_access_codes_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "flat_slugs" ADD CONSTRAINT "flat_slugs_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renter_access_codes" ADD CONSTRAINT "renter_access_codes_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE cascade ON UPDATE no action;