// app/routes/api.shipping.tsx
import { ActionFunctionArgs, json } from "@remix-run/node";
import crypto from "crypto";
import logger from "../utils/logger";
// Import necessary services and helpers
import { fetchAllInternacionalRates } from "../services/internacionalCarriers";
import { fetchAllNacionalRates } from "../services/nacionalCarriers";
import { calculateFreeShipping } from "../utils/rateHelpers";
import { getDeliveryDate } from "../utils/DeliveryDate";
import prisma from "../db.server";

const FALLBACK_RATE = {
  service_name: "Entrega Standard",
  service_code: "FALLBACK-STD",
  total_price: 1500,
  description: "Entrega Normal",
  min_delivery_date: getDeliveryDate(5),
  max_delivery_date: getDeliveryDate(10)
};

export async function action({ request }: ActionFunctionArgs) {
  // Only accept POST requests
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  // 1. HMAC Verification
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
  const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";

  // Read the raw body as text for HMAC validation
  const rawBody = await request.text();

  if (!hmacHeader || !rawBody) {
    logger.error('Missing HMAC header or raw body.');
    return json({ message: "Not authorized" }, { status: 401 });
  }

  const generatedHash = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  let hashEquals = false;
  try {
    hashEquals = crypto.timingSafeEqual(
      Buffer.from(generatedHash),
      Buffer.from(hmacHeader)
    );
  } catch (e) {
    hashEquals = false;
  }

  if (!hashEquals) {
    logger.error('HMAC verification failed!');
    return json({ message: "Not authorized" }, { status: 401 });
  }

  // 2. Parse the payload and process rates
  try {
    const payload = JSON.parse(rawBody);
    const { rate } = payload;

    if (!rate || !rate.destination || !rate.items) {
      throw new Error("Shopify payload is missing required fields.");
    }

    logger.info(`Secure request received from: ${shopDomain}`);

    // Fetch Store Config
    let config = await prisma.storeConfig.findUnique({
      where: { shopDomain: shopDomain as string }
    });

    if (!config) {
      config = await prisma.storeConfig.create({
        data: { shopDomain: shopDomain as string }
      });
      logger.info(`New store registered: ${shopDomain}`);
    }

    // Business Logic Calculation
    let totalWeightGrams = 0;
    let cartTotalCents = 0;
    rate.items.forEach((item: any) => {
      totalWeightGrams += item.grams * item.quantity;
      cartTotalCents += item.price * item.quantity;
    });

    const totalWeightKg = totalWeightGrams / 1000;
    const isNacional = rate.destination.country === 'PT';

    const rateRequestInfo = {
      ShipFrom: {
        PostalCode: rate.origin.postal_code,
        Country: rate.origin.country
      },
      ShipTo: {
        PostalCode: rate.destination.postal_code,
        Country: rate.destination.country
      },
      PackageWeight: {
        UnitOfMeasurement: { Code: "KG" },
        Weight: totalWeightKg
      },
      currency: rate.currency
    };

    let finalRates: any[] = [];

    if (isNacional) {
      logger.info("Processing national shipping");
      const liveNacionalRates = await fetchAllNacionalRates(rateRequestInfo, config);
      finalRates = calculateFreeShipping(liveNacionalRates, cartTotalCents, config);
    } else {
      logger.info("Processing international shipping");
      finalRates = await fetchAllInternacionalRates(rateRequestInfo, config);
    }

    if (finalRates.length > 0) {
      const cheapestRate = finalRates.reduce((prev, curr) =>
        prev.total_price < curr.total_price ? prev : curr
      );
      finalRates = [cheapestRate];
      logger.info(`Cheapest rate selected: ${cheapestRate.service_name} at ${(cheapestRate.total_price / 100).toFixed(2)}`);
    } else {
      logger.warn("No carrier rates could be fetched, returning fallback rate.");
      return json({
        rates: [{ ...FALLBACK_RATE, currency: rate.currency || "EUR" }]
      });
    }

    return json({ rates: finalRates });

  } catch (error) {
    logger.error("Critical error in shipping route:", error);
    return json({
      rates: [{ ...FALLBACK_RATE, currency: "EUR" }]
    });
  }
}