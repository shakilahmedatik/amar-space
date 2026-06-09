-- Step 1: Add nullable columns first to handle existing data
ALTER TABLE "bills" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "rent_days" integer;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "total_days_in_month" integer;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "monthly_rent" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "scheduled_termination_date" date;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "notice_given_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "termination_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD COLUMN "terminated_by" text;--> statement-breakpoint
ALTER TABLE "renter_access_codes" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint

-- Step 2: Backfill existing bills: monthly_rent = base_rent, due_date = 10th of month after billing_month
UPDATE "bills" SET "monthly_rent" = "base_rent" WHERE "monthly_rent" IS NULL;--> statement-breakpoint
UPDATE "bills" SET "due_date" = (("billing_month" || '-10')::date + INTERVAL '1 month')::date WHERE "due_date" IS NULL;--> statement-breakpoint

-- Step 3: Now make columns NOT NULL
ALTER TABLE "bills" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ALTER COLUMN "monthly_rent" SET NOT NULL;--> statement-breakpoint

-- Step 4: Add foreign key for terminated_by
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_terminated_by_users_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint