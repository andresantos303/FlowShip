import logger from '../utils/logger';

export async function processShippingAndFulfillOrder(
  orderId: string, 
  carrierName: string,
  admin: any
) {
  try {
    // 1. Fetch the fulfillment order ID required to fulfill items in Shopify
    const fulfillmentOrderQuery = `
      query GetFulfillmentOrder($orderId: ID!) {
        order(id: $orderId) {
          fulfillmentOrders(first: 1, query: "status:OPEN") {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `;
    console.log("entrou")
    const response = await admin.graphql(fulfillmentOrderQuery, {
      variables: { orderId }
    });
    const responseJson = await response.json();
    const fulfillmentOrders = responseJson.data.order.fulfillmentOrders.edges;

    if (fulfillmentOrders.length === 0) {
      console.warn("No open fulfillment orders found for order:", orderId);
      return { success: false, message: "Order is already fulfilled or invalid." };
    }

    const fulfillmentOrderId = fulfillmentOrders[0].node.id;
    let trackingNumber = "";
    let trackingUrl = "";

    // 2. Route the logic based on the carrier type
    if (carrierName === "FedEx") {
      console.log("Processing FedEx API integration for order:", orderId);
      
      // Step A: Check delivery feasibility via FedEx API
      const isPossible = await checkFedExAvailability(orderId);
      
      if (!isPossible) {
        console.error("FedEx delivery is not available for this address.");
        return { success: false, message: "Delivery not available via FedEx." };
      }

      // Step B: Generate the shipping label and extract the tracking information
      const fedexResponse = await generateFedExLabel(orderId);
      trackingNumber = fedexResponse.trackingNumber;
      trackingUrl = fedexResponse.trackingUrl;
      
      console.log("Successfully generated FedEx label. Tracking Number:", trackingNumber);

    } else {
      // Logic for manual carriers (e.g., CTT, local delivery)
      console.log(`Processing manual rules for carrier: ${carrierName}`);
      
      // Create an internal generic label or assign a pre-allocated tracking number
      const manualResponse = await processManualCarrierLabel(orderId, carrierName);
      
      // Tracking details might be empty initially and added later by the merchant
      trackingNumber = manualResponse.trackingNumber || "";
      trackingUrl = manualResponse.trackingUrl || "";
      
      console.log("Processed manual carrier routing. Awaiting physical dispatch.");
    }

    // 3. Fulfill the order in Shopify with the tracking details
    const fulfillmentMutation = `
      mutation CreateFulfillment($fulfillmentOrderId: ID!, $trackingInfo: FulfillmentTrackingInput!) {
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

    const fulfillmentResponse = await admin.graphql(fulfillmentMutation, {
      variables: {
        fulfillmentOrderId,
        trackingInfo: {
          number: trackingNumber,
          url: trackingUrl,
          company: carrierName
        }
      }
    });

    const fulfillmentJson = await fulfillmentResponse.json();
    const errors = fulfillmentJson.data.fulfillmentCreateV2.userErrors;

    if (errors && errors.length > 0) {
      console.error("Failed to fulfill order in Shopify:", errors);
      return { success: false, errors };
    }

    console.log("Order successfully fulfilled in Shopify.");
    return { success: true, trackingNumber };

  } catch (error) {
    console.error("Unexpected error during shipping label generation:", error);
    return { success: false, message: "Internal system error." };
  }
}

// Mock functions to represent the isolated logic blocks
async function checkFedExAvailability(orderId: string): Promise<boolean> {
  // Implement FedEx availability API call here
  return true;
}

async function generateFedExLabel(orderId: string) {
  // Implement FedEx label generation API call here
  return {
    trackingNumber: "FDX" + Math.floor(Math.random() * 1000000000),
    trackingUrl: "https://www.fedex.com/fedextrack/?trknbr="
  };
}

async function processManualCarrierLabel(orderId: string, carrierName: string) {
  // Implement internal PDF generation or DB export logic here
  return {
    trackingNumber: "", // Empty until the merchant adds it manually
    trackingUrl: ""
  };
}