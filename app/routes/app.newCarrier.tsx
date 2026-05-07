import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, FormLayout, TextField,
  Select, Button, Text, InlineGrid, Divider, ChoiceList
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Action to save the new carrier to the database
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const calculationMethod = formData.get("calculationMethod") as string;
  
  // Extract API fields
  const apiKey = formData.get("apiKey") as string | null;
  const apiSecret = formData.get("apiSecret") as string | null;
  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue") || 0);

  // Extract Table fields (simplified array parsing for this example)
  const rawRates = formData.get("ratesData") as string;
  const ratesData = rawRates ? JSON.parse(rawRates) : [];

  // Create the carrier in Prisma
  await prisma.carrier.create({
    data: {
      shopDomain: session.shop,
      name,
      calculationMethod,
      apiKey: calculationMethod === 'API' ? apiKey : null,
      apiSecret: calculationMethod === 'API' ? apiSecret : null,
      markupType: calculationMethod === 'API' ? markupType : null,
      markupValue: calculationMethod === 'API' ? markupValue : null,
      rates: calculationMethod === 'TABLE' ? {
        create: ratesData.map((rate: any) => ({
          countryCode: rate.country,
          postalCodeStart: rate.postalStart,
          postalCodeEnd: rate.postalEnd,
          maxWeight: Number(rate.weight),
          maxVolume: Number(rate.volume),
          price: Number(rate.price)
        }))
      } : undefined
    }
  });

  return json({ success: true });
}

export default function CreateCarrier() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSaving = navigation.state === "submitting";

  // General state
  const [name, setName] = useState("");
  const [method, setMethod] = useState(["TABLE"]); // Default to Table

  // API state
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [markupType, setMarkupType] = useState("PERCENTAGE");
  const [markupValue, setMarkupValue] = useState("");

  // Table state (Dynamic rows)
  const [rates, setRates] = useState([
    { id: Date.now(), country: "PT", postalStart: "", postalEnd: "", weight: "", volume: "", price: "" }
  ]);

  // Show success toast
  useEffect(() => {
    if (actionData?.success) {
      // Use any to bypass TypeScript if shopify global is not typed
      (window as any).shopify.toast.show('Transportadora criada com sucesso!');
      // Reset form
      setName("");
      setMethod(["TABLE"]);
    }
  }, [actionData]);

  // Handle dynamic table changes
  const updateRate = (id: number, field: string, value: string) => {
    setRates(rates.map(rate => rate.id === id ? { ...rate, [field]: value } : rate));
  };

  const addRateRow = () => {
    setRates([...rates, { id: Date.now(), country: "", postalStart: "", postalEnd: "", weight: "", volume: "", price: "" }]);
  };

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("calculationMethod", method[0]);

    if (method[0] === 'API') {
      formData.append("apiKey", apiKey);
      formData.append("apiSecret", apiSecret);
      formData.append("markupType", markupType);
      formData.append("markupValue", markupValue);
    } else {
      formData.append("ratesData", JSON.stringify(rates));
    }

    submit(formData, { method: "post" });
  }, [name, method, apiKey, apiSecret, markupType, markupValue, rates, submit]);

  return (
    <Page
      title="Criar Nova Transportadora"
      backAction={{ content: 'Voltar', url: '/app' }}
      primaryAction={{
        content: 'Guardar Transportadora',
        onAction: handleSave,
        loading: isSaving,
        disabled: !name
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Informação Geral */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Detalhes da Transportadora</Text>
                <FormLayout>
                  <TextField
                    label="Nome da Transportadora"
                    value={name}
                    onChange={setName}
                    autoComplete="off"
                    placeholder="Ex: CTT Expresso"
                  />
                  <ChoiceList
                    title="Método de Cálculo de Tarifas"
                    choices={[
                      { label: 'Tabela de Preços Manual', value: 'TABLE' },
                      { label: 'Cálculo Dinâmico (Via API)', value: 'API' },
                    ]}
                    selected={method}
                    onChange={setMethod}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Configuração via API */}
            {method[0] === 'API' && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Credenciais da API</Text>
                  <FormLayout>
                    <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                    <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                    
                    <Divider />
                    
                    <Text variant="headingSm" as="h3">Margem de Lucro (Markup)</Text>
                    <FormLayout.Group>
                      <Select
                        label="Tipo de Taxa"
                        options={[
                          { label: 'Percentagem (%)', value: 'PERCENTAGE' },
                          { label: 'Valor Fixo (€)', value: 'ABSOLUTE' },
                        ]}
                        value={markupType}
                        onChange={setMarkupType}
                      />
                      <TextField
                        label="Valor"
                        type="number"
                        value={markupValue}
                        onChange={setMarkupValue}
                        autoComplete="off"
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>
            )}

            {/* Configuração via Tabela Manual */}
            {method[0] === 'TABLE' && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Tabela de Preços Acordados</Text>
                  <Text variant="bodyMd" as="p">
                    Define as regras de preço baseadas no destino, peso e volume.
                  </Text>
                  
                  {rates.map((rate, index) => (
                    <div key={rate.id} style={{ padding: '16px', background: '#f4f6f8', borderRadius: '8px' }}>
                      <BlockStack gap="300">
                        <Text variant="headingSm" as="h3">Regra #{index + 1}</Text>
                        <InlineGrid columns={3} gap="400">
                          <TextField label="País" value={rate.country} onChange={(v) => updateRate(rate.id, 'country', v)} autoComplete="off" />
                          <TextField label="Cód. Postal (Início)" value={rate.postalStart} onChange={(v) => updateRate(rate.id, 'postalStart', v)} autoComplete="off" />
                          <TextField label="Cód. Postal (Fim)" value={rate.postalEnd} onChange={(v) => updateRate(rate.id, 'postalEnd', v)} autoComplete="off" />
                        </InlineGrid>
                        <InlineGrid columns={3} gap="400">
                          <TextField label="Peso Máx (kg)" type="number" value={rate.weight} onChange={(v) => updateRate(rate.id, 'weight', v)} autoComplete="off" />
                          <TextField label="Volume Máx (cm³)" type="number" value={rate.volume} onChange={(v) => updateRate(rate.id, 'volume', v)} autoComplete="off" />
                          <TextField label="Preço (€)" type="number" value={rate.price} onChange={(v) => updateRate(rate.id, 'price', v)} autoComplete="off" />
                        </InlineGrid>
                      </BlockStack>
                    </div>
                  ))}
                  
                  <Button onClick={addRateRow}>Adicionar Nova Regra</Button>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}