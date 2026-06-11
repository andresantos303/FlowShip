import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';
import {getFedExOptions} from './fedexRates';
import {getDhlOptions} from './dhlRates';
import { getUpsOptions } from './upsRates';

export const calculateAPIRates = async (rateRequestInfo: any, activeAPICarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];

    for (const carrier of activeAPICarriers) {
        let fetchedRates: CarrierRate[] = [];

        // Fetch rates based on the active API carrier
        if (carrier.name === "FedEx") {
          const fedexOptions = await getFedExOptions(rateRequestInfo, carrier);
          if (fedexOptions && fedexOptions.length > 0) {
            fetchedRates = fedexOptions;
          }
        } else if (carrier.name === "DHL") {
          const dhlOptions = await getDhlOptions(rateRequestInfo, carrier);
          if (dhlOptions && dhlOptions.length > 0) {
            fetchedRates = dhlOptions;
          }
        } else if (carrier.name === "UPS") {
          const upsOptions = await getUpsOptions(rateRequestInfo, carrier);
          if (upsOptions && upsOptions.length > 0) {
            fetchedRates = upsOptions;
          }
        }

        // Check if any rates were returned from the API
        if (fetchedRates.length > 0) {
            // Iterate over every option returned by the API
            for (const rate of fetchedRates) {
                let finalPrice = rate.total_price;

                // Apply markup to the individual rate
                if (carrier.markupType === "PERCENTAGE" && carrier.markupValue) {
                    finalPrice = finalPrice * (1 + (carrier.markupValue / 100));
                } else if (carrier.markupType === "ABSOLUTE" && carrier.markupValue) {
                    finalPrice = finalPrice + carrier.markupValue;
                }
                rate.total_price = Math.round(finalPrice);
                                
                availableRates.push(rate);
            }
            logger.info(`Added ${fetchedRates.length} API rates for carrier ${carrier.name}`);
        } else {
            logger.error(`No API rates found for carrier ${carrier.name}`);
        }
    }

    return availableRates;
};