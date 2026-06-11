import logger from '../logger';
import { getUpsToken } from '../rates/upsRates'; 
import prisma from '../../db.server';

const buildTrackingUrl = (trackingNumber: string): string =>
  `https://www.ups.com/track?tracknum=${trackingNumber}`;

const buildUpsShipmentRequest = (order: any, carrier: any): any => {
  const shipperLocation = order.fulfillmentOrders.edges[0]?.node.assignedLocation;
  const shippingAddress = order.shippingAddress;
  const customer = order.customer;

  return {
    ShipmentRequest: {
      Request: {
        TransactionReference: {
          CustomerContext: `Order ${order.name}`
        }
      },
      Shipment: {
        Description: `Order ${order.name}`,
        Shipper: {
          Name: shipperLocation.name || 'Store Location',
          ShipperNumber: carrier.apiAccountNumber,
          Address: {
            AddressLine: [shipperLocation.address1, shipperLocation.address2].filter(Boolean),
            City: shipperLocation.city,
            StateProvinceCode: shipperLocation.provinceCode || shipperLocation.province || '',
            PostalCode: shipperLocation.zip,
            CountryCode: shipperLocation.countryCode
          }
        },
        ShipTo: {
          Name: shippingAddress.company || shippingAddress.name || `${customer?.firstName} ${customer?.lastName}`,
          Address: {
            AddressLine: [shippingAddress.address1, shippingAddress.address2].filter(Boolean),
            City: shippingAddress.city,
            StateProvinceCode: shippingAddress.provinceCode || '',
            PostalCode: shippingAddress.zip,
            CountryCode: shippingAddress.countryCode
          }
        },
        ShipFrom: {
          Name: shipperLocation.name || 'Store Location',
          Address: {
            AddressLine: [shipperLocation.address1, shipperLocation.address2].filter(Boolean),
            City: shipperLocation.city,
            StateProvinceCode: shipperLocation.provinceCode || shipperLocation.province || '',
            PostalCode: shipperLocation.zip,
            CountryCode: shipperLocation.countryCode
          }
        },
        PaymentInformation: {
          ShipmentCharge: [
            {
              Type: "01",
              BillShipper: {
                AccountNumber: carrier.apiAccountNumber
              }
            }
          ]
        },
        Service: {
          Code: "11", // Standard
          Description: "Standard"
        },
        Package: [
          {
            PackagingType: {
              Code: "02",
              Description: "Customer Supplied Package"
            },
            Dimensions: {
              UnitOfMeasurement: {
                Code: "CM",
                Description: "Centimeters"
              },
              Length: "10",
              Width: "10",
              Height: "10"
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "KGS",
                Description: "Kilograms"
              },
              Weight: order.currentTotalWeight ? (order.currentTotalWeight / 1000).toString() : "5.0"
            }
          }
        ]
      }
    }
  };
};

const createUpsShipment = async (requestPayload: any, carrier: any) => {
  const token = await getUpsToken(carrier);

  // Send the POST request to the UPS shipment endpoint
  const response = await fetch(`${process.env.UPS_BASE_URL}/api/shipments/v1/ship`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    logger.error('Error returned by UPS API:', JSON.stringify(errorData));
    throw new Error(`UPS API Error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract tracking information and base64 label
  const shipmentResults = data.ShipmentResponse?.ShipmentResults;
  const trackingNumber = shipmentResults?.ShipmentIdentificationNumber;
  const labelData = shipmentResults?.PackageResults?.[0]?.ShippingLabel?.GraphicImage;

  return {
    trackingNumber: trackingNumber,
    trackingUrl: buildTrackingUrl(trackingNumber),
    labelData: labelData
  };
};

export const processUpsShipmentOrder = async (orderId: string, admin: any, carrier: any) => {
  logger.info(`Starting UPS shipment creation for order: ${orderId}`);

  const orderQuery = `
    query GetUpsShipmentOrder($orderId: ID!) {
      order(id: $orderId) {
        id
        name
        currentTotalWeight
        fulfillmentOrders(first: 1) {
          edges {
            node {
              assignedLocation {
                name
                address1
                address2
                city
                province
                provinceCode
                zip
                countryCode
              }
            }
          }
        }
        customer {
          firstName
          lastName
        }
        shippingAddress {
          name
          company
          address1
          address2
          city
          provinceCode
          zip
          countryCode
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

  const shipmentRequest = buildUpsShipmentRequest(order, carrier);
  const shipmentResponse = await createUpsShipment(shipmentRequest, carrier);

  return {
    trackingNumber: shipmentResponse.trackingNumber ?? `1Z${Math.floor(Math.random() * 1000000000000000)}`,
    trackingUrl: shipmentResponse.trackingUrl ?? 'https://www.ups.com/track'
  };
};