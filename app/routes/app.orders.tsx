import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// GraphQL query to fetch open and unfulfilled orders
const UNFULFILLED_ORDERS_QUERY = `
  query GetUnfulfilledOrders {
    orders(first: 50, query: "fulfillment_status:unfulfilled status:open", sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          customer {
            firstName
            lastName
          }
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    // Execute the GraphQL query
    const response = await admin.graphql(UNFULFILLED_ORDERS_QUERY);
    const responseJson = await response.json();

    // Extract the order nodes from the GraphQL edges
    const orders = responseJson.data.orders.edges.map((edge: any) => edge.node);

    console.log(`Successfully fetched ${orders.length} unfulfilled orders.`);
    return json({ orders });
  } catch (error) {
    console.error("Error fetching unfulfilled orders:", error);
    return json({ orders: [] });
  }
}

export default function UnfulfilledOrders() {
  const { orders } = useLoaderData<typeof loader>();

  // Map financial status to Portuguese badges
  const renderFinancialStatus = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge tone="success">Pago</Badge>;
      case 'PENDING':
        return <Badge tone="attention">Pendente</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge tone="info">Parcialmente Pago</Badge>;
      case 'REFUNDED':
        return <Badge>Reembolsado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const rowMarkup = orders.map(
    ({ id, name, createdAt, displayFinancialStatus, customer, currentTotalPriceSet }: any, index: number) => {
      const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Cliente não identificado';
      const date = new Date(createdAt).toLocaleDateString('pt-PT');
      const price = parseFloat(currentTotalPriceSet.shopMoney.amount).toFixed(2);
      const currency = currentTotalPriceSet.shopMoney.currencyCode;

      return (
        <IndexTable.Row id={id} key={id} position={index}>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {name}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{date}</IndexTable.Cell>
          <IndexTable.Cell>{customerName}</IndexTable.Cell>
          <IndexTable.Cell>
            {renderFinancialStatus(displayFinancialStatus)}
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" alignment="end">
              {price} {currency}
            </Text>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  return (
    <Page title="Encomendas por Processar">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {orders.length === 0 ? (
              <EmptyState
                heading="Sem encomendas pendentes"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/empty-state-cards_customer-delivery-service.svg"
              >
                <p>Todas as encomendas foram processadas com sucesso.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: 'encomenda', plural: 'encomendas' }}
                itemCount={orders.length}
                headings={[
                  { title: 'Encomenda' },
                  { title: 'Data' },
                  { title: 'Cliente' },
                  { title: 'Estado Financeiro' },
                  { title: 'Total' },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}