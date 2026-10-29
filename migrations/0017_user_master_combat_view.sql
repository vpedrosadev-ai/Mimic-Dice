ALTER TABLE "users"
ADD COLUMN "masterCombatView" TEXT NOT NULL DEFAULT 'standard'
CHECK ("masterCombatView" IN ('standard', 'entities', 'columns'));
