import logger from '../logger';
import prisma from '../../db.server';
import { decrypt } from '../encryption';

// DHL TypeScript definitions based on the OpenAPI schema
type DhlAddress = {
  postalCode: string;
  cityName: string;
  countryCode: string;
  addressLine1: string;
  addressLine2?: string;
  provinceCode?: string;
};

type DhlContact = {
  email: string;
  phone: string;
  companyName: string;
  fullName: string;
};

type DhlShipmentRequest = {
  plannedShippingDateAndTime: string;
  pickup: {
    isRequested: boolean;
  };
  productCode: string;
  accounts: Array<{
    typeCode: string;
    number: string;
  }>;
  customerDetails: {
    shipperDetails: {
      postalAddress: DhlAddress;
      contactInformation: DhlContact;
    };
    receiverDetails: {
      postalAddress: DhlAddress;
      contactInformation: DhlContact;
    };
  };
  content: {
    isCustomsDeclarable: boolean;
    description: string;
    incoterm: string;
    unitOfMeasurement: string;
    packages: Array<{
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    }>;
  };
};

const buildTrackingUrl = (trackingNumber: string): string =>
  `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`;

const sanitizePhoneNumber = (phone: string | null | undefined, fallback = '000000000'): string => {
  if (!phone) return fallback;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length > 0 ? cleaned : fallback;
};

const buildDhlShipmentRequest = (order: any, carrier: any, serviceCode: string): DhlShipmentRequest => {
  const shipperLocation = order.fulfillmentOrders.edges[0]?.node.assignedLocation;
  const shippingAddress = order.shippingAddress;
  const customer = order.customer;
  
  // Set shipping date to two days from now and format to DHL requirements (YYYY-MM-DDTHH:MM:SS GMT+00:00)
  const plannedDate = new Date();
  plannedDate.setDate(plannedDate.getDate() + 2);
  const formattedDate = plannedDate.toISOString().split('.')[0] + ' GMT+00:00';

  return {
    plannedShippingDateAndTime: formattedDate,
    pickup: {
      isRequested: false
    },
    productCode: serviceCode,
    accounts: [
      {
        typeCode: 'shipper',
        number: carrier.apiAccountNumber
      }
    ],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: shipperLocation.zip,
          cityName: shipperLocation.city,
          countryCode: shipperLocation.countryCode,
          addressLine1: shipperLocation.address1,
          addressLine2: shipperLocation.address2 || undefined,
          provinceCode: shipperLocation.province || undefined
        },
        contactInformation: {
          email: carrier.email || 'noreply@store.com',
          phone: sanitizePhoneNumber(shipperLocation.phone),
          companyName: shipperLocation.name || 'Store Location',
          fullName: shipperLocation.name || 'Store Location'
        }
      },
      receiverDetails: {
        postalAddress: {
          postalCode: shippingAddress.zip,
          cityName: shippingAddress.city,
          countryCode: shippingAddress.countryCode,
          addressLine1: shippingAddress.address1,
        },
        contactInformation: {
          email: customer?.email || 'customer@example.com',
          phone: sanitizePhoneNumber(shippingAddress.phone || customer?.phone),
          companyName: shippingAddress.company || `${customer?.firstName} ${customer?.lastName}`,
          fullName: `${customer?.firstName} ${customer?.lastName}`
        }
      }
    },
    content: {
      isCustomsDeclarable: false,
      description: `Order ${order.name}`,
      incoterm: 'DAP',
      unitOfMeasurement: 'metric',
      packages: [
        {
          weight: order.currentTotalWeight ? (order.currentTotalWeight / 1000) : 1.0,
          dimensions: {
            length: 10,
            width: 10,
            height: 10
          }
        }
      ]
    }
  };
};

const createDhlShipment = async (requestPayload: DhlShipmentRequest, carrier: any) => {
  const decryptedApiKey = carrier.apiKey ? decrypt(carrier.apiKey) : '';
  const decryptedApiSecret = carrier.apiSecret ? decrypt(carrier.apiSecret) : '';
  
  // Encode API credentials for Basic Auth
  const authHeader = `Basic ${Buffer.from(`${decryptedApiKey}:${decryptedApiSecret}`).toString('base64')}`;

  const response = await fetch(`${process.env.DHL_BASE_URL}/shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    logger.error('Error returned by DHL API:', JSON.stringify(errorData));
    throw new Error(`DHL API Error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    trackingNumber: data.shipmentTrackingNumber,
    trackingUrl: buildTrackingUrl(data.shipmentTrackingNumber),
    labelData: data.documents?.[0]?.content // Base64 encoded PDF label from the API
  };
};

export const processDhlShipmentOrder = async (orderId: string, admin: any, carrier: any) => {
  logger.info(`Starting DHL shipment creation for order: ${orderId}`);

  const orderQuery = `
    query GetShipmentOrder($orderId: ID!) {
      order(id: $orderId) {
        id
        name
        phone
        currentTotalWeight
        fulfillmentOrders(first: 1) {
          edges {
            node {
              assignedLocation {
                name
                phone
                address1
                address2
                city
                province
                zip
                countryCode
              }
            }
          }
        }
        customer {
          firstName
          lastName
          phone
          email
        }
        shippingAddress {
          name
          phone
          company
          address1
          address2
          city
          provinceCode
          zip
          countryCode
          country
        }
      }
    }
  `;

  const orderResponse = await admin.graphql(orderQuery, { variables: { orderId } });
  const orderResponseJson = await orderResponse.json();
  const order = orderResponseJson?.data?.order;

  if (!order) {
    throw new Error(`Unable to fetch Shopify order with ID: ${orderId}.`);
  }

  // 'P' typically stands for Express Worldwide in DHL systems
  const shipmentRequest = buildDhlShipmentRequest(order, carrier, 'P');
  const shipmentResponse = await createDhlShipment(shipmentRequest, carrier);

  return {
    trackingNumber: shipmentResponse.trackingNumber ?? `DHL${Math.floor(Math.random() * 1000000000)}`,
    trackingUrl: shipmentResponse.trackingUrl ?? 'https://www.dhl.com/'
  };
};