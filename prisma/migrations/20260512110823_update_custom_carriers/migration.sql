/*
  Warnings:

  - You are about to drop the column `shopDomain` on the `CountryGroup` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CountryGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL
);
INSERT INTO "new_CountryGroup" ("countryCode", "countryName", "groupName", "id") SELECT "countryCode", "countryName", "groupName", "id" FROM "CountryGroup";
DROP TABLE "CountryGroup";
ALTER TABLE "new_CountryGroup" RENAME TO "CountryGroup";
CREATE UNIQUE INDEX "CountryGroup_countryCode_key" ON "CountryGroup"("countryCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
