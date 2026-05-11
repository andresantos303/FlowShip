import { getDeliveryDate } from '../DeliveryDate'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';
import prisma from '../../db.server';


export const calculateTableRates = async (rateRequestInfo: any, activeTableCarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];
    for (const carrier of activeTableCarriers) {
      
        // Find a matching rate based on country, postal code and weight
        const matchingRate = carrier.rates.find((r) => {
          const isSameCountry = r.countryCode === rateRequestInfo.country;
          const isUnderMaxWeight = rateRequestInfo.PackageWeight.Weight <= r.maxWeight;
          
          // Basic postal code matching
          let isWithinPostalCode = true;
          if (r.postalCodeStart && r.postalCodeEnd && rateRequestInfo.ShipTo.PostalCode) {
             const destZip = rateRequestInfo.ShipTo.PostalCode.replace(/\D/g, '');
             isWithinPostalCode = destZip >= r.postalCodeStart && destZip <= r.postalCodeEnd;
          }
          return isSameCountry && isUnderMaxWeight && isWithinPostalCode;
        });

        if (matchingRate) {
          availableRates.push({
            service_name: carrier.name,
            service_code: `${carrier.name}-table`,
            total_price: Math.round(matchingRate.price * 100), // Shopify expects price in cents
            currency: rateRequestInfo.currency,
            description: carrier.description,
            category: carrier.category,
            min_delivery_date: getDeliveryDate(matchingRate.deliveryTime),
            max_delivery_date: getDeliveryDate(matchingRate.deliveryTime+2)
          });
          console.log(`Added table rate for carrier ${carrier.name}: ${matchingRate.price} ${rateRequestInfo.currency}`);
        } else {
           console.log(`No matching table rate found for carrier ${carrier.name}`);
        }

        return availableRates;
    }

    
  
};