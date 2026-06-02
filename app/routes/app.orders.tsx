import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  EmptyState,
  Popover,
  ActionList,
  Button,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { processShippingAndFulfillOrder } from "../services/shippingLabel";

// GraphQL query to fetch open and unfulfilled orders with additional fields
const UNFULFILLED_ORDERS_QUERY = `
  query GetUnfulfilledOrders {
    orders(first: 50, query: "status:open", sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
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
          lineItems(first: 50) {
            edges {
              node {
                quantity
              }
            }
          }
          shippingLines(first: 1) {
            edges {
              node {
                title
              }
            }
          }
          tags
        }
      }
    }
  }
`;

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(UNFULFILLED_ORDERS_QUERY);
    const responseJson = await response.json();
    const storeName = session.shop.split('.')[0];
    const orders = responseJson.data.orders.edges.map((edge: any) => edge.node);

    return json({ orders, storeName });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return json({ orders: [], storeName: "" });
  }
}

// Form action to handle client submissions securely on the server
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const actionType = formData.get("actionType");

  if (actionType === "generateLabels") {
    try {
      const ordersPayload = formData.get("orders") as string;
      const selectedOrders = JSON.parse(ordersPayload);

      console.log(`Starting bulk action for ${selectedOrders.length} orders.`);

      // Pass the array of orders and the admin object to the service
      const results = await Promise.all(
        selectedOrders.map((order: any) => processShippingAndFulfillOrder(order.id, order.shippingLines?.edges?.[0]?.node?.title, admin))
      );

      return json({ 
        success: true, 
        actionType: "generateLabels", 
        results 
      });
    } catch (error) {
      console.error("Bulk label generation failed:", error);
      return json({ 
        success: false, 
        message: "Failed to process shipping labels." 
      }, { status: 500 });
    }
  }

  return json({ success: false, message: "Invalid action." }, { status: 400 });
}

export default function UnfulfilledOrders() {
  const { orders, storeName } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();

  // Track which row's action menu popover is currently open
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  // Manage row selection state based on the raw orders list
  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(orders);

  // Monitor actionData to show a toast when the server responds
  useEffect(() => {
    if (actionData && actionData.actionType === "generateLabels") {
      if (actionData.success && actionData.results) {
        const successCount = actionData.results.filter((r: any) => r.success).length;
        const total = actionData.results.length;
        
        shopify.toast.show(`${successCount} de ${total} etiquetas geradas com sucesso.`, {
          isError: successCount === 0,
          duration: 3000
        });

        clearSelection();
      } else {
        shopify.toast.show(actionData.message || "Ocorreu um erro no servidor.", {
          isError: true
        });
      }
    }
  }, [actionData, clearSelection]);

  // Map financial status to Portuguese badges
  const renderFinancialStatus = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge tone="success">Pago</Badge>;
      case 'PENDING': return <Badge tone="attention">Pendente</Badge>;
      case 'PARTIALLY_PAID': return <Badge tone="info">Parcialmente Pago</Badge>;
      case 'REFUNDED': return <Badge>Reembolsado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // Map fulfillment status to Portuguese badges
  const renderFulfillmentStatus = (status: string) => {
    switch (status) {
      case 'UNFULFILLED': return <Badge tone="attention">Por processar</Badge>;
      case 'FULFILLED': return <Badge tone="success">Processado</Badge>;
      case 'IN_PROGRESS': return <Badge tone="info">Em progresso</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  // Define bulk actions available when rows are selected
  const promotedBulkActions = [
    {
      content: "Gerar etiquetas de envios",
      onAction: () => {
        // Filter the full order objects based on the selected IDs in the table
        const ordersToProcess = orders.filter((o: any) => selectedResources.includes(o.id));
        
        const formData = new FormData();
        formData.append("actionType", "generateLabels");
        formData.append("orders", JSON.stringify(ordersToProcess));

        submit(formData, { method: "post" });
      },
    },
  ];

  const rowMarkup = orders.map((order: any, index: number) => {
    const {
      id,
      name,
      createdAt,
      displayFinancialStatus,
      displayFulfillmentStatus,
      customer,
      currentTotalPriceSet,
      lineItems,
      shippingLines,
      tags,
    } = order;

    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "Cliente não identificado";
    const dateObj = new Date(createdAt);
    const dateTimeString = `${dateObj.toLocaleDateString("pt-PT")} às ${dateObj.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
    const price = parseFloat(currentTotalPriceSet.shopMoney.amount).toFixed(2);
    const currency = currentTotalPriceSet.shopMoney.currencyCode;
    const totalItems = lineItems?.edges?.reduce((acc: number, edge: any) => acc + edge.node.quantity, 0) || 0;
    const itemsText = totalItems === 1 ? "1 artigo" : `${totalItems} artigos`;
    const deliveryMethod = shippingLines?.edges?.[0]?.node?.title || "Não definido";

    return (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        selected={selectedResources.includes(id)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">{name}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{dateTimeString}</IndexTable.Cell>
        <IndexTable.Cell>{customerName}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" numeric>{price} {currency}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{renderFinancialStatus(displayFinancialStatus)}</IndexTable.Cell>
        <IndexTable.Cell>{renderFulfillmentStatus(displayFulfillmentStatus)}</IndexTable.Cell>
        <IndexTable.Cell>{itemsText}</IndexTable.Cell>
        <IndexTable.Cell>{deliveryMethod}</IndexTable.Cell>
        <IndexTable.Cell>
          {tags && tags.length > 0 ? (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {tags.map((tag: string) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          ) : (
            <Text as="span" tone="subdued">-</Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div onClick={(e) => e.stopPropagation()}>
            <Popover
              active={activePopoverId === id}
              activator={
                <Button
                  icon={MenuHorizontalIcon}
                  variant="tertiary"
                  onClick={() => setActivePopoverId(activePopoverId === id ? null : id)}
                />
              }
              onClose={() => setActivePopoverId(null)}
            >
              <ActionList
                actionRole="menuitem"
                items={[
                  {
                    content: "Ver encomenda",
                    onAction: () => {
                      const orderNumericId = id.split('/').pop();
                      window.open(`https://admin.shopify.com/store/${storeName}/orders/${orderNumericId}`, "_blank");
                      setActivePopoverId(null);
                    },
                  },
                  {
                    content: "Gerar etiqueta de envio",
                    onAction: () => {
                      // Find the specific order and send it as an array to reuse the bulk action logic
                      const orderToProcess = orders.find((o: any) => o.id === id);
                      
                      const formData = new FormData();
                      formData.append("actionType", "generateLabels");
                      formData.append("orders", JSON.stringify([orderToProcess]));
                      
                      submit(formData, { method: "post" });
                      setActivePopoverId(null);
                    },
                  },
                ]}
              />
            </Popover>
          </div>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page title="Encomendas" fullWidth>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {orders.length === 0 ? (
              <EmptyState
                heading="Nenhuma encomenda encontrada"
                image=""
              >
                <p>Neste momento não existem encomendas por processar.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "encomenda", plural: "encomendas" }}
                itemCount={orders.length}
                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                promotedBulkActions={promotedBulkActions}
                headings={[
                  { title: "Encomenda" },
                  { title: "Data" },
                  { title: "Cliente" },
                  { title: "Total", alignment: "end" },
                  { title: "Estado Financeiro" },
                  { title: "Estado do Processamento" },
                  { title: "Artigos" },
                  { title: "Método de Entrega" },
                  { title: "Etiquetas" },
                  { title: "Ações", hidden: true },
                ]}
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