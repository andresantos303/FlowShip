import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation, useNavigate, useLoaderData } from "@remix-run/react";
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
  Divider,
  ChoiceList,
  InlineStack,
  Banner,
  IndexTable,
  Icon,
  InlineGrid
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Procura as zonas únicas (groupNames) configuradas na tabela PostalRule
  const rules = await prisma.postalRule.findMany({
    where: { shopDomain: session.shop },
    select: { groupName: true },
    distinct: ['groupName']
  });

  const zones = rules.map(r => r.groupName);
  return json({ zones });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const calculationMethod = formData.get("calculationMethod") as string;
  
  const apiKey = formData.get("apiKey") as string | null;
  const apiSecret = formData.get("apiSecret") as string | null;
  const apiAccountNumber = formData.get("apiAccountNumber") as string | null;
  const apiUrlRates = formData.get("apiUrlRates") as string | null;
  const apiUrlAvailability = formData.get("apiUrlAvailability") as string | null;
  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue") || 0);

  const rawRates = formData.get("ratesData") as string;
  const ratesData = rawRates ? JSON.parse(rawRates) : [];

  await prisma.carrier.create({
    data: {
      shopDomain: session.shop,
      name,
      description,
      category,
      calculationMethod,
      isActive: true,
      apiKey: calculationMethod === 'API' ? apiKey : null,
      apiSecret: calculationMethod === 'API' ? apiSecret : null,
      apiAccountNumber: calculationMethod === 'API' ? apiAccountNumber : null,
      apiUrlRates: calculationMethod === 'API' ? apiUrlRates : null,
      apiUrlAvailability: calculationMethod === 'API' ? apiUrlAvailability : null,
      markupType: calculationMethod === 'API' ? markupType : null,
      markupValue: calculationMethod === 'API' ? markupValue : null,
      rates: calculationMethod === 'TABLE' ? {
        create: ratesData.map((rate: any) => ({
          groupName: rate.groupName,
          maxWeight: Number(rate.weight),
          price: Number(rate.price),
          deliveryTime: Number(rate.deliveryTime)
        }))
      } : undefined
    }
  });

  return json({ success: true });
}

