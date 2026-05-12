-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarrierRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carrierId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT 'PT',
    "boxSize" TEXT NOT NULL DEFAULT 'SMALL',
    "maxVolume" INTEGER NOT NULL DEFAULT 10,
    "price" REAL NOT NULL,
    "deliveryTime" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CarrierRate_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarrierRate" ("boxSize", "carrierId", "deliveryTime", "groupName", "id", "price") SELECT "boxSize", "carrierId", "deliveryTime", "groupName", "id", "price" FROM "CarrierRate";
DROP TABLE "CarrierRate";
ALTER TABLE "new_CarrierRate" RENAME TO "CarrierRate";
CREATE INDEX "CarrierRate_carrierId_idx" ON "CarrierRate"("carrierId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
