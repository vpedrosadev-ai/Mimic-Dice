ALTER TABLE "cloud_catalog_entries" ADD COLUMN "groupName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "cloud_catalog_entries" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';

ALTER TABLE "cloud_library_entries" ADD COLUMN "groupName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "cloud_library_entries" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "cloud_library_entries" ADD COLUMN "sourceEntityKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "cloud_library_entries" ADD COLUMN "sourceCampaignName" TEXT NOT NULL DEFAULT '';
