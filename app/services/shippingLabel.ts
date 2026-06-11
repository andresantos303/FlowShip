import logger from '../utils/logger';
import { generateFedExLabel } from '../utils/shipping/fedexShipping';

export async function processShippingAndFulfillOrder(
  orderId: string, 
  carrierName: string,
  admin: any
) {
  try {
    logger.info(`Starting fulfillment process for order: ${orderId} with carrier: ${carrierName}`);

    // 1. Fetch the fulfillment order ID and its status
    const fulfillmentOrderQuery = `
      query GetFulfillmentOrder($orderId: ID!) {
        order(id: $orderId) {
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
              }
            }
          }
        }
      }
    `;
    
    const response = await admin.graphql(fulfillmentOrderQuery, {
      variables: { orderId }
    });
    
    const responseJson = await response.json();
    const fulfillmentOrders = responseJson.data.order.fulfillmentOrders.edges;

    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      logger.warn(`No fulfillment orders found for order ID: ${orderId}`);
      return { success: false, message: "Order not found or has no fulfillment orders." };
    }

    // Filter for IN_PROGRESS status as requested
    const targetFulfillment = fulfillmentOrders.find(
      (edge: any) => edge.node.status === "IN_PROGRESS"
    );

    if (!targetFulfillment) {
      logger.warn(`Order ${orderId} does not have an IN_PROGRESS fulfillment status.`);
      return { success: false, message: "Order is not in 'IN_PROGRESS' state." };
    }

    const fulfillmentOrderId = targetFulfillment.node.id;
    let trackingInfo = null; // Stays null for manual processing

    // Route the logic based on the carrier type
    if (carrierName.includes("FedEx")) {
      logger.info(`Processing FedEx automated label for order: ${orderId}`);

      const fedexResponse = await generateFedExLabel(orderId,admin);
      
      // Populate tracking info for FedEx
      trackingInfo = {
        number: fedexResponse.trackingNumber,
        url: fedexResponse.trackingUrl,
        company: carrierName
      };
      
      logger.info(`Successfully generated FedEx label. Tracking Number: ${fedexResponse.trackingNumber}`);

    } else {
      logger.info(`Processing manual carrier (${carrierName}). Marking as fulfilled.`);
      
      // trackingInfo remains null here, so the tracking number can be filled later in the Shopify Admin
    }

    // Fulfill the order in Shopify
    // Notice that $trackingInfo is now optional in the mutation
    const fulfillmentMutation = `
      mutation CreateFulfillment($fulfillmentOrderId: ID!, $trackingInfo: FulfillmentTrackingInput) {
        fulfillmentCreateV2(
          fulfillment: {
            lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: $fulfillmentOrderId }]
            notifyCustomer: true
            trackingInfo: $trackingInfo
          }
        ) {
          fulfillment {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const mutationVariables: any = { fulfillmentOrderId };
    if (trackingInfo) {
      mutationVariables.trackingInfo = trackingInfo;
    }

    const fulfillmentResponse = await admin.graphql(fulfillmentMutation, {
      variables: mutationVariables
    });

    const fulfillmentJson = await fulfillmentResponse.json();
    const errors = fulfillmentJson.data.fulfillmentCreateV2.userErrors;

    if (errors && errors.length > 0) {
      logger.error(`Failed to fulfill order ${orderId} in Shopify: ${JSON.stringify(errors)}`);
      return { success: false, errors };
    }

    logger.info(`Order ${orderId} successfully fulfilled in Shopify.`);
    
    return { 
      success: true, 
      trackingNumber: trackingInfo ? trackingInfo.number : "Pending Manual Entry",
    };

  } catch (error) {
    logger.error(`Unexpected error during shipping label generation for order ${orderId}: ${error}`);
    return { success: false, message: "Internal system error." };
  }
}