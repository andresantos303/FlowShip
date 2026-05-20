/*
  Warnings:

  - You are about to drop the `CarrierRate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PostalRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Zone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `category` on the `Carrier` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CarrierRate_zoneId_idx";

-- DropIndex
DROP INDEX "CarrierRate_carrierId_idx";

-- DropIndex
DROP INDEX "PostalRule_zoneId_countryCode_idx";

-- DropIndex
DROP INDEX "Zone_carrierId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CarrierRate";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PostalRule";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Zone";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "postalCodeRange" TEXT NOT NULL,
    CONSTRAINT "Rule_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "maxWeight" REAL NOT NULL,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL,
    CONSTRAINT "Rate_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Carrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "calculationMethod" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "apiAccountNumber" TEXT,
    "apiUrlRates" TEXT,
    "apiUrlAvailability" TEXT,
    "markupType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "markupValue" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Carrier" ("apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt") SELECT "apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "createdAt", "description", "id", "isActive", coalesce("markupType", 'PERCENTAGE') AS "markupType", "markupValue", "name", "shopDomain", "updatedAt" FROM "Carrier";
DROP TABLE "Carrier";
ALTER TABLE "new_Carrier" RENAME TO "Carrier";
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
