import { getDeliveryDate } from '../rateHelpers';
import logger from '../logger';
import type { CarrierRate } from '../rateHelpers';
import { decrypt } from '../encryption';

export const getDhlOptions = async (rateRequestInfo: any, carrier: any): Promise<CarrierRate[]> => {
  try {
    // Decrypt credentials
    const decryptedApiKey = carrier.apiKey ? decrypt(carrier.apiKey) : '';
    const decryptedApiSecret = carrier.apiSecret ? decrypt(carrier.apiSecret) : '';
    
    // Encode credentials for Basic Auth
    const authHeader = `Basic ${Buffer.from(`${decryptedApiKey}:${decryptedApiSecret}`).toString('base64')}`;
    
    // Construct query parameters for the GET request
    const params = new URLSearchParams();
    params.append('accountNumber', carrier.apiAccountNumber);
    params.append('originCountryCode', rateRequestInfo.ShipFrom.Country);
    params.append('originPostalCode', rateRequestInfo.ShipFrom.PostalCode);
    params.append('originCityName', rateRequestInfo.ShipFrom.City);
    params.append('destinationCountryCode', rateRequestInfo.ShipTo.Country);
    params.append('destinationPostalCode', rateRequestInfo.ShipTo.PostalCode);
    params.append('destinationCityName', rateRequestInfo.ShipTo.City);
    params.append('weight', rateRequestInfo.PackageWeight.Weight);
    params.append('length', rateRequestInfo.PackageWeight.Length);
    params.append('width', rateRequestInfo.PackageWeight.Width);
    params.append('height', rateRequestInfo.PackageWeight.Height);
    
    const shippingDate = new Date();
    shippingDate.setDate(shippingDate.getDate() + 2);
    const plannedDate = shippingDate.toISOString().split('T')[0];
    params.append('plannedShippingDate', plannedDate);
    params.append('isCustomsDeclarable', 'false'); 
    params.append('unitOfMeasurement', 'metric');

    const url = `${process.env.DHL_BASE_URL}/rates?${params.toString()}`;

    // Send the GET request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Error returned by DHL API:', JSON.stringify(errorData));
      return [];
    }

    const dhlData = await response.json();
    const parsedRates: CarrierRate[] = [];

    // Parse the DHL response
    if (dhlData && dhlData.products) {
      for (const rateOption of dhlData.products) {
        // DHL usually returns a totalPrice array, we take the first element's price
        const priceInCents = rateOption.totalPrice[0].price * 100;
        
        parsedRates.push({
          service_name: `${rateOption.productName}`,
          service_code: rateOption.productCode,
          total_price: priceInCents,
          currency: rateOption.totalPrice[0].priceCurrency,
          description: `Operated by DHL - ${rateOption.productName}`,
          min_delivery_date: getDeliveryDate(rateOption.deliveryCapabilities.deliveryDayOfWeek),
          max_delivery_date: getDeliveryDate(rateOption.deliveryCapabilities.deliveryDayOfWeek + 2),
        });
      }
    }

    return parsedRates;

  } catch (error) {
    logger.error('Error in DHL rating processing:', error);
    return [];
  }
}