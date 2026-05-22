/*
  Warnings:

  - You are about to drop the column `apiUrlAvailability` on the `Carrier` table. All the data in the column will be lost.
  - You are about to drop the column `apiUrlRates` on the `Carrier` table. All the data in the column will be lost.
  - You are about to drop the column `conversionFactor` on the `Carrier` table. All the data in the column will be lost.

*/
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
    "markupType" TEXT DEFAULT 'PERCENTAGE',
    "markupValue" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Carrier" ("apiAccountNumber", "apiKey", "apiSecret", "calculationMethod", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt") SELECT "apiAccountNumber", "apiKey", "apiSecret", "calculationMethod", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt" FROM "Carrier";
DROP TABLE "Carrier";
ALTER TABLE "new_Carrier" RENAME TO "Carrier";
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");
CREATE TABLE "new_Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "postalCodeRange" TEXT NOT NULL,
    "conversionFactor" INTEGER NOT NULL DEFAULT 5000,
    CONSTRAINT "Rule_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Rule" ("carrierId", "country", "countryCode", "id", "matchType", "postalCodeRange") SELECT "carrierId", "country", "countryCode", "id", "matchType", "postalCodeRange" FROM "Rule";
DROP TABLE "Rule";
ALTER TABLE "new_Rule" RENAME TO "Rule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
