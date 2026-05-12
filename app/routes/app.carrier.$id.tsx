import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  FormLayout,
  TextField,
  Select,
  Button,
  Text,
  InlineGrid,
  ChoiceList,
  Divider,
  Checkbox,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Carregamento dos dados da transportadora e respetivas tarifas
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  const carrier = await prisma.carrier.findUnique({
    where: { id: params.id },
    include: { rates: true },
  });

  if (!carrier || carrier.shopDomain !== session.shop) {
    throw new Response("Transportadora não encontrada", { status: 404 });
  }

  return json({ carrier });
}

// Atualização das informações na base de dados
export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const calculationMethod = formData.get("calculationMethod") as string;
  const apiKey = formData.get("apiKey") as string | null;
  const apiSecret = formData.get("apiSecret") as string | null;
  const apiAccountNumber = formData.get("apiAccountNumber") as string | null;
  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue") || 0);
  const rawRates = formData.get("ratesData") as string;
  const ratesData = rawRates ? JSON.parse(rawRates) : [];
  const isActive = formData.get("isActive") === "true";

  await prisma.carrier.update({
    where: { id: params.id },
    data: {
      name,
      description,
      category,
      calculationMethod,
      isActive,
      apiKey: calculationMethod === "API" ? apiKey : null,
      apiSecret: calculationMethod === "API" ? apiSecret : null,
      apiAccountNumber: calculationMethod === "API" ? apiAccountNumber : null,
      markupType: calculationMethod === "API" ? markupType : null,
      markupValue: calculationMethod === "API" ? markupValue : null,
      rates: {
        deleteMany: {}, // Remoção das tarifas anteriores para evitar duplicados
        create: calculationMethod === "TABLE" ? ratesData.map((rate: any) => ({
          groupName: rate.groupName,
          maxWeight: Number(rate.maxWeight),
          boxSize: String(rate.boxSize),
          price: Number(rate.price),
          deliveryTime: Number(rate.deliveryTime)
        })) : [],
      },
    },
  });

  return json({ success: true });
}

export default function EditCarrier() {
  const { carrier } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSaving = navigation.state === "submitting";

  const [name, setName] = useState(carrier.name);
  const [description, setDescription] = useState(carrier.description);
  const [category, setCategory] = useState(carrier.category);
  const [isActive, setIsActive] = useState(carrier.isActive);
  const [method, setMethod] = useState([carrier.calculationMethod]);
  const [apiKey, setApiKey] = useState(carrier.apiKey || "");
  const [apiSecret, setApiSecret] = useState(carrier.apiSecret || "");
  const [apiAccountNumber, setApiAccountNumber] = useState(carrier.apiAccountNumber || "");
  const [markupType, setMarkupType] = useState(carrier.markupType || "PERCENTAGE");
  const [markupValue, setMarkupValue] = useState(String(carrier.markupValue || 0));

  // Inicialização do estado com as tarifas guardadas
  const [rates, setRates] = useState(
    carrier.rates.map((r) => ({
      id: r.id,
      groupName: r.groupName,
      maxWeight: String(r.maxWeight),
      boxSize: String(r.boxSize),
      price: String(r.price),
      deliveryTime: String(r.deliveryTime),
    })) || [],
  );

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show("Transportadora atualizada com sucesso");
    }
  }, [actionData]);

  const updateRate = (id: string | number, field: string, value: string) => {
    setRates(rates.map((rate) => (rate.id === id ? { ...rate, [field]: value } : rate)));
  };

  const addRateRow = () => {
    setRates([
      ...rates,
      { id: Date.now().toString(), groupName: "", maxWeight: "", boxSize: "", price: "", deliveryTime: "" },
    ]);
  };

  const removeRateRow = (id: string | number) => {
    setRates(rates.filter((rate) => rate.id !== id));
  };

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("isActive", String(isActive));
    formData.append("calculationMethod", method[0]);
    formData.append("apiKey", apiKey);
    formData.append("apiSecret", apiSecret);
    formData.append("apiAccountNumber", apiAccountNumber);
    formData.append("markupType", markupType);
    formData.append("markupValue", markupValue);
    formData.append("ratesData", JSON.stringify(rates));

    submit(formData, { method: "post" });
  }, [name, description, category, method, isActive, apiKey, apiSecret, apiAccountNumber, markupType, markupValue, rates, submit]);

  return (
    <Page
      title={`Editar: ${carrier.name}`}
      backAction={{ content: "Lista de Transportadoras", url: "/app" }}
      primaryAction={{
        content: "Guardar alterações",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Configuração Geral</Text>
                <FormLayout>
                  <TextField label="Nome da Transportadora" value={name} onChange={setName} autoComplete="off" />
                  <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
                  <TextField label="Categoria" value={category} onChange={setCategory} autoComplete="off" />
                  <Divider />
                  {/* Campo para ativar/desativar */}
                  <Checkbox
                    label="Transportadora ativa"
                    checked={isActive}
                    onChange={setIsActive}
                    helpText="Se desativada, esta transportadora não será considerada no cálculo de portes no checkout."
                  />
                  {/* <ChoiceList
                    title="Método de Cálculo"
                    choices={[
                      { label: "Tabela de Preços Manual", value: "TABLE" },
                      { label: "Cálculo via API", value: "API" },
                    ]}
                    selected={method}
                    onChange={setMethod}
                  /> */}
                </FormLayout>
              </BlockStack>
            </Card>

            {method[0] === "API" && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Dados da Integração</Text>
                  <FormLayout>
                    <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                    <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                    <TextField label="API Account Number" value={apiAccountNumber} onChange={setApiAccountNumber} autoComplete="off" />
                    <Divider />
                    <Text variant="headingSm" as="h3">Margem de Lucro (*Markup*)</Text>
                    <FormLayout.Group>
                      <Select
                        label="Tipo"
                        options={[
                          { label: "%", value: "PERCENTAGE" },
                          { label: "Valor Fixo (€)", value: "ABSOLUTE" },
                        ]}
                        value={markupType}
                        onChange={setMarkupType}
                      />
                      <TextField label="Valor" type="number" value={markupValue} onChange={setMarkupValue} autoComplete="off" />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>
            )}

            {method[0] === "TABLE" && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Tabela de Tarifas</Text>
                  {rates.map((rate) => (
                    <div key={rate.id} style={{ padding: "12px", background: "#f4f6f8", borderRadius: "8px" }}>
                      <BlockStack gap="200">
                        <InlineGrid columns={3} gap="400">
                          <TextField label="País" value={rate.groupName} onChange={(v) => updateRate(rate.id, "groupName", v)} autoComplete="off" />
                          <TextField label="Peso Máx (kg)" type="number" value={rate.maxWeight} onChange={(v) => updateRate(rate.id, "maxWeight", v)} autoComplete="off" />
                          <TextField label="Tamanho da caixa" value={rate.boxSize} onChange={(v) => updateRate(rate.id, "boxSize", v)} autoComplete="off" />
                        </InlineGrid>
                        <InlineGrid columns={4} gap="400">
                          <TextField label="Preço (€)" type="number" value={rate.price} onChange={(v) => updateRate(rate.id, "price", v)} autoComplete="off" />
                          <TextField label="Tempo de Entrega (dias)" type="number" value={rate.deliveryTime} onChange={(v) => updateRate(rate.id, "deliveryTime", v)} autoComplete="off" />
                          <div style={{ alignSelf: "end" }}>
                            <Button tone="critical" onClick={() => removeRateRow(rate.id)}>Remover</Button>
                          </div>
                        </InlineGrid>
                      </BlockStack>
                    </div>
                  ))}
                  <Button onClick={addRateRow}>Adicionar linha de tarifa</Button>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}