import logger from "../utils/logger";
  
export interface CarrierRate {
  service_name: string;
  service_code: string;
  total_price: number;
  currency: string;
  category: string;
  description: string;
  min_delivery_date: string;
  max_delivery_date: string;
}

export const calculateFreeShipping = (processedRates: CarrierRate[], cartTotalCents: number, config: any): CarrierRate[] => {
  if (cartTotalCents >= config.freeShippingThreshold) {
    logger.info("Cart total meets free shipping threshold.");
    return processedRates.map(rate => ({ ...rate, total_price: 0 }));
  }
  return processedRates;
};