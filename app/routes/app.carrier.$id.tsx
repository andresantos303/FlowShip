import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Text,
  IndexTable,
  InlineStack,
  Banner,
  Divider,
  InlineGrid
} from "@shopify/polaris";
import { useState, useCallback, useMemo, useEffect } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const carrier = await prisma.carrier.findUnique({
    where: { id, shopDomain: session.shop },
    include: { rates: true }
  });

  if (!carrier) {
    throw new Response("Carrier not found", { status: 404 });
  }

  const zones = await prisma.postalRule.findMany({
    where: { shopDomain: session.shop },
    select: { groupName: true },
    distinct: ['groupName'],
  });

  return json({ carrier, zones });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id: carrierId } = params;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "UPDATE_CARRIER") {
    const calculationMethod = formData.get("calculationMethod") as string;
    
    await prisma.carrier.update({
      where: { id: carrierId, shopDomain: session.shop },
      data: {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        isActive: formData.get("isActive") === "true",
        // Campos de API (apenas se o método for API)
        apiKey: formData.get("apiKey") as string || null,
        apiSecret: formData.get("apiSecret") as string || null,
        apiAccountNumber: formData.get("apiAccountNumber") as string || null,
        apiUrlRates: formData.get("apiUrlRates") as string || null,
        apiUrlAvailability: formData.get("apiUrlAvailability") as string || null,
        markupType: formData.get("markupType") as string || null,
        markupValue: formData.get("markupValue") ? parseFloat(formData.get("markupValue") as string) : null,
      }
    });
  }

  if (actionType === "ADD_RATE") {
    await prisma.carrierRate.create({
      data: {
        carrierId: carrierId!,
        groupName: formData.get("groupName") as string,
        maxWeight: parseFloat(formData.get("maxWeight") as string),
        price: parseFloat(formData.get("price") as string),
        deliveryTime: parseInt(formData.get("deliveryTime") as string, 10),
      }
    });
  }

  if (actionType === "DELETE_RATE") {
    await prisma.carrierRate.delete({
      where: { id: formData.get("rateId") as string }
    });
  }

  return json({ success: true });
};

