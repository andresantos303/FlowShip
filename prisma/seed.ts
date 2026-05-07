// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const euroZones: Record<string, string> = {
  'DE': 'Euro I', 'ES': 'Euro I', 'FR': 'Euro I',
  'AT': 'Euro II', 'BE': 'Euro II', 'NL': 'Euro II', 'IT': 'Euro II', 'LU': 'Euro II', 'CZ': 'Euro II',
  'DK': 'Euro III', 'SK': 'Euro III', 'SI': 'Euro III', 'HU': 'Euro III', 'PL': 'Euro III',
  'BG': 'Euro IV', 'HR': 'Euro IV', 'EE': 'Euro IV', 'LV': 'Euro IV', 'LT': 'Euro IV', 'RO': 'Euro IV',
  'CY': 'Euro IV', 'FI': 'Euro IV', 'GR': 'Euro IV', 'IE': 'Euro IV', 'MT': 'Euro IV', 'SE': 'Euro IV', 'GB': 'Euro IV'
};

const glsPricing: Record<string, Record<string, number>> = {
  'PT': { 'XS': 6.50, 'S': 7.05, 'M': 9.55, 'L': 15.00, 'XL': 15.15 },
  'Euro I': { 'XS': 21.00, 'S': 30.50, 'M': 35.00, 'L': 40.00, 'XL': 48.00 },
  'Euro II': { 'XS': 22.00, 'S': 32.50, 'M': 40.00, 'L': 44.00, 'XL': 50.00 },
  'Euro III': { 'XS': 29.70, 'S': 45.50, 'M': 50.00, 'L': 54.00, 'XL': 62.80 },
  'Euro IV': { 'XS': 42.00, 'S': 79.00, 'M': 83.00, 'L': 88.00, 'XL': 100.00 }
};

const zoneDeliveryTimes: Record<string, { min: number, max: number }> = {
  'PT': { min: 1, max: 2 },
  'PT-Island': { min: 7, max: 10 },
  'Euro I': { min: 2, max: 4 },
  'Euro II': { min: 3, max: 5 },
  'Euro III': { min: 4, max: 6 },
  'Euro IV': { min: 5, max: 8 }
};

const cttZoneMatrix: Record<string, Record<string, string>> = {
  '1': { '1': 'T1', '2': 'T1', '3': 'T1', '4': 'T1', '5': 'T2', '6': 'T2', '7': 'T2', '8': 'T2' },
  '2': { '1': 'T1', '2': 'T1', '3': 'T1', '4': 'T1', '5': 'T2', '6': 'T1', '7': 'T1', '8': 'T2' },
  '3': { '1': 'T1', '2': 'T1', '3': 'T1', '4': 'T1', '5': 'T1', '6': 'T1', '7': 'T2', '8': 'T2' },
  '4': { '1': 'T1', '2': 'T1', '3': 'T1', '4': 'T1', '5': 'T1', '6': 'T2', '7': 'T2', '8': 'T2' },
  '5': { '1': 'T2', '2': 'T2', '3': 'T1', '4': 'T1', '5': 'T1', '6': 'T1', '7': 'T2', '8': 'T2' },
  '6': { '1': 'T2', '2': 'T1', '3': 'T1', '4': 'T2', '5': 'T1', '6': 'T1', '7': 'T1', '8': 'T2' },
  '7': { '1': 'T2', '2': 'T1', '3': 'T2', '4': 'T2', '5': 'T2', '6': 'T1', '7': 'T1', '8': 'T1' },
  '8': { '1': 'T2', '2': 'T2', '3': 'T2', '4': 'T2', '5': 'T2', '6': 'T2', '7': 'T1', '8': 'T1' }
};

async function main() {
  console.log('Starting to seed database...');

  // Delete existing records for carriers to allow safe re-runs
  await prisma.glsEuroZone.deleteMany();
  await prisma.glsPricing.deleteMany();
  await prisma.glsDeliveryTime.deleteMany();
  await prisma.cttZoneMatrix.deleteMany();
  await prisma.cttPricing.deleteMany();
  await prisma.cttIslandsPricing.deleteMany();

  console.log('Cleared existing carrier data.');

  // Seed StoreConfig for development using upsert
  const devShopDomain = 'academy-dev-store-2088.myshopify.com';
  
  await prisma.storeConfig.upsert({
    where: { shopDomain: devShopDomain },
    update: {}, // Mantém as definições se a loja já existir
    create: {
      shopDomain: devShopDomain,
      markupType: 'PERCENTAGE',
      markupValue: 15,
      freeShippingThreshold: 10000,
      packageLength: 10,
      packageWidth: 5,
      packageHeight: 5,
      isActiveCTT: true,
      isActiveGLS: true,
      isActiveFedEx: true,
    },
  });
  console.log('Seeded StoreConfig with default dev store.');

  // Seed GlsEuroZone
  const euroZoneData = Object.entries(euroZones).map(([countryCode, zoneName]) => ({
    countryCode,
    zoneName,
  }));
  await prisma.glsEuroZone.createMany({ data: euroZoneData });
  console.log('Seeded GLS Euro Zones.');

  // Seed GlsPricing
  const pricingData: any[] = [];
  for (const [zoneName, prices] of Object.entries(glsPricing)) {
    for (const [sizeLabel, basePrice] of Object.entries(prices)) {
      pricingData.push({ zoneName, sizeLabel, basePrice });
    }
  }
  await prisma.glsPricing.createMany({ data: pricingData });
  console.log('Seeded GLS Pricing.');

  // Seed GlsDeliveryTime
  const deliveryTimeData = Object.entries(zoneDeliveryTimes).map(([zoneName, times]) => ({
    zoneName,
    minDays: times.min,
    maxDays: times.max,
  }));
  await prisma.glsDeliveryTime.createMany({ data: deliveryTimeData });
  console.log('Seeded GLS Delivery Times.');

  // Seed CttZoneMatrix
  const matrixData: any[] = [];
  for (const [originDigit, destinations] of Object.entries(cttZoneMatrix)) {
    for (const [destDigit, zoneName] of Object.entries(destinations)) {
      matrixData.push({ originDigit, destDigit, zoneName });
    }
  }
  await prisma.cttZoneMatrix.createMany({ data: matrixData });
  console.log('Seeded CTT Zone Matrix.');

  const cttPricingData = [
    { weightLabel: 'Até 2 kg', maxWeight: 2, priceT1: 8.25, priceT2: 9.60 },
    { weightLabel: '> 2 kg – 5 kg', maxWeight: 5, priceT1: 10.50, priceT2: 12.10 },
    { weightLabel: '> 5 kg – 10 kg', maxWeight: 10, priceT1: 15.55, priceT2: 17.60 }
  ];

  await prisma.cttPricing.createMany({ data: cttPricingData });
  console.log('Seeded CTT Pricing.');

  const cttIslandsPricingData = [
    { weightLabel: 'Até 2 kg', maxWeight: 2, price: 12.85 },
    { weightLabel: '> 2 kg – 3 kg', maxWeight: 3, price: 16.70 },
    { weightLabel: '> 3 kg – 4 kg', maxWeight: 4, price: 16.90 },
    { weightLabel: '> 4 kg – 5 kg', maxWeight: 5, price: 18.00 },
    { weightLabel: '> 5 kg – 6 kg', maxWeight: 6, price: 23.70 },
    { weightLabel: '> 6 kg – 7 kg', maxWeight: 7, price: 27.00 },
    { weightLabel: '> 7 kg – 8 kg', maxWeight: 8, price: 29.10 },
    { weightLabel: '> 8 kg – 9 kg', maxWeight: 9, price: 29.95 },
    { weightLabel: '> 9 kg – 10 kg', maxWeight: 10, price: 30.35 }
  ];

  await prisma.cttIslandsPricing.createMany({ data: cttIslandsPricingData });
  console.log('Seeded CTT Islands Pricing.');

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });