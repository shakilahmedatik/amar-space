CREATE INDEX "bills_owner_status_idx" ON "bills" USING btree ("owner_account_id","status");--> statement-breakpoint
CREATE INDEX "payments_bill_id_idx" ON "payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "notices_owner_audience_idx" ON "notices" USING btree ("owner_account_id","target_audience");--> statement-breakpoint
CREATE INDEX "rental_contracts_renter_status_idx" ON "rental_contracts" USING btree ("renter_id","status");--> statement-breakpoint
CREATE INDEX "renters_user_id_idx" ON "renters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "renters_owner_account_id_idx" ON "renters" USING btree ("owner_account_id");--> statement-breakpoint
ALTER TABLE "renter_access_codes" DROP COLUMN "code";