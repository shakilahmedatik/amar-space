CREATE INDEX "invitations_org_email_idx" ON "invitations" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "members_org_user_idx" ON "members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "members_org_role_idx" ON "members" USING btree ("organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_custom_domain_idx" ON "organizations" USING btree ("custom_domain");