import { getDeliveryDate } from '../rateHelpers';
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';

async function getFedExToken(): Promise<string> {
  const url = `${process.env.FEDEX_BASE_URL}/oauth/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.FEDEX_API_KEY as string);
  params.append('client_secret', process.env.FEDEX_SECRET_KEY as string);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) throw new Error(`Error fetching FedEx token: ${response.status}`);
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('Error in FedEx authentication:', error);
    throw error;
  }
}

export const getFedExOptions = async (rateRequestInfo: any): Promise<CarrierRate[]> => {
  try {
    const token = await getFedExToken();
    
    const fedexPayload = {
      accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
      requestedShipment: {
        shipper: {
          address: {
            postalCode: rateRequestInfo.ShipFrom.PostalCode,
            countryCode: rateRequestInfo.ShipFrom.Country
          }
        },
        recipient: {
          address: {
            postalCode: rateRequestInfo.ShipTo.PostalCode,
            countryCode: rateRequestInfo.ShipTo.Country
          }
        },
        pickupType: "DROPOFF_AT_FEDEX_LOCATION",
        preferredCurrency: rateRequestInfo.currency,
        rateRequestType: ["ACCOUNT", "PREFERRED"],
        requestedPackageLineItems: [
          { weight: { units: "KG", value: rateRequestInfo.PackageWeight.Weight } }
        ]
      }
    };

    const response = await fetch(`${process.env.FEDEX_BASE_URL}/rate/v1/rates/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-locale': 'pt_PT',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(fedexPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Error returned by FedEx API:', JSON.stringify(errorData));
      return []; 
    }

    const fedexData = await response.json();
    const parsedRates: CarrierRate[] = [];
    if (fedexData.output && fedexData.output.rateReplyDetails) {
      for (const rateOption of fedexData.output.rateReplyDetails) {
        const shipmentDetails = rateOption.ratedShipmentDetails.find((d: any) => d.rateType === 'PREFERRED_CURRENCY' || d.rateType === 'ACCOUNT');
        const priceInCents = Math.round(parseFloat(shipmentDetails.totalNetChargeWithDutiesAndTaxes) * 100);
        
        parsedRates.push({
          service_name: `FedEx ${rateOption.serviceName}`,
          service_code: rateOption.serviceType,
          total_price: priceInCents,
          currency: shipmentDetails.currency,
          description: `Operated by ${rateOption.serviceName}`,
          min_delivery_date: getDeliveryDate(15),
          max_delivery_date: getDeliveryDate(30),
        });
      }
    }
    logger.info(`FedEx returned ${parsedRates.length} rate options for ZIP ${rateRequestInfo.ShipTo.PostalCode} in ${rateRequestInfo.ShipTo.Country}.`);
    return parsedRates;
  } catch (error) {
    logger.error("Error processing FedEx rates:", error);
    return [];
  }
};