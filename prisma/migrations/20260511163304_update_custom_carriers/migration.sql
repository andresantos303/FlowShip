/*
  Warnings:

  - You are about to drop the column `countryCode` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `maxVolume` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `maxWeight` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `postalCodeEnd` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `postalCodeStart` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to drop the column `packageHeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `packageLength` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `packageWidth` on the `StoreConfig` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "CountryGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT 'PT',
    "boxSize" TEXT NOT NULL DEFAULT 'SMALL',
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("carrierId", "deliveryTime", "id", "price") SELECT "carrierId", "deliveryTime", "id", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
CREATE TABLE "new_StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "freeShippingActive" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 10000,
    "boxSmallMaxWeight" REAL NOT NULL DEFAULT 2.0,
    "boxSmallLength" INTEGER NOT NULL DEFAULT 20,
    "boxSmallWidth" INTEGER NOT NULL DEFAULT 15,
    "boxSmallHeight" INTEGER NOT NULL DEFAULT 10,
    "boxMediumMaxWeight" REAL NOT NULL DEFAULT 5.0,
    "boxMediumLength" INTEGER NOT NULL DEFAULT 30,
    "boxMediumWidth" INTEGER NOT NULL DEFAULT 20,
    "boxMediumHeight" INTEGER NOT NULL DEFAULT 15,
    "boxLargeMaxWeight" REAL NOT NULL DEFAULT 30.0,
    "boxLargeLength" INTEGER NOT NULL DEFAULT 50,
    "boxLargeWidth" INTEGER NOT NULL DEFAULT 40,
    "boxLargeHeight" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreConfig" ("createdAt", "freeShippingActive", "freeShippingThreshold", "id", "shopDomain", "updatedAt") SELECT "createdAt", "freeShippingActive", "freeShippingThreshold", "id", "shopDomain", "updatedAt" FROM "StoreConfig";
DROP TABLE "StoreConfig";
ALTER TABLE "new_StoreConfig" RENAME TO "StoreConfig";
CREATE UNIQUE INDEX "StoreConfig_shopDomain_key" ON "StoreConfig"("shopDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CountryGroup_shopDomain_countryCode_key" ON "CountryGroup"("shopDomain", "countryCode");
