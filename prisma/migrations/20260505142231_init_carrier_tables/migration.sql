-- CreateTable
CREATE TABLE "StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "markupType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "markupValue" INTEGER NOT NULL DEFAULT 15,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 10000,
    "packageLength" INTEGER NOT NULL DEFAULT 10,
    "packageWidth" INTEGER NOT NULL DEFAULT 5,
    "packageHeight" INTEGER NOT NULL DEFAULT 5,
    "isActiveCTT" BOOLEAN NOT NULL DEFAULT true,
    "isActiveGLS" BOOLEAN NOT NULL DEFAULT true,
    "isActiveFedEx" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GlsEuroZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GlsPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneName" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "basePrice" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "GlsDeliveryTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneName" TEXT NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "CttZoneMatrix" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originDigit" TEXT NOT NULL,
    "destDigit" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreConfig_shopDomain_key" ON "StoreConfig"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "GlsEuroZone_countryCode_key" ON "GlsEuroZone"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "GlsPricing_zoneName_sizeLabel_key" ON "GlsPricing"("zoneName", "sizeLabel");

-- CreateIndex
CREATE UNIQUE INDEX "GlsDeliveryTime_zoneName_key" ON "GlsDeliveryTime"("zoneName");

-- CreateIndex
CREATE UNIQUE INDEX "CttZoneMatrix_originDigit_destDigit_key" ON "CttZoneMatrix"("originDigit", "destDigit");
