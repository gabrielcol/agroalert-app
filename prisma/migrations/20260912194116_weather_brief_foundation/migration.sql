-- CreateTable
CREATE TABLE "field_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "villageName" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "landBucket" TEXT NOT NULL,
    "irrigation" BOOLEAN NOT NULL,
    "soilClass" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "weather_cell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latCell" REAL NOT NULL,
    "lngCell" REAL NOT NULL,
    "climateProfile" JSONB,
    "climateFetchedAt" DATETIME,
    "forecast" JSONB,
    "forecastFetchedAt" DATETIME,
    "outlook" JSONB,
    "outlookFetchedAt" DATETIME,
    "sourceDataset" TEXT,
    "sourceSpan" TEXT
);

-- CreateTable
CREATE TABLE "crop_recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldProfileId" TEXT NOT NULL,
    "weatherBrief" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crop_recommendation_fieldProfileId_fkey" FOREIGN KEY ("fieldProfileId") REFERENCES "field_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "variety_recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cropRecommendationId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variety_recommendation_cropRecommendationId_fkey" FOREIGN KEY ("cropRecommendationId") REFERENCES "crop_recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_cell_latCell_lngCell_key" ON "weather_cell"("latCell", "lngCell");

-- CreateIndex
CREATE INDEX "crop_recommendation_fieldProfileId_idx" ON "crop_recommendation"("fieldProfileId");

-- CreateIndex
CREATE INDEX "variety_recommendation_cropRecommendationId_idx" ON "variety_recommendation"("cropRecommendationId");
