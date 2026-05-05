import { getDeliveryDate } from '../DeliveryDate';
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';
import prisma from '../../db.server';

async function getGLSToken(): Promise<string> {
  const url = `${process.env.GLS_BASE_URL}/oauth2/v2/token`;
  
  const clientId = process.env.GLS_API_KEY as string;
  const clientSecret = process.env.GLS_SECRET_KEY as string;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('Authentication failed for GLS:', error);
    throw error;
  }
}

export const getGLSOptions = async (rateRequestInfo: any, prismaConfig: any): Promise<CarrierRate[]> => {
  const destCountry = rateRequestInfo.ShipTo.Country;
  const destZip = rateRequestInfo.ShipTo.PostalCode.trim();
  const weightKg = rateRequestInfo.PackageWeight.Weight;

  let zone = 'PT';
  if (destCountry !== 'PT') {
    // Fetch zone mapping from DB
    const mappedZone = await prisma.glsEuroZone.findUnique({
      where: { countryCode: destCountry }
    });
    
    if (!mappedZone) {
       logger.warn(`No GLS zone mapping found for country: ${destCountry}`);
       return [];
    }
    zone = mappedZone.zoneName;
  }

  const dimensions = [prismaConfig.packageLength, prismaConfig.packageWidth, prismaConfig.packageHeight];
  const sizeSum = Math.max(...dimensions) + Math.min(...dimensions);

  type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL';
  let sizeLabel: SizeLabel;
  if (sizeSum <= 35) sizeLabel = 'XS';
  else if (sizeSum <= 50) sizeLabel = 'S';
  else if (sizeSum <= 65) sizeLabel = 'M';
  else if (sizeSum <= 80) sizeLabel = 'L';
  else sizeLabel = 'XL';

  // Fetch price from DB
  const pricingRecord = await prisma.glsPricing.findUnique({
    where: {
      zoneName_sizeLabel: { zoneName: zone, sizeLabel }
    }
  });

  const basePrice = pricingRecord?.basePrice;

  if (basePrice === undefined) {
    logger.warn(`No GLS pricing found for zone ${zone} and size ${sizeLabel}`);
    return [];
  }

  const isIsland = destCountry === 'PT' && destZip.charAt(0) === '9';
  const islandSurcharge = isIsland ? 24.90 : 0;
  const finalPriceInCents = Math.round((basePrice + islandSurcharge) * 100);

  try {
    const token = await getGLSToken();
    const glsPayload = {
      parcelNumbers: ["00000000000"], // Fake ID
      saveAsDraft: true, // Very important to avoid creating real shipments during validation
      exporter: {
        address: {
          countryCode: rateRequestInfo.ShipFrom.Country,
          postcode: rateRequestInfo.ShipFrom.PostalCode
        }
      },
      importer: {
        address: {
          countryCode: destCountry,
          postcode: destZip
        }
      },
      lineItems: [
        {
          commodityCode: "999999", // Requires 6 to 8 digits (Harmonised System Tariff Code)
          goodsDescription: "Product",
          grossWeight: {
            amount: weightKg,
            unit: "KGM"
          },
          netWeight: {
            amount: weightKg,
            unit: "KGM"
          }
        }
      ]
    };

    const response = await fetch(`${process.env.GLS_BASE_URL}/customs-management/export/public/v3/transit-shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(glsPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.warn(`Transport rejected for ZIP ${destZip} in ${destCountry}:`, errorData);
      return []; 
    }
    
    logger.info(`GLS route validated successfully for ZIP ${destZip} in ${destCountry}. Calculated price: ${(finalPriceInCents / 100).toFixed(2)}€`);
    
    const deliveryZoneKey = isIsland ? 'PT-Island' : zone;
    
    // Fetch delivery times from DB
    const deliveryTimesRecord = await prisma.glsDeliveryTime.findUnique({
      where: { zoneName: deliveryZoneKey }
    });
    
    const isNational = zone === 'PT';
    const serviceName = isNational ? `GLS Portugal` : `GLS Europe (Zone ${zone})`;
    const serviceCode = isNational ? `GLS-PT` : `GLS-EUR`;

    return [
      {
        service_name: serviceName,
        service_code: serviceCode,
        total_price: finalPriceInCents,
        currency: "EUR",
        category: isNational ? 'NACIONAL' : 'EUROPE',
        description: `Operated by GLS - ${isNational ? 'Domestic' : 'International'} service`,
        min_delivery_date: getDeliveryDate(deliveryTimesRecord.minDays),
        max_delivery_date: getDeliveryDate(deliveryTimesRecord.maxDays)
      }
    ];
  } catch (error) {
    logger.error("Failed to validate GLS route:", error);
    return [];
  }
};