import { getDeliveryDate } from '../DeliveryDate'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';
import prisma from '../../db.server';

// Helper function to normalize postal codes
function normalizePostalCode(postalCode: string): string {
    const normalized = postalCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    logger.info(`Normalized zip code: original='${postalCode}', normalized='${normalized}'`);
    return normalized;
}

export const calculateTableRates = async (rateRequestInfo: any, activeTableCarriers: any[], shopDomain: string): Promise<CarrierRate[]> => {
    const availableRates: CarrierRate[] = [];
    const destinationCountry = rateRequestInfo.ShipTo.Country;
    const rawPostalCode = rateRequestInfo.ShipTo.PostalCode || "";
    
    const normalizedZip = normalizePostalCode(rawPostalCode);

    // Fetch all active postal rules for this specific country and shop
    const countryRules = await prisma.postalRule.findMany({
        where: {
            shopDomain: shopDomain,
            countryCode: destinationCountry
        }
    });

    let targetZone: string | null = null;

    // Evaluate rules to find the matching zone
    for (const rule of countryRules) {
        if (rule.matchType === 'ALL') {
            targetZone = rule.groupName;
            logger.info(`Matched ALL rule for zone: ${targetZone}`);
            break;
        }

        if (rule.matchType === 'EXACT' && normalizedZip === rule.valueMin.toUpperCase()) {
            targetZone = rule.groupName;
            logger.info(`Matched EXACT rule for zone: ${targetZone}`);
            break;
        }

        if (rule.matchType === 'PREFIX' && normalizedZip.startsWith(rule.valueMin.toUpperCase())) {
            targetZone = rule.groupName;
            logger.info(`Matched PREFIX rule for zone: ${targetZone}`);
            break;
        }

        if (rule.matchType === 'RANGE' && rule.valueMax) {
            const zipNum = parseInt(normalizedZip, 10);
            const minNum = parseInt(rule.valueMin, 10);
            const maxNum = parseInt(rule.valueMax, 10);

            if (!isNaN(zipNum) && !isNaN(minNum) && !isNaN(maxNum)) {
                if (zipNum >= minNum && zipNum <= maxNum) {
                    targetZone = rule.groupName;
                    logger.info(`Matched RANGE rule for zone: ${targetZone}`);
                    break;
                }
            }
        }
    }

    if (!targetZone) {
        logger.warn(`No shipping zone found for country code: ${destinationCountry} and postal code: ${rawPostalCode}`);
        return availableRates;
    }

    for (const carrier of activeTableCarriers) {
        // Filtrar tarifas pela zona de destino E onde o peso máximo suporta a encomenda
        const applicableRates = carrier.rates.filter((r: any) => {
            const isSameZone = r.groupName === targetZone;
            const weightFits = rateRequestInfo.PackageWeight.Weight <= r.maxWeight;
            
            return isSameZone && weightFits;
        });

        if (applicableRates.length > 0) {
            // Ordenar as tarifas elegíveis pelo peso (do menor escalão para o maior)
            applicableRates.sort((a: any, b: any) => a.maxWeight - b.maxWeight);
            
            // Escolher o primeiro escalão (o mais ajustado ao peso real)
            const bestRate = applicableRates[0];

            availableRates.push({
                service_name: carrier.name,
                service_code: `${carrier.name}-table`,
                total_price: Math.round(bestRate.price * 100),
                currency: rateRequestInfo.currency,
                description: carrier.description,
                category: carrier.category,
                min_delivery_date: getDeliveryDate(bestRate.deliveryTime),
                max_delivery_date: getDeliveryDate(bestRate.deliveryTime + 2)
            });
            logger.info(`Added table rate for carrier ${carrier.name}: ${bestRate.price} ${rateRequestInfo.currency}`);
        } else {
            logger.info(`No matching table rate found for carrier ${carrier.name} in zone ${targetZone} for weight ${rateRequestInfo.PackageWeight.Weight}kg`);
        }
    }
    
    return availableRates;
};