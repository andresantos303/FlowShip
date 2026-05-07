-- CreateTable
CREATE TABLE "CttIslandsPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightLabel" TEXT NOT NULL,
    "maxWeight" REAL NOT NULL,
    "price" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CttIslandsPricing_maxWeight_key" ON "CttIslandsPricing"("maxWeight");
