-- CreateTable
CREATE TABLE "CttPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightLabel" TEXT NOT NULL,
    "maxWeight" REAL NOT NULL,
    "priceT1" REAL NOT NULL,
    "priceT2" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CttPricing_maxWeight_key" ON "CttPricing"("maxWeight");
