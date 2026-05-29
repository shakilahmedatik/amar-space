CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advance_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"contract_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"bill_id" uuid,
	"note" varchar(500),
	"adjusted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"contract_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"billing_month" varchar(7) NOT NULL,
	"base_rent" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_flat_billing_month_unique" UNIQUE("flat_id","billing_month")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"bill_id" uuid NOT NULL,
	"receipt_reference" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receipt_reference_unique" UNIQUE("receipt_reference")
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" varchar(500) NOT NULL,
	"total_floors" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_owner_name_unique" UNIQUE("owner_account_id","name")
);
--> statement-breakpoint
CREATE TABLE "file_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"building_id" uuid NOT NULL,
	"flat_number" varchar(20) NOT NULL,
	"floor" integer NOT NULL,
	"status" varchar(20) DEFAULT 'vacant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flats_building_flat_number_unique" UNIQUE("building_id","flat_number")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"building_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"category" varchar(20) NOT NULL,
	"priority" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"resolution_notes" varchar(2000),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" varchar(45),
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"content" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"flat_id" uuid NOT NULL,
	"renter_id" uuid NOT NULL,
	"building_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"priority" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"manager_id" text NOT NULL,
	"building_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_assignments_manager_building_unique" UNIQUE("manager_id","building_id")
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(5000) NOT NULL,
	"target_audience" varchar(20) NOT NULL,
	"target_building_id" uuid,
	"target_flat_id" uuid,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pinned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"renter_id" uuid NOT NULL,
	"flat_id" uuid NOT NULL,
	"monthly_rent" numeric(12, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"security_deposit_amount" numeric(12, 2) NOT NULL,
	"remaining_deposit_balance" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"nid_number" varchar(17) NOT NULL,
	"nid_photo_url" varchar(500),
	"date_of_birth" date,
	"occupation" varchar(200) NOT NULL,
	"blood_group" varchar(5) NOT NULL,
	"total_family_members" integer NOT NULL,
	"family_member_names" jsonb,
	"emergency_contact_name" varchar(200) NOT NULL,
	"emergency_contact_number" varchar(20) NOT NULL,
	"emergency_contact_relationship" varchar(100) NOT NULL,
	"digital_signature_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"role" varchar(20) DEFAULT 'owner' NOT NULL,
	"owner_account_id" uuid,
	"phone" varchar(20),
	"language_preference" varchar(5) DEFAULT 'bn',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_adjustments" ADD CONSTRAINT "advance_adjustments_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_adjustments" ADD CONSTRAINT "advance_adjustments_contract_id_rental_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."rental_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_adjustments" ADD CONSTRAINT "advance_adjustments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advance_adjustments" ADD CONSTRAINT "advance_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_contract_id_rental_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."rental_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_references" ADD CONSTRAINT "file_references_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flats" ADD CONSTRAINT "flats_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flats" ADD CONSTRAINT "flats_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_request_id_maintenance_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_request_id_maintenance_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_target_building_id_buildings_id_fk" FOREIGN KEY ("target_building_id") REFERENCES "public"."buildings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_target_flat_id_flats_id_fk" FOREIGN KEY ("target_flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_renter_id_renters_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."renters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renters" ADD CONSTRAINT "renters_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renters" ADD CONSTRAINT "renters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_owner_account_idx" ON "audit_logs" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");