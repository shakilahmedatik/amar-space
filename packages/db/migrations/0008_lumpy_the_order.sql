ALTER TABLE "registration_requests" ADD COLUMN "access_code" varchar(6);--> statement-breakpoint
ALTER TABLE "renter_access_codes" ADD COLUMN "code" varchar(6);