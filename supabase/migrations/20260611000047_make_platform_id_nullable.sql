-- Make platform_id nullable to allow deployments with only server_name
ALTER TABLE deployments ALTER COLUMN platform_id DROP NOT NULL;
