/*
  Warnings:

  - You are about to drop the column `postalCodeStart` on the `CarrierRate` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "postalCodeEnd" TEXT,
    "maxWeight" REAL NOT NULL,
    "maxVolume" REAL,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("carrierId", "countryCode", "deliveryTime", "id", "maxVolume", "maxWeight", "postalCodeEnd", "price") SELECT "carrierId", "countryCode", "deliveryTime", "id", "maxVolume", "maxWeight", "postalCodeEnd", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
