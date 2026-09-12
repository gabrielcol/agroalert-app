-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_system_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "defaultLocale" TEXT NOT NULL DEFAULT 'ro',
    "siteName" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_system_config" ("defaultLocale", "id", "siteName", "updatedAt") SELECT "defaultLocale", "id", "siteName", "updatedAt" FROM "system_config";
DROP TABLE "system_config";
ALTER TABLE "new_system_config" RENAME TO "system_config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
