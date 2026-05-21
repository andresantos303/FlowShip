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
    "conversionFactor" INTEGER NOT NULL DEFAULT 5000,
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
INSERT INTO "new_Carrier" ("apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt") SELECT "apiAccountNumber", "apiKey", "apiSecret", "apiUrlAvailability", "apiUrlRates", "calculationMethod", "createdAt", "description", "id", "isActive", "markupType", "markupValue", "name", "shopDomain", "updatedAt" FROM "Carrier";
DROP TABLE "Carrier";
ALTER TABLE "new_Carrier" RENAME TO "Carrier";
CREATE INDEX "Carrier_shopDomain_idx" ON "Carrier"("shopDomain");
CREATE TABLE "new_StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "freeShippingActive" BOOLEAN NOT NULL DEFAULT false,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreConfig" ("createdAt", "freeShippingActive", "freeShippingThreshold", "id", "shopDomain", "updatedAt") SELECT "createdAt", "freeShippingActive", "freeShippingThreshold", "id", "shopDomain", "updatedAt" FROM "StoreConfig";
DROP TABLE "StoreConfig";
ALTER TABLE "new_StoreConfig" RENAME TO "StoreConfig";
CREATE UNIQUE INDEX "StoreConfig_shopDomain_key" ON "StoreConfig"("shopDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
