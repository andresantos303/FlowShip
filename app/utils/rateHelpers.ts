import prisma from "../db.server";

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

export const calculateFreeShipping = (processedRates: CarrierRate[], cartTotalCents: number): CarrierRate[] => {
  if (cartTotalCents >= prisma.StoreConfig.freeShippingThreshold) {
    return processedRates.map(rate => ({ ...rate, total_price: 0 }));
  }
  return processedRates;
};