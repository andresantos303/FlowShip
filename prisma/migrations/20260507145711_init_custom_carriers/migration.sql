/*
  Warnings:

  - You are about to drop the `CttIslandsPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CttPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CttZoneMatrix` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlsDeliveryTime` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlsEuroZone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlsPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `isActiveCTT` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `isActiveFedEx` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `isActiveGLS` on the `StoreConfig` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CttIslandsPricing_maxWeight_key";

-- DropIndex
DROP INDEX "CttPricing_maxWeight_key";

-- DropIndex
DROP INDEX "CttZoneMatrix_originDigit_destDigit_key";

-- DropIndex
DROP INDEX "GlsDeliveryTime_zoneName_key";

-- DropIndex
DROP INDEX "GlsEuroZone_countryCode_key";

-- DropIndex
DROP INDEX "GlsPricing_zoneName_sizeLabel_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CttIslandsPricing";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CttPricing";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CttZoneMatrix";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GlsDeliveryTime";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GlsEuroZone";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GlsPricing";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calculationMethod" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "markupType" TEXT DEFAULT 'PERCENTAGE',
    "markupValue" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "postalCodeStart" TEXT,
    "postalCodeEnd" TEXT,
    "maxWeight" REAL NOT NULL,
    "maxVolume" REAL,
    "price" REAL NOT NULL,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "markupType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "markupValue" INTEGER NOT NULL DEFAULT 15,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 10000,
    "packageLength" INTEGER NOT NULL DEFAULT 10,
    "packageWidth" INTEGER NOT NULL DEFAULT 5,
    "packageHeight" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreConfig" ("createdAt", "freeShippingThreshold", "id", "markupType", "markupValue", "packageHeight", "packageLength", "packageWidth", "shopDomain", "updatedAt") SELECT "createdAt", "freeShippingThreshold", "id", "markupType", "markupValue", "packageHeight", "packageLength", "packageWidth", "shopDomain", "updatedAt" FROM "StoreConfig";
DROP TABLE "StoreConfig";
ALTER TABLE "new_StoreConfig" RENAME TO "StoreConfig";
CREATE UNIQUE INDEX "StoreConfig_shopDomain_key" ON "StoreConfig"("shopDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");

-- CreateIndex
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
