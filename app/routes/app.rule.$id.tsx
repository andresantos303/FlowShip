import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Button,
  BlockStack, Text, IndexTable, InlineStack
} from "@shopify/polaris";
import { useState } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  // Retrieve rule data with its associated weights and the parent carrier info
  const rule = await prisma.rule.findUnique({
    where: { id },
    include: {
      rates: true,
      carrier: true,
    }
  });

  if (!rule || rule.carrier.shopDomain !== session.shop) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ rule });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id: ruleId } = params;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  // 1. Create a new shipping rate tier
  if (actionType === "CREATE_RATE") {
    await prisma.rate.create({
      data: {
        ruleId: ruleId!,
        maxWeight: parseFloat(formData.get("maxWeight") as string),
        price: parseFloat(formData.get("price") as string),
        deliveryTime: parseInt(formData.get("deliveryTime") as string, 10),
      }
    });
  }

  // 2. Update an existing shipping rate tier
  if (actionType === "UPDATE_RATE") {
    await prisma.rate.update({
      where: { id: formData.get("rateId") as string },
      data: {
        maxWeight: parseFloat(formData.get("maxWeight") as string),
        price: parseFloat(formData.get("price") as string),
        deliveryTime: parseInt(formData.get("deliveryTime") as string, 10),
      }
    });
  }

  // 3. Delete a specific shipping rate tier
  if (actionType === "DELETE_RATE") {
    await prisma.rate.delete({
      where: { id: formData.get("rateId") as string }
    });
  }

  return json({ success: true });
};

export default function RuleRatesManage() {
  const { rule } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Creation form state
  const [newWeight, setNewWeight] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newTime, setNewTime] = useState("3");

  // Inline editing row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTime, setEditTime] = useState("");

  const handleAction = (type: string, data: any) => {
    const fd = new FormData();
    fd.append("actionType", type);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v as string));
    submit(fd, { method: "POST" });
  };

  const startEditing = (rate: any) => {
    setEditingId(rate.id);
    setEditWeight(rate.maxWeight.toString());
    setEditPrice(rate.price.toString());
    setEditTime(rate.deliveryTime.toString());
  };

  return (
    <Page 
      title={`Tarifas: ${rule.country} (${rule.postalCodeRange})`}
      backAction={{ url: `/app/carrier/${rule.carrierId}` }}
    >
      <Layout>
        {/* Form to add a new rate */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Adicionar Novo Escalão de Preço</Text>
              <FormLayout>
                <FormLayout.Group>
                  <TextField label="Peso Máximo (Kg)" type="number" value={newWeight} onChange={setNewWeight} autoComplete="off" />
                  <TextField label="Preço (€)" type="number" value={newPrice} onChange={setNewPrice} autoComplete="off" />
                  <TextField label="Prazo de Entrega (Dias)" type="number" value={newTime} onChange={setNewTime} autoComplete="off" />
                </FormLayout.Group>
                <InlineStack align="end">
                  <Button 
                    variant="primary"
                    disabled={!newWeight || !newPrice || !newTime}
                    loading={isSubmitting && !editingId}
                    onClick={() => {
                      handleAction("CREATE_RATE", { maxWeight: newWeight, price: newPrice, deliveryTime: newTime });
                      setNewWeight("");
                      setNewPrice("");
                    }}
                  >
                    Adicionar Tarifa
                  </Button>
                </InlineStack>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* List and inline edit configured rates */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Escalões de Peso Configurados</Text>
              {rule.rates.length === 0 ? (
                <Text variant="bodyMd" as="p" tone="subdued">Nenhuma tarifa configurada para esta regra geográfica.</Text>
              ) : (
                <IndexTable 
                  resourceName={{ singular: 'tarifa', plural: 'tarifas' }} 
                  itemCount={rule.rates.length} 
                  headings={[{ title: 'Peso Máximo' }, { title: 'Preço' }, { title: 'Tempo de Entrega' }, { title: 'Ações' }]} 
                  selectable={false}
                >
                  {rule.rates.map((rate, i) => {
                    const isEditing = editingId === rate.id;
                    return (
                      <IndexTable.Row id={rate.id} key={rate.id} position={i}>
                        <IndexTable.Cell>
                          {isEditing ? (
                            <div style={{ maxWidth: '150px' }}>
                                <TextField label="Weight" labelHidden type="number" value={editWeight} onChange={setEditWeight} autoComplete="off" suffix="Kg" />
                            </div>
                          ) : (
                            `${rate.maxWeight} Kg`
                          )}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {isEditing ? (
                            <div style={{ maxWidth: '150px' }}>
                              <TextField label="Price" labelHidden type="number" value={editPrice} onChange={setEditPrice} autoComplete="off" suffix="€" />
                            </div>
                          ) : (
                            `${rate.price.toFixed(2)}€`
                          )}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {isEditing ? (
                            <div style={{ maxWidth: '150px' }}>
                              <TextField label="Delivery Time" labelHidden type="number" value={editTime} onChange={setEditTime} autoComplete="off" suffix="Dias"/>
                            </div>
                          ) : (
                            `${rate.deliveryTime} Dias`
                          )}
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          {isEditing ? (
                            <InlineStack gap="200">
                              <Button 
                                variant="primary" 
                                loading={isSubmitting}
                                onClick={() => {
                                  handleAction("UPDATE_RATE", { rateId: rate.id, maxWeight: editWeight, price: editPrice, deliveryTime: editTime });
                                  setEditingId(null);
                                }}
                              >
                                Guardar
                              </Button>
                              <Button onClick={() => setEditingId(null)}>Cancelar</Button>
                            </InlineStack>
                          ) : (
                            <InlineStack gap="200">
                              <Button variant="plain" onClick={() => startEditing(rate)}>Editar</Button>
                              <Button tone="critical" variant="plain" onClick={() => handleAction("DELETE_RATE", { rateId: rate.id })}>Remover</Button>
                            </InlineStack>
                          )}
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    );
                  })}
                </IndexTable>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}