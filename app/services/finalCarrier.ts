import logger from '../utils/logger';
import type { CarrierRate } from '../utils/rateHelpers';
import { calculateTableRates } from '../utils/rates/tableRates';
import prisma from '../db.server';
import { getDeliveryDate } from '../utils/DeliveryDate';
import { calculateAPIRates } from '../utils/rates/APIRates';

const FALLBACK_RATE = {
  service_name: "Entrega Standard",
  service_code: "FALLBACK-STD",
  total_price: 1500,
  description: "Entrega standard - fallback rate",
  currency: "EUR",
  category: "Standard",
  min_delivery_date: getDeliveryDate(5),
  max_delivery_date: getDeliveryDate(10)
};

export const fetchFinalRate = async (rateRequestInfo: any, prismaStoreConfig: any): Promise<CarrierRate[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const bestrate: CarrierRate[] = [];
  try {
    const activeTableCarriers = await prisma.carrier.findMany({
      where: { 
        shopDomain: prismaStoreConfig.shopDomain,
        calculationMethod: "TABLE",
        isActive: true 
      },
      include: { 
        rates: true 
      }
    });
    const activeAPICarriers = await prisma.carrier.findMany({
      where: { 
        shopDomain: prismaStoreConfig.shopDomain,
        calculationMethod: "API",
        isActive: true 
      }
    });
    const tableRates = await calculateTableRates(rateRequestInfo,activeTableCarriers);
    // const apiRates = await calculateAPIRates(rateRequestInfo, activeAPICarriers);

    const allRates = [...tableRates/* , ...apiRates */];
    if (allRates.length > 0) {
      const cheapestRate = allRates.reduce((prev, curr) =>
        prev.total_price < curr.total_price ? prev : curr
      );
      bestrate.push(cheapestRate);
      logger.info(`Cheapest rate selected: ${cheapestRate.service_name} at ${(cheapestRate.total_price / 100).toFixed(2)}`);
    } else {
      logger.warn("No carrier rates could be fetched, returning fallback rate.");
      bestrate.push(FALLBACK_RATE);
    }
    clearTimeout(timeoutId);
    return bestrate;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error("Critical error fetching Rates:", error);
    return [];
  }
};