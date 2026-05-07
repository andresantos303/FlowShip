import { getDeliveryDate } from '../DeliveryDate'; 
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';
import prisma from '../../db.server';

type Zone = 'T1' | 'T2';

export const calculateCTTRate = async (originZip: string, destZip: string, weightKg: number): Promise<number | null> => {
  if (weightKg > 10) {
    logger.warn(`Weight exceeds 10kg (${weightKg}kg). Not possible to calculate CTT rate`);
    return null;
  }

  const originDigit = originZip.trim().charAt(0);
  const destDigit = destZip.trim().charAt(0);

  let basePrice = 0;
  const isIslandTransit = (destDigit === '9');

  if (isIslandTransit) {
    const islandPricing = await prisma.cttIslandsPricing.findFirst({
      where: { 
        maxWeight: { gte: weightKg } 
      },
      orderBy: { 
        maxWeight: 'asc' 
      }
    });

    if (islandPricing) {
      basePrice = islandPricing.price;
      logger.info(`Calculated base price for islands: ${basePrice} EUR for weight: ${weightKg}kg`);
    } else {
      // Fallback logic if the weight exceeds the maximum allowed (10kg)
      logger.error(`Weight limit exceeded for islands: ${weightKg}kg`);
      throw new Error("Package weight exceeds the maximum allowed limit for Islands (10kg)");
    }
  } else {
    // Fetch zone from DB
    const matrixRecord = await prisma.cttZoneMatrix.findUnique({
      where: {
        originDigit_destDigit: { originDigit, destDigit }
      }
    });

    const zone = matrixRecord?.zoneName as Zone | null;

    if (!zone) {
      logger.warn(`Route doesnt exist: ${originZip} -> ${destZip}`);
      return null;
    }

    const pricing = await prisma.cttPricing.findFirst({
      where: { 
        maxWeight: { gte: weightKg } 
      },
      orderBy: { 
        maxWeight: 'asc' 
      }
    });

    if (pricing) {
      basePrice = zone === 'T1' ? pricing.priceT1 : pricing.priceT2;
    } else {
      throw new Error("Weight exceeds limit for CTT pricing (10kg)");
    }
  }

  let homeDeliveryPrice = 0;
  if (weightKg <= 5) {
    homeDeliveryPrice = 2.95;
  } else if (weightKg <= 10) {
    homeDeliveryPrice = 3.35;
  }

  const totalPriceEur = basePrice + homeDeliveryPrice;
  logger.info(`Calculated CTT rate: Origin ${originZip}, Destination ${destZip}, Weight ${weightKg}kg, Base Price ${basePrice}, Home Delivery ${homeDeliveryPrice}, Total ${totalPriceEur}`);
  
  return Math.round(totalPriceEur * 100);
};

export const getCTTOptions = async (rateRequestInfo: any): Promise<CarrierRate[]> => {
  const originZip = rateRequestInfo.ShipFrom.PostalCode;
  const destZip = rateRequestInfo.ShipTo.PostalCode;
  const weightKg = rateRequestInfo.PackageWeight.Weight;

  const finalPriceInCents = await calculateCTTRate(originZip, destZip, weightKg);

  if (!finalPriceInCents) return [];

  const isIsland = destZip.charAt(0) === '9';

  return [
    {
      service_name: "CTT Encomenda Postal",
      service_code: "CTT-ENC",
      total_price: finalPriceInCents,
      currency: "EUR",
      category: "NACIONAL",
      description: `Operated by CTT - ${isIsland ? 'Island transit' : 'Mainland'}`,
      min_delivery_date: getDeliveryDate(isIsland ? 5 : 2),
      max_delivery_date: getDeliveryDate(isIsland ? 17 : 3)
    }
  ];
};