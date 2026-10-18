ALTER TABLE "renters" DROP CONSTRAINT "renters_flat_id_flats_id_fk";
--> statement-breakpoint
ALTER TABLE "rental_contracts" ALTER COLUMN "advance_amount" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "rental_contracts" ALTER COLUMN "advance_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "renters" ALTER COLUMN "flat_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "service_charge" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "security_deposit_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "remaining_deposit_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "notice_period_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "termination_date" text;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "contract_document_url" text;--> statement-breakpoint
ALTER TABLE "renters" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "renters" ADD COLUMN "nid_front_photo" text;--> statement-breakpoint
ALTER TABLE "renters" ADD COLUMN "nid_back_photo" text;--> statement-breakpoint
ALTER TABLE "renters" ADD COLUMN "digital_signature_url" text;--> statement-breakpoint
ALTER TABLE "renters" ADD CONSTRAINT "renters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renters" ADD CONSTRAINT "renters_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rental_contracts_org_flat_status_idx" ON "rental_contracts" USING btree ("organization_id","flat_id","status");--> statement-breakpoint
CREATE INDEX "rental_contracts_org_renter_idx" ON "rental_contracts" USING btree ("organization_id","renter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "renters_org_nid_idx" ON "renters" USING btree ("organization_id","nid_number");--> statement-breakpoint
CREATE INDEX "renters_org_phone_idx" ON "renters" USING btree ("organization_id","phone");