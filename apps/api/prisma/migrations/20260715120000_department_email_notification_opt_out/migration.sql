-- "Divers" is an admin-only assignment used to opt an account out of
-- notification emails while keeping in-app notifications enabled.
ALTER TABLE "departments"
ADD COLUMN "emailNotificationsDisabled" BOOLEAN NOT NULL DEFAULT false;
