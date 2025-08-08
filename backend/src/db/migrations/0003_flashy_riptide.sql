ALTER TABLE "user_role_assignments" DROP CONSTRAINT "user_role_assignments_role_id_custom_roles_role_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_custom_roles_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "custom_roles"("role_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "name";