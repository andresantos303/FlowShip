/*
  Warnings:

  - You are about to drop the column `groupName` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `groupName` on the `PostalRule` table. All the data in the column will be lost.
  - You are about to drop the column `shopDomain` on the `PostalRule` table. All the data in the column will be lost.
  - Added the required column `zoneId` to the `CarrierRate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `zoneId` to the `PostalRule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zone_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Carrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'NATIONAL',
    "calculationMethod" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "apiAccountNumber" TEXT,
    "apiUrlRates" TEXT,
    "apiUrlAvailability" TEXT,
    "markupType" TEXT DEFAULT 'PERCENTAGE',
    "markupValue" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Carrier" ("apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "category", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt") SELECT "apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "category", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt" FROM "Carrier";
DROP TABLE "Carrier";
ALTER TABLE "new_Carrier" RENAME TO "Carrier";
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "maxWeight" REAL NOT NULL,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CarrierRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("carrierId", "deliveryTime", "id", "maxWeight", "price") SELECT "carrierId", "deliveryTime", "id", "maxWeight", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
CREATE INDEX "CarrierRate_zoneId_idx" ON "CarrierRate"("zoneId");
CREATE TABLE "new_PostalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "valueMin" TEXT NOT NULL,
    "valueMax" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PostalRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PostalRule" ("countryCode", "createdAt", "id", "matchType", "updatedAt", "valueMax", "valueMin") SELECT "countryCode", "createdAt", "id", "matchType", "updatedAt", "valueMax", "valueMin" FROM "PostalRule";
DROP TABLE "PostalRule";
ALTER TABLE "new_PostalRule" RENAME TO "PostalRule";
CREATE INDEX "PostalRule_zoneId_countryCode_idx" ON "PostalRule"("zoneId", "countryCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Zone_carrierId_idx" ON "Zone"("carrierId");