export default function CarrierDetails() {
  const { carrier, zones } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Estado da Transportadora
  const [name, setName] = useState(carrier.name);
  const [description, setDescription] = useState(carrier.description);
  const [isActive, setIsActive] = useState(carrier.isActive ? "true" : "false");

  // Estado da API
  const [apiKey, setApiKey] = useState(carrier.apiKey || "");
  const [apiSecret, setApiSecret] = useState(carrier.apiSecret || "");
  const [apiAccountNumber, setApiAccountNumber] = useState(carrier.apiAccountNumber || "");
  const [apiUrlRates, setApiUrlRates] = useState(carrier.apiUrlRates || "");
  const [apiUrlAvailability, setApiUrlAvailability] = useState(carrier.apiUrlAvailability || "");
  const [markupType, setMarkupType] = useState(carrier.markupType || "PERCENTAGE");
  const [markupValue, setMarkupValue] = useState(carrier.markupValue?.toString() || "0");

  // Estado para novas tarifas (apenas para o método TABLE)
  const [selectedZone, setSelectedZone] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("3");

  const zoneOptions = useMemo(() => [
    { label: 'Selecionar Zona', value: '' },
    ...zones.map(z => ({ label: z.groupName, value: z.groupName }))
  ], [zones]);

  const handleUpdateCarrier = () => {
    const formData = new FormData();
    formData.append("actionType", "UPDATE_CARRIER");
    formData.append("name", name);
    formData.append("description", description);
    formData.append("isActive", isActive);
    formData.append("calculationMethod", carrier.calculationMethod);
    
    if (carrier.calculationMethod === 'API') {
      formData.append("apiKey", apiKey);
      formData.append("apiSecret", apiSecret);
      formData.append("apiAccountNumber", apiAccountNumber);
      formData.append("apiUrlRates", apiUrlRates);
      formData.append("apiUrlAvailability", apiUrlAvailability);
      formData.append("markupType", markupType);
      formData.append("markupValue", markupValue);
    }
    
    submit(formData, { method: "POST" });
  };

  const handleAddRate = () => {
    const formData = new FormData();
    formData.append("actionType", "ADD_RATE");
    formData.append("groupName", selectedZone);
    formData.append("maxWeight", maxWeight);
    formData.append("price", price);
    formData.append("deliveryTime", deliveryTime);
    submit(formData, { method: "POST" });
    setPrice("");
    setMaxWeight("");
  };

  return (
    <Page 
      title={`Editar: ${carrier.name}`}
      backAction={{ content: 'Transportadoras', url: '/app' }}
      primaryAction={{
        content: 'Guardar Alterações',
        onAction: handleUpdateCarrier,
        loading: isSubmitting
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Configurações Gerais</Text>
              <FormLayout>
                <TextField label="Nome" value={name} onChange={setName} autoComplete="off" />
                <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
                <Select
                  label="Estado"
                  options={[{label: 'Ativo', value: 'true'}, {label: 'Inativo', value: 'false'}]}
                  value={isActive}
                  onChange={setIsActive}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {carrier.calculationMethod === 'API' ? (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Configurações da API</Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                    <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                  </FormLayout.Group>
                  <TextField label="Account Number" value={apiAccountNumber} onChange={setApiAccountNumber} autoComplete="off" />
                  <TextField label="URL de Cálculo (Rates)" value={apiUrlRates} onChange={setApiUrlRates} autoComplete="off" />
                  <TextField label="URL de Disponibilidade" value={apiUrlAvailability} onChange={setApiUrlAvailability} autoComplete="off" />
                  
                  <Divider />
                  <Text variant="headingSm" as="h3">Margem de Lucro (*Markup*)</Text>
                  <FormLayout.Group>
                    <Select
                      label="Tipo de Taxa"
                      options={[{label: 'Percentagem (%)', value: 'PERCENTAGE'}, {label: 'Valor Fixo (€)', value: 'ABSOLUTE'}]}
                      value={markupType}
                      onChange={setMarkupType}
                    />
                    <TextField label="Valor" type="number" value={markupValue} onChange={setMarkupValue} autoComplete="off" />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        ) : (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Adicionar Escalão de Preço</Text>
                  {zones.length === 0 && (
                    <Banner tone="warning">
                      <p>Cria zonas primeiro na página de Gestão de Zonas.</p>
                    </Banner>
                  )}
                  <FormLayout>
                    <InlineGrid columns={2} gap="400">
                      <Select label="Zona" options={zoneOptions} value={selectedZone} onChange={setSelectedZone} />
                      <TextField label="Peso Máximo (Kg)" type="number" value={maxWeight} onChange={setMaxWeight} autoComplete="off" />
                    </InlineGrid>
                    <InlineGrid columns={2} gap="400">
                      <TextField label="Preço (€)" type="number" value={price} onChange={setPrice} autoComplete="off" prefix="€" />
                      <TextField label="Entrega (Dias)" type="number" value={deliveryTime} onChange={setDeliveryTime} autoComplete="off" />
                    </InlineGrid>
                    <InlineStack align="end">
                      <Button variant="primary" onClick={handleAddRate} disabled={!selectedZone || !price || !maxWeight}>
                        Adicionar Tarifa
                      </Button>
                    </InlineStack>
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card padding="0">
                <IndexTable
                  resourceName={{ singular: "tarifa", plural: "tarifas" }}
                  itemCount={carrier.rates.length}
                  headings={[{ title: "Zona" }, { title: "Peso Máx" }, { title: "Preço" }, { title: "Entrega" }, { title: "" }]}
                  selectable={false}
                >
                  {carrier.rates.map((rate, index) => (
                    <IndexTable.Row id={rate.id} key={rate.id} position={index}>
                      <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{rate.groupName}</Text></IndexTable.Cell>
                      <IndexTable.Cell>{rate.maxWeight} kg</IndexTable.Cell>
                      <IndexTable.Cell>{rate.price} €</IndexTable.Cell>
                      <IndexTable.Cell>{rate.deliveryTime} dias</IndexTable.Cell>
                      <IndexTable.Cell>
                        <Button tone="critical" variant="plain" onClick={() => {
                          const formData = new FormData();
                          formData.append("actionType", "DELETE_RATE");
                          formData.append("rateId", rate.id);
                          submit(formData, { method: "POST" });
                        }}>Eliminar</Button>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Card>
            </Layout.Section>
          </>
        )}
      </Layout>
    </Page>
  );
}