export default function CreateCarrier() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const { zones } = useLoaderData<typeof loader>();
  const isSaving = navigation.state === "submitting";

  const zoneOptions = useMemo(() => [
    { label: "Selecionar zona", value: "" },
    ...zones.map((zone: string) => ({ label: zone, value: zone }))
  ], [zones]);

  // Estado Geral
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("NATIONAL");
  const [method, setMethod] = useState(["TABLE"]);

  // Estado da API
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [apiAccountNumber, setApiAccountNumber] = useState("");
  const [apiUrlRates, setApiUrlRates] = useState("");
  const [apiUrlAvailability, setApiUrlAvailability] = useState("");
  const [markupType, setMarkupType] = useState("PERCENTAGE");
  const [markupValue, setMarkupValue] = useState("");

  // Estado das Tarifas (Tabela)
  const [rates, setRates] = useState<any[]>([]);
  const [tempZone, setTempZone] = useState("");
  const [tempWeight, setTempWeight] = useState("");
  const [tempPrice, setTempPrice] = useState("");
  const [tempTime, setTempTime] = useState("3");

  const isFormValid = useMemo(() => {
    if (!name || !description) return false;
    if (method[0] === 'API') {
      return apiKey && apiSecret && apiUrlRates;
    }
    return rates.length > 0;
  }, [name, description, method, apiKey, apiSecret, apiUrlRates, rates]);

  useEffect(() => {
    if (actionData?.success) {
      window.shopify.toast.show('Transportadora criada com sucesso!');
      navigate("/app");
    }
  }, [actionData, navigate]);

  const addRateToTable = useCallback(() => {
    if (!tempZone || !tempWeight || !tempPrice) return;
    
    setRates([...rates, {
      id: Date.now(),
      groupName: tempZone,
      weight: tempWeight,
      price: tempPrice,
      deliveryTime: tempTime
    }]);

    setTempWeight("");
    setTempPrice("");
  }, [tempZone, tempWeight, tempPrice, tempTime, rates]);

  const removeRate = (id: number) => {
    setRates(rates.filter(r => r.id !== id));
  };

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("calculationMethod", method[0]);

    if (method[0] === 'API') {
      formData.append("apiKey", apiKey);
      formData.append("apiSecret", apiSecret);
      formData.append("apiAccountNumber", apiAccountNumber);
      formData.append("apiUrlRates", apiUrlRates);
      formData.append("apiUrlAvailability", apiUrlAvailability);
      formData.append("markupType", markupType);
      formData.append("markupValue", markupValue);
    } else {
      formData.append("ratesData", JSON.stringify(rates));
    }

    submit(formData, { method: "post" });
  }, [name, description, category, method, apiKey, apiSecret, apiAccountNumber, apiUrlRates, apiUrlAvailability, markupType, markupValue, rates, submit]);

  return (
    <Page
      title="Nova Transportadora"
      backAction={{ content: 'Voltar', url: '/app' }}
      primaryAction={{
        content: 'Criar Transportadora',
        onAction: handleSave,
        loading: isSaving,
        disabled: !isFormValid
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Configurações Gerais</Text>
              <FormLayout>
                <TextField label="Nome da Transportadora" value={name} onChange={setName} autoComplete="off" placeholder="Ex: CTT Expresso" />
                <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
                <FormLayout.Group>
                  <ChoiceList
                    title="Método de Cálculo"
                    choices={[
                      { label: 'Tabela Manual', value: 'TABLE' },
                      { label: 'API Dinâmica', value: 'API' },
                    ]}
                    selected={method}
                    onChange={setMethod}
                  />
                  <Select
                    label="Categoria"
                    options={[
                      { label: "Nacional", value: "NATIONAL" },
                      { label: "Internacional", value: "INTERNATIONAL" },
                    ]}
                    value={category}
                    onChange={setCategory}
                  />
                </FormLayout.Group>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {method[0] === 'API' ? (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Credenciais de Integração</Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                    <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiKey} autoComplete="off" />
                  </FormLayout.Group>
                  <TextField label="URL de Cálculo (Rates)" value={apiUrlRates} onChange={setApiUrlRates} autoComplete="off" />
                  <Divider />
                  <Text variant="headingSm" as="h3">Margem de Lucro (*Markup*)</Text>
                  <FormLayout.Group>
                    <Select
                      label="Tipo"
                      options={[{ label: 'Percentagem (%)', value: 'PERCENTAGE' }, { label: 'Fixo (€)', value: 'ABSOLUTE' }]}
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
                      <p>Deve configurar as zonas na página de Gestão de Zonas antes de adicionar preços.</p>
                    </Banner>
                  )}
                  <FormLayout>
                    <InlineGrid columns={2} gap="400">
                      <Select label="Zona de Destino" options={zoneOptions} value={tempZone} onChange={setTempZone} />
                      <TextField label="Peso Máximo (Kg)" type="number" value={tempWeight} onChange={setTempWeight} autoComplete="off" />
                    </InlineGrid>
                    <InlineGrid columns={2} gap="400">
                      <TextField label="Preço (€)" type="number" value={tempPrice} onChange={setTempPrice} autoComplete="off" prefix="€" />
                      <TextField label="Entrega (Dias)" type="number" value={tempTime} onChange={setTempTime} autoComplete="off" />
                    </InlineGrid>
                    <InlineStack align="end">
                      <Button onClick={addRateToTable} disabled={!tempZone || !tempWeight || !tempPrice}>
                        Adicionar à Lista
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
                  itemCount={rates.length}
                  headings={[
                    { title: "Zona" },
                    { title: "Peso Máx" },
                    { title: "Preço" },
                    { title: "Entrega" },
                    { title: "" }
                  ]}
                  selectable={false}
                >
                  {rates.map((rate, index) => (
                    <IndexTable.Row id={String(rate.id)} key={rate.id} position={index}>
                      <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{rate.groupName}</Text></IndexTable.Cell>
                      <IndexTable.Cell>{rate.weight} kg</IndexTable.Cell>
                      <IndexTable.Cell>{rate.price} €</IndexTable.Cell>
                      <IndexTable.Cell>{rate.deliveryTime} dias</IndexTable.Cell>
                      <IndexTable.Cell>
                        <Button tone="critical" variant="plain" onClick={() => removeRate(rate.id)} icon={DeleteIcon} />
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