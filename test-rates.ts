// test-rates.ts
import { calculateTableRates } from './app/utils/rates/tableRates';
import prisma from './app/db.server';

async function runTest() {
  const shopDomain = "tua-loja.myshopify.com"; // Change to your actual test domain

  // Mock rate request for a destination in Porto (Continental)
  const requestContinental = {
    ShipTo: {
      Country: "PT",
      PostalCode: "4000-123" // Should match RANGE rule for PT_CONTINENTAL
    },
    boxSize: "SMALL",
    currency: "EUR"
  };

  // Mock active carriers and their rates (Normally fetched from DB)
  const activeCarriers = await prisma.carrier.findMany({
    where: { shopDomain: shopDomain, calculationMethod: "TABLE", isActive: true },
    include: { rates: true }
  });

  console.log("[Testing] Evaluating rules for PT Continental...");
  const ratesContinental = await calculateTableRates(requestContinental, activeCarriers, shopDomain);
  console.log("[Testing] Results for Continental:", ratesContinental);

  // Mock rate request for a destination in Funchal (Islands)
  const requestIslands = {
    ShipTo: {
      Country: "PT",
      PostalCode: "9000-100" // Should match PREFIX rule for PT_ILHAS
    },
    boxSize: "SMALL",
    currency: "EUR"
  };

  console.log("\n[Testing] Evaluating rules for PT Islands...");
  const ratesIslands = await calculateTableRates(requestIslands, activeCarriers, shopDomain);
  console.log("[Testing] Results for Islands:", ratesIslands);
}

runTest()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());