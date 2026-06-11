import { getDeliveryDate } from '../rateHelpers';
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers.ts';
import { decrypt } from '../encryption';

export const getUpsToken = async (carrier: any): Promise<string> => {
  const url = `${process.env.UPS_BASE_URL}/security/v1/oauth/token`;
  const params = new URLSearchParams();
  const decryptedApiKey = carrier.apiKey ? decrypt(carrier.apiKey) : '';
  const decryptedApiSecret = carrier.apiSecret ? decrypt(carrier.apiSecret) : '';
  
  params.append('grant_type', 'client_credentials');

  // UPS uses Basic Auth for the token endpoint utilizing the API credentials
  const authHeader = `Basic ${Buffer.from(`${decryptedApiKey}:${decryptedApiSecret}`).toString('base64')}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: params.toString()
    });

    if (!response.ok) throw new Error(`Error fetching UPS token: ${response.status}`);
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    logger.error('Error in UPS authentication:', error);
    throw error;
  }
}

export const getUpsOptions = async (rateRequestInfo: any, carrier: any): Promise<CarrierRate[]> => {
  try {
    const token = await getUpsToken(carrier);
    
    // Calculate shipping date (+2 days) and format as YYYYMMDD
    const shippingDate = new Date();
    shippingDate.setDate(shippingDate.getDate() + 2);
    
    const year = shippingDate.getFullYear();
    const month = String(shippingDate.getMonth() + 1).padStart(2, '0');
    const day = String(shippingDate.getDate()).padStart(2, '0');
    const plannedDate = `${year}${month}${day}`;

    // Construct the UPS JSON payload
    const upsPayload = {
      RateRequest: {
        Request: {
          RequestOption: "Shop" // Ensures all available carrier rates are returned
        },
        Shipment: {
          Shipper: {
            ShipperNumber: carrier.apiAccountNumber,
            Address: {
              City: rateRequestInfo.ShipFrom.City,
              PostalCode: rateRequestInfo.ShipFrom.PostalCode,
              CountryCode: rateRequestInfo.ShipFrom.Country
            }
          },
          ShipTo: {
            Address: {
              City: rateRequestInfo.ShipTo.City,
              PostalCode: rateRequestInfo.ShipTo.PostalCode,
              CountryCode: rateRequestInfo.ShipTo.Country
            }
          },
          DeliveryTimeInformation: {
            Pickup: {
              Date: plannedDate
            }
          },
          Package: [
            {
              PackagingType: {
                Code: "02" // Code 02 standardizes Customer Supplied Package
              },
              Dimensions: {
                UnitOfMeasurement: { Code: "CM" },
                Length: rateRequestInfo.length.toString(),
                Width: rateRequestInfo.width.toString(),
                Height: rateRequestInfo.height.toString()
              },
              PackageWeight: {
                UnitOfMeasurement: { Code: "KGS" },
                Weight: rateRequestInfo.weight.toString()
              }
            }
          ]
        }
      }
    };

    const response = await fetch(`${process.env.UPS_BASE_URL}/api/rating/v1/Shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(upsPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Error returned by UPS API:', JSON.stringify(errorData));
      return [];
    }

    const upsData = await response.json();
    const parsedRates: CarrierRate[] = [];

    // Parse the UPS RateResponse returning all processed carrier options
    if (upsData.RateResponse && upsData.RateResponse.RatedShipment) {
      const rates = Array.isArray(upsData.RateResponse.RatedShipment) 
        ? upsData.RateResponse.RatedShipment 
        : [upsData.RateResponse.RatedShipment];

      for (const rateOption of rates) {
        const totalCharge = rateOption.TotalCharges;
        const priceInCents = parseFloat(totalCharge.MonetaryValue) * 100;
        
        parsedRates.push({
          service_name: `UPS Service ${rateOption.Service.Code}`, 
          service_code: rateOption.Service.Code,
          total_price: priceInCents,
          currency: totalCharge.CurrencyCode,
          description: `Operated by UPS - Service Code ${rateOption.Service.Code}`,
          min_delivery_date: getDeliveryDate(rateOption.GuaranteedDelivery.DeliveryByTime),
          max_delivery_date: getDeliveryDate(rateOption.GuaranteedDelivery.DeliveryByTime + 2),
        });
      }
    }

    return parsedRates;

  } catch (error) {
    logger.error('Error in UPS rating processing:', error);
    return [];
  }
}