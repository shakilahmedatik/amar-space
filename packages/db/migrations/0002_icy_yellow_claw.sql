ALTER TABLE "emergency_contacts" ALTER COLUMN "type" SET DEFAULT 'building';--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "city" text DEFAULT 'Dhaka' NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "thana" text;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "has_elevator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "has_generator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "gate_closing_time" text;--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "caretaker_phone" text;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "unit_type" text DEFAULT 'residential' NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "bedrooms" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "bathrooms" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "balconies" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "square_feet" integer;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "default_rent_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "default_service_charge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "electricity_meter_number" text;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "electricity_meter_type" text DEFAULT 'prepaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "gas_type" text DEFAULT 'cylinder' NOT NULL;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "water_submeter_number" text;--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "notes" text;--> statement-breakpoint
CREATE INDEX "buildings_org_idx" ON "buildings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_building_idx" ON "emergency_contacts" USING btree ("building_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flats_org_building_flat_idx" ON "flats" USING btree ("organization_id","building_id","flat_number");--> statement-breakpoint
CREATE INDEX "flats_building_floor_idx" ON "flats" USING btree ("building_id","floor");--> statement-breakpoint
CREATE INDEX "flats_status_idx" ON "flats" USING btree ("status");