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
    if (weightKg <= 2) basePrice = 12.85;
    else if (weightKg <= 3) basePrice = 16.70;
    else if (weightKg <= 4) basePrice = 16.90;
    else if (weightKg <= 5) basePrice = 18.00;
    else if (weightKg <= 6) basePrice = 23.70;
    else if (weightKg <= 7) basePrice = 27.00;
    else if (weightKg <= 8) basePrice = 29.10;
    else if (weightKg <= 9) basePrice = 29.95;
    else if (weightKg <= 10) basePrice = 30.35;       
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

    if (weightKg <= 2) {
      basePrice = zone === 'T1' ? 8.25 : 9.60;
    } else if (weightKg <= 5) {
      basePrice = zone === 'T1' ? 10.50 : 12.10;
    } else if (weightKg <= 10) {
      basePrice = zone === 'T1' ? 15.55 : 17.60;
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