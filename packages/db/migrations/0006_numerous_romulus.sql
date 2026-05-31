ALTER TABLE "registration_requests" ADD COLUMN "access_code_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "family_member_names" jsonb;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "emergency_contact_name" varchar(200);--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "emergency_contact_relationship" varchar(100);--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "selfie_photo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "gas_bill" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "water_bill" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "service_charge" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "other_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "renters" ADD COLUMN "selfie_photo_url" varchar(500);