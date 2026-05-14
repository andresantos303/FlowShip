/*
  Warnings:

  - You are about to drop the `CountryGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `boxLargeHeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxLargeLength` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxLargeMaxWeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxLargeWidth` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxMediumHeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxMediumLength` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxMediumMaxWeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxMediumWidth` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxSmallHeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxSmallLength` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxSmallMaxWeight` on the `StoreConfig` table. All the data in the column will be lost.
  - You are about to drop the column `boxSmallWidth` on the `StoreConfig` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CountryGroup_shopDomain_countryCode_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CountryGroup";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PostalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "valueMin" TEXT NOT NULL,
    "valueMax" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "freeShippingActive" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateIndex
CREATE INDEX "PostalRule_shopDomain_countryCode_idx" ON "PostalRule"("shopDomain", "countryCode");
