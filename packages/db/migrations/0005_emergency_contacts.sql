CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"owner_account_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(50) NOT NULL,
	"phone" varchar(20),
	"type" varchar(20) NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flat_id" uuid NOT NULL,
	"owner_account_id" text NOT NULL,
	"full_name" varchar(100) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"nid_number" varchar(17) NOT NULL,
	"nid_photo_url" varchar(500),
	"blood_group" varchar(3) NOT NULL,
	"occupation" varchar(100) NOT NULL,
	"family_members" integer NOT NULL,
	"emergency_contact" varchar(11) NOT NULL,
	"rental_start_date" date NOT NULL,
	"advance_amount" numeric(12, 2) NOT NULL,
	"digital_signature_url" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_requests_flat_phone_pending_idx" ON "registration_requests" USING btree ("flat_id","phone") WHERE "registration_requests"."status" = 'PENDING_APPROVAL';
