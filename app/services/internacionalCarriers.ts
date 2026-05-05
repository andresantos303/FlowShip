import logger from '../utils/logger.ts';
import { getFedExOptions } from '../utils/rates/FedExRates.ts';
import { getGLSOptions } from '../utils/rates/GLSRates.ts';
import type { CarrierRate } from '../utils/rateHelpers.ts';
import { prisma } from '../utils/db.ts';

export const fetchAllInternacionalRates = async (rateRequestInfo: any, prismaConfig: any): Promise<CarrierRate[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const allRates: CarrierRate[] = [];
    const destCountry = rateRequestInfo.ShipTo.Country;

    // Build the array of promises to execute in parallel
    const promises: Promise<CarrierRate[]>[] = [getFedExOptions(rateRequestInfo)];
    const carrierNames = ['FedEx'];

    // Validate country dynamically using DB
    const isEuroZone = await prisma.glsEuroZone.findUnique({
      where: { countryCode: destCountry }
    });

    if (isEuroZone) {
      promises.push(getGLSOptions(rateRequestInfo, prismaConfig));
      carrierNames.push('GLS');
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      const carrierName = carrierNames[index];      
      if (result.status === 'fulfilled') {
        if (carrierName === 'FedEx') {
          
          result.value.forEach(rate => {
            let priceWithMarkup = rate.total_price;

            if (prismaConfig.markupType === 'ABSOLUTE') {
              priceWithMarkup = rate.total_price + prismaConfig.markupValue;
            } else {
              const multiplier = 1 + (prismaConfig.markupValue / 100);
              priceWithMarkup = rate.total_price * multiplier;
            }
            let finalPriceInCents = Math.round(priceWithMarkup / 100) * 100;

            finalPriceInCents = Math.max(0, finalPriceInCents);

            allRates.push({
              service_name: rate.service_name,
              service_code: rate.service_code,
              total_price: finalPriceInCents,
              currency: rate.currency,
              category: 'INTERNATIONAL',
              description: `Operated by ${rate.service_name}`,
              min_delivery_date: rate.min_delivery_date,
              max_delivery_date: rate.max_delivery_date
            });
          });
          
        } else {
          allRates.push(...result.value);
        }
      }
    });

    clearTimeout(timeoutId);
    return allRates;

  } catch (error) {
    clearTimeout(timeoutId);
    logger.error("Critical error fetching International Rates:", error);
    return [];
  }
};