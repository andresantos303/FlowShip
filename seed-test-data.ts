// seed-test-data.ts
import prisma from './app/db.server';

async function seed() {
  // Make sure this matches the shopDomain used in test-rates.ts
  const shopDomain = "tua-loja.myshopify.com"; 

  console.log("[Seed] Limpar dados de teste antigos...");
  await prisma.postalRule.deleteMany({ where: { shopDomain } });
  
  // This approach ensures we don't violate foreign keys when deleting
  const testCarriers = await prisma.carrier.findMany({ where: { shopDomain } });
  for (const c of testCarriers) {
      await prisma.carrierRate.deleteMany({ where: { carrierId: c.id } });
  }
  await prisma.carrier.deleteMany({ where: { shopDomain } });

  console.log("[Seed] A criar regras postais (Postal Rules)...");
  await prisma.postalRule.create({
    data: {
      shopDomain,
      countryCode: "PT",
      groupName: "PT_CONTINENTAL",
      matchType: "RANGE",
      valueMin: "1000000",
      valueMax: "8999999"
    }
  });

  await prisma.postalRule.create({
    data: {
      shopDomain,
      countryCode: "PT",
      groupName: "PT_ILHAS",
      matchType: "PREFIX",
      valueMin: "9",
      valueMax: null
    }
  });

  console.log("[Seed] A criar transportadora de teste...");
  const carrier = await prisma.carrier.create({
    data: {
      shopDomain,
      name: "Transportadora Teste",
      calculationMethod: "TABLE",
      isActive: true,
      category: "Nacional",
    }
  });

  console.log("[Seed] A criar precarios (Carrier Rates)...");
  await prisma.carrierRate.create({
    data: {
      carrierId: carrier.id,
      groupName: "PT_CONTINENTAL",
      boxSize: "SMALL",
      maxWeight: 10,
      price: 5.00,
      deliveryTime: 2
    }
  });

  await prisma.carrierRate.create({
    data: {
      carrierId: carrier.id,
      groupName: "PT_ILHAS",
      boxSize: "SMALL",
      maxWeight: 10,
      price: 15.00,
      deliveryTime: 5
    }
  });

  console.log("[Seed] Dados inseridos com sucesso!");
}

seed()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());