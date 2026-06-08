ALTER TABLE "manager_assignments" DROP CONSTRAINT "manager_assignments_manager_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_building_assignments" DROP CONSTRAINT "staff_building_assignments_staff_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_permission_overrides" DROP CONSTRAINT "user_permission_overrides_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_building_assignments" ADD CONSTRAINT "staff_building_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;