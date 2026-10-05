ALTER TABLE "cloud_library_entries"
ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "cloud_catalog_entries"
ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
