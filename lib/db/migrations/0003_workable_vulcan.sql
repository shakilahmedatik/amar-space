CREATE INDEX "flats_owner_account_idx" ON "flats" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "flats_building_owner_idx" ON "flats" USING btree ("building_id","owner_account_id");--> statement-breakpoint
CREATE INDEX "issues_owner_account_idx" ON "issues" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "issues_building_idx" ON "issues" USING btree ("building_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_requests_owner_account_idx" ON "maintenance_requests" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "maintenance_requests_building_status_idx" ON "maintenance_requests" USING btree ("building_id","status");--> statement-breakpoint
CREATE INDEX "maintenance_requests_status_created_idx" ON "maintenance_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "rental_contracts_flat_status_idx" ON "rental_contracts" USING btree ("flat_id","status");--> statement-breakpoint
CREATE INDEX "rental_contracts_owner_account_idx" ON "rental_contracts" USING btree ("owner_account_id");