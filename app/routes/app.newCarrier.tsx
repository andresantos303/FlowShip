import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation } from "@remix-run/react";
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
  ChoiceList
} from "@shopify/polaris";
import { useState, useCallback, useMemo } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const calculationMethod = formData.get("calculationMethod") as string;
  
  const apiKey = formData.get("apiKey") as string | null;
  const apiSecret = formData.get("apiSecret") as string | null;
  const apiAccountNumber = formData.get("apiAccountNumber") as string | null;
  const apiUrlRates = formData.get("apiUrlRates") as string | null;
  const apiUrlAvailability = formData.get("apiUrlAvailability") as string | null;
  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue") || 0);

  // Criar a transportadora base
  const newCarrier = await prisma.carrier.create({
    data: {
      shopDomain: session.shop,
      name,
      description,
      calculationMethod,
      isActive: true,
      apiKey: calculationMethod === 'API' ? apiKey : null,
      apiSecret: calculationMethod === 'API' ? apiSecret : null,
      apiAccountNumber: calculationMethod === 'API' ? apiAccountNumber : null,
      markupType: calculationMethod === 'API' ? markupType : null,
      markupValue: calculationMethod === 'API' ? markupValue : null,
    }
  });

  if (calculationMethod === 'TABLE') {
    return redirect(`/app/carrier/${newCarrier.id}`);
  }else {
    return redirect(`/app`);
  }
}

export default function CreateCarrier() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  // Estado Geral
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState(["TABLE"]);

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [apiAccountNumber, setApiAccountNumber] = useState("");
  const [markupType, setMarkupType] = useState("PERCENTAGE");
  const [markupValue, setMarkupValue] = useState("");

  const isFormValid = useMemo(() => {
    if (!name || !description) return false;
    if (method[0] === 'API') {
      return apiKey && apiSecret;
    }
    return true;
  }, [name, description, method, apiKey, apiSecret, markupType, markupValue]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("calculationMethod", method[0]);

    if (method[0] === 'API') {
      formData.append("apiKey", apiKey);
      formData.append("apiSecret", apiSecret);
      formData.append("apiAccountNumber", apiAccountNumber);
      formData.append("markupType", markupType);
      formData.append("markupValue", markupValue);
    }

    submit(formData, { method: "post" });
  }, [name, description, method, apiKey, apiSecret, apiAccountNumber, markupType, markupValue, submit]);

  return (
    <Page
      title="Nova Transportadora"
      backAction={{ content: 'Voltar', url: '/app' }}
      primaryAction={{
        content: method[0] === 'API' ? 'Guardar' : 'Continuar para Regras de Envio',
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
                <FormLayout.Group>
                  <ChoiceList
                    title="Método de Cálculo"
                    choices={[
                      { label: 'Tabela Manual (Zonas e Pesos)', value: 'TABLE' },
                      { label: 'API Dinâmica', value: 'API' },
                    ]}
                    selected={method}
                    onChange={setMethod}
                  />
                </FormLayout.Group>
                {method[0] === "TABLE" ? (
                  <TextField label="Nome da Transportadora" value={name} onChange={setName} autoComplete="off" placeholder="Ex: CTT Expresso" />
                ) : (
                  <Select label="Nome da Transportadora" options={[{label:'Selecione o nome',value:''},{label:'FedEx',value:'FedEx'},{label:'GLS',value:'GLS'}]} value={name} onChange={setName} />
                )}
                <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {method[0] === 'API' && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Credenciais de Integração</Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField label="Número de Conta (opcional)" value={apiAccountNumber} onChange={setApiAccountNumber} autoComplete="off" />
                    <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                    <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                  </FormLayout.Group>
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
        )}
      </Layout>
    </Page>
  );
}