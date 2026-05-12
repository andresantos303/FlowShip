import { getDeliveryDate } from '../DeliveryDate'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';
import prisma from '../../db.server';


export const calculateAPIRates = async (rateRequestInfo: any, activeAPICarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];
    for (const carrier of activeAPICarriers) {
      
        // Mock external API call for the carrier
        console.log(`Mocking API call for carrier ${carrier.name}`);
        
        let apiBasePrice = 10.00; // Mocked base price from the external API

        // Apply markup
        let finalPrice = apiBasePrice;
        if (carrier.markupType === "PERCENTAGE" && carrier.markupValue) {
          finalPrice = apiBasePrice * (1 + (carrier.markupValue / 100));
        } else if (carrier.markupType === "ABSOLUTE" && carrier.markupValue) {
          finalPrice = apiBasePrice + carrier.markupValue;
        }

        if (matchingRate) {
          availableRates.push({
            service_name: carrier.name,
            service_code: `${carrier.name}-api`,
            total_price: Math.round(matchingRate.price * 100), // Shopify expects price in cents
            currency: rateRequestInfo.currency,
            description: carrier.description,
            category: carrier.category,
            min_delivery_date: getDeliveryDate(matchingRate.deliveryTime),
            max_delivery_date: getDeliveryDate(matchingRate.deliveryTime+2)
          });
          console.log(`Added API rate for carrier ${carrier.name}: ${matchingRate.price} ${rateRequestInfo.currency}`);
        } else {
           console.log(`No matching API rate found for carrier ${carrier.name}`);
        }

        return availableRates;
    }

    
  
};