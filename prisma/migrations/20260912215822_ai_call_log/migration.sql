-- CreateTable
CREATE TABLE "ai_call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "fieldProfileId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "responseModel" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadInputTokens" INTEGER,
    "cacheCreationInputTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorName" TEXT,
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "cropRecommendationId" TEXT,
    "varietyRecommendationId" TEXT,
    CONSTRAINT "ai_call_fieldProfileId_fkey" FOREIGN KEY ("fieldProfileId") REFERENCES "field_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_call_cropRecommendationId_fkey" FOREIGN KEY ("cropRecommendationId") REFERENCES "crop_recommendation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_call_varietyRecommendationId_fkey" FOREIGN KEY ("varietyRecommendationId") REFERENCES "variety_recommendation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ai_call_fieldProfileId_idx" ON "ai_call"("fieldProfileId");

-- CreateIndex
CREATE INDEX "ai_call_cropRecommendationId_idx" ON "ai_call"("cropRecommendationId");

-- CreateIndex
CREATE INDEX "ai_call_varietyRecommendationId_idx" ON "ai_call"("varietyRecommendationId");

-- CreateIndex
CREATE INDEX "ai_call_createdAt_idx" ON "ai_call"("createdAt");
