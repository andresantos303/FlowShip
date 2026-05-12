import { getDeliveryDate } from '../DeliveryDate'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';
import prisma from '../../db.server';

export const calculateTableRates = async (rateRequestInfo: any, activeTableCarriers: any[]): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];

    // Fetch the zone (groupName) based only on the country code
    const countryGroup = await prisma.countryGroup.findFirst({
        where: {
            countryCode: rateRequestInfo.country
        }
    });

    const targetZone = countryGroup ? countryGroup.groupName : null;

    if (!targetZone) {
        logger.warn(`No shipping zone found for country code: ${rateRequestInfo.country}`);
        return availableRates;
    }

    for (const carrier of activeTableCarriers) {
        // Find a matching rate based on zone and box size
        const matchingRate = carrier.rates.find((r: any) => {
            const isSameZone = r.groupName === targetZone;
            const isSameBoxSize = r.boxSize === rateRequestInfo.boxSize;
            
            return isSameZone && isSameBoxSize;
        });

        if (matchingRate) {
            availableRates.push({
                service_name: carrier.name,
                service_code: `${carrier.name}-table`,
                total_price: Math.round(matchingRate.price * 100),
                currency: rateRequestInfo.currency,
                description: carrier.description,
                category: carrier.category,
                min_delivery_date: getDeliveryDate(matchingRate.deliveryTime),
                max_delivery_date: getDeliveryDate(matchingRate.deliveryTime + 2)
            });
            logger.info(`Added table rate for carrier ${carrier.name}: ${matchingRate.price} ${rateRequestInfo.currency}`);
        } else {
            logger.info(`No matching table rate found for carrier ${carrier.name} in zone ${targetZone}`);
        }
    }
    
    return availableRates;
};