-- CreateTable
CREATE TABLE "sowing_plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldProfileId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "varietyName" TEXT,
    "sownAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sowing_plan_fieldProfileId_fkey" FOREIGN KEY ("fieldProfileId") REFERENCES "field_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sowing_plan_fieldProfileId_idx" ON "sowing_plan"("fieldProfileId");
