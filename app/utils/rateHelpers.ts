import logger from "../utils/logger";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
export interface CarrierRate {
  service_name: string;
  service_code: string;
  total_price: number;
  currency: string;
  description: string;
  min_delivery_date: string;
  max_delivery_date: string;
}

// Helper function to calculate delivery dates
export const getDeliveryDate = (daysToAdd: number): string => {
  return new Date(Date.now() + daysToAdd * MS_PER_DAY).toISOString();
};

// Function to normalize postal codes (removes spaces and hyphens)
export const normalizePostalCode = (postalCode: string): string => {
  const normalized = postalCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return normalized;
}

export const calculateFreeShipping = (bestRates: CarrierRate[], cartTotalCents: number, config: any): CarrierRate[] => {
  if (cartTotalCents >= Math.round(config.freeShippingThreshold*100)) {
    logger.info("Cart total meets free shipping threshold.");
    return bestRates.map(rate => ({ ...rate, total_price: 0 }));
  }
  return bestRates;
};