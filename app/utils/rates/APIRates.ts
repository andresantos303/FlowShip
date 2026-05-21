import { getDeliveryDate } from '../rateHelpers'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';
import {getFedExOptions} from './FedExRates';
import prisma from '../../db.server';


export const calculateAPIRates = async (rateRequestInfo: any, activeAPICarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];
    for (const carrier of activeAPICarriers) {
        let matchingRate: CarrierRate | undefined;
        if (carrier.name === "FedEx") {
          const fedexOptions = await getFedExOptions(rateRequestInfo, carrier);
          matchingRate = fedexOptions && fedexOptions.length ? fedexOptions[0] : undefined;
        }

        // Apply markup
        let finalPrice = matchingRate ? matchingRate.total_price : 0;
        if (carrier.markupType === "PERCENTAGE" && carrier.markupValue) {
          finalPrice = finalPrice * (1 + (carrier.markupValue / 100));
        } else if (carrier.markupType === "ABSOLUTE" && carrier.markupValue) {
          finalPrice = finalPrice + carrier.markupValue;
        }

        if (matchingRate) {
          // update price after markup
          matchingRate.total_price = finalPrice;
          availableRates.push(matchingRate);
          logger.info(`Added API rate for carrier ${carrier.name}: ${matchingRate.total_price} ${rateRequestInfo.currency}`);
        } else {
           logger.error(`No matching API rate found for carrier ${carrier.name}`);
        }
    }

    return availableRates;

    
  
};