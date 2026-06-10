CREATE TABLE "notice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(5000) NOT NULL,
	"target_audience" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notices" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notice_templates" ADD CONSTRAINT "notice_templates_owner_account_id_users_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;