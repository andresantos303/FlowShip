/*
  Warnings:

  - You are about to drop the column `boxSize` on the `CarrierRate` table. All the data in the column will be lost.
  - You are about to alter the column `maxWeight` on the `CarrierRate` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT 'PT',
    "maxWeight" REAL NOT NULL,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("carrierId", "deliveryTime", "groupName", "id", "maxWeight", "price") SELECT "carrierId", "deliveryTime", "groupName", "id", "maxWeight", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
