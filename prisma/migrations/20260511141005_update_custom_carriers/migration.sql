-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Carrier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Nacional',
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
INSERT INTO "new_Carrier" ("apiAccountNumber", "apiKey", "apiSecret", "calculationMethod", "createdAt", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt") SELECT "apiAccountNumber", "apiKey", "apiSecret", "calculationMethod", "createdAt", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt" FROM "Carrier";
DROP TABLE "Carrier";
ALTER TABLE "new_Carrier" RENAME TO "Carrier";
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "postalCodeStart" TEXT,
    "postalCodeEnd" TEXT,
    "maxWeight" REAL NOT NULL,
    "maxVolume" REAL,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("carrierId", "countryCode", "id", "maxVolume", "maxWeight", "postalCodeEnd", "postalCodeStart", "price") SELECT "carrierId", "countryCode", "id", "maxVolume", "maxWeight", "postalCodeEnd", "postalCodeStart", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
