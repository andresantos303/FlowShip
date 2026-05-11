/*
  Warnings:

  - You are about to drop the column `markupType` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `markupValue` on the `StoreConfig` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "freeShippingActive" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 10000,
    "packageLength" INTEGER NOT NULL DEFAULT 10,
    "packageWidth" INTEGER NOT NULL DEFAULT 5,
    "packageHeight" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreConfig" ("createdAt", "freeShippingThreshold", "id", "packageHeight", "packageLength", "packageWidth", "shopDomain", "updatedAt") SELECT "createdAt", "freeShippingThreshold", "id", "packageHeight", "packageLength", "packageWidth", "shopDomain", "updatedAt" FROM "StoreConfig";
DROP TABLE "StoreConfig";
ALTER TABLE "new_StoreConfig" RENAME TO "StoreConfig";
CREATE UNIQUE INDEX "StoreConfig_shopDomain_key" ON "StoreConfig"("shopDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
