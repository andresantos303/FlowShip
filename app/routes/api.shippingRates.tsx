// app/routes/api.shipping.tsx
import { ActionFunctionArgs, json } from "@remix-run/node";
import crypto from "crypto";
import logger from "../utils/logger";
import { fetchFinalRate } from "../services/finalCarrier";
import { getDeliveryDate } from "../utils/rateHelpers";
import prisma from "../db.server";

const FALLBACK_RATE = {
  service_name: "Entrega Standard",
  service_code: "FALLBACK-STD",
  total_price: 1500,
  description: "Entrega standard - fallback rate",
  min_delivery_date: getDeliveryDate(5),
  max_delivery_date: getDeliveryDate(10)
};

export async function action({ request }: ActionFunctionArgs) {
  // Only accept POST requests
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  //HMAC Verification
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");

  // Read the raw body as text for HMAC validation
  const rawBody = await request.text();

  if (!hmacHeader || !rawBody) {
    logger.error('Missing HMAC header or raw body.');
    return json({ message: "Not authorized" }, { status: 401 });
  }

  // Generate HMAC hash using the raw body and compare with the header
  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
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

    // Weight and volume calculations with fallbacks
    let totalWeightGrams = 0;
    let totalVolumeCubicCm = 0;
    let cartTotalCents = 0;
    const fallbackWeightGrams = (config.defaultWeight || 0) * 1000;
    const fallbackLength = config.defaultLength || 0;
    const fallbackWidth = config.defaultWidth || 0;
    const fallbackHeight = config.defaultHeight || 0;
    rate.items.forEach((item: any) => {
      const itemWeight = (item.grams && item.grams > 0) ? item.grams : fallbackWeightGrams;
      totalWeightGrams += itemWeight * item.quantity;

      const length = (item.properties?._length && Number(item.properties._length) > 0) ? Number(item.properties._length) : fallbackLength;
      const width = (item.properties?._width && Number(item.properties._width) > 0) ? Number(item.properties._width) : fallbackWidth;
      const height = (item.properties?._height && Number(item.properties._height) > 0) ? Number(item.properties._height) : fallbackHeight;

      totalVolumeCubicCm += (length * width * height) * item.quantity;
      cartTotalCents += item.price * item.quantity;
    });
    const totalWeightKg = totalWeightGrams / 1000;

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
        UnitOfMeasurement: "KG",
        Weight: totalWeightKg,
        totalVolumeCubicCm
      },
      currency: rate.currency,
      country: rate.destination.country,
      cartTotal: cartTotalCents
    };

    logger.info("Processing Shipping Rates with available carriers...");
    const finalRate = await fetchFinalRate(rateRequestInfo, config);

    return json({rates: finalRate});

  } catch (error) {
    logger.error("Critical error in shipping route:", error);
    return json({
      rates: [{ ...FALLBACK_RATE, currency: "EUR" }]
    });
  }
}