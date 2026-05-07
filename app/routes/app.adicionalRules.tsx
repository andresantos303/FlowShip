import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, FormLayout, TextField, Select, Checkbox, Text
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Fetch the store configuration from the database
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  let config = await prisma.storeConfig.findUnique({
    where: { shopDomain: session.shop },
  });

  // Create default config if it doesn't exist for the shop
  if (!config) {
    console.log(`Creating default config for shop: ${session.shop}`);
    config = await prisma.storeConfig.create({
      data: {
        shopDomain: session.shop,
      }
    });
  }

  return { config };
}

// Update the store configuration in the database
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue"));
  const freeShippingThreshold = Number(formData.get("freeShippingThreshold"));
  const isActiveCTT = formData.get("isActiveCTT") === "true";
  const isActiveGLS = formData.get("isActiveGLS") === "true";
  const isActiveFedEx = formData.get("isActiveFedEx") === "true";

  await prisma.storeConfig.update({
    where: { shopDomain: session.shop },
    data: {
      markupType,
      markupValue,
      freeShippingThreshold,
      isActiveCTT,
      isActiveGLS,
      isActiveFedEx,
    },
  });
  return { success: true };
}

export default function AdditionalRules() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [markupType, setMarkupType] = useState(config.markupType);
  const [markupValue, setMarkupValue] = useState(String(config.markupValue));
  const [threshold, setThreshold] = useState(String(config.freeShippingThreshold));
  
  const [isActiveCTT, setIsActiveCTT] = useState(config.isActiveCTT);
  const [isActiveGLS, setIsActiveGLS] = useState(config.isActiveGLS);
  const [isActiveFedEx, setIsActiveFedEx] = useState(config.isActiveFedEx);

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show('Configurações guardadas com sucesso!',{
        duration: 3000,
      });
    }
  }, [isSaving]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("markupType", markupType);
    formData.append("markupValue", markupValue);
    formData.append("freeShippingThreshold", threshold);
    formData.append("isActiveCTT", String(isActiveCTT));
    formData.append("isActiveGLS", String(isActiveGLS));
    formData.append("isActiveFedEx", String(isActiveFedEx));

    submit(formData, { method: "post" });
  }, [markupType, markupValue, threshold, isActiveCTT, isActiveGLS, isActiveFedEx, submit]);

  return (
    <Page
      title="Regras Adicionais"
      primaryAction={{
        content: 'Guardar',
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Margem de Lucro e Portes</Text>
                <FormLayout>
                  <FormLayout.Group>
                    <Select
                      label="Tipo de Markup"
                      options={[
                        { label: 'Percentagem (%)', value: 'PERCENTAGE' },
                        { label: 'Valor Absoluto', value: 'ABSOLUTE' },
                      ]}
                      value={markupType}
                      onChange={setMarkupType}
                    />
                    <TextField
                      label="Valor do Markup"
                      type="number"
                      value={markupValue}
                      onChange={setMarkupValue}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                  <TextField
                    label="Valor mínimo para portes grátis"
                    type="number"
                    value={threshold}
                    onChange={setThreshold}
                    autoComplete="off"
                    helpText="Valor na unidade base (ex: 10000 para 100.00€ se usares cêntimos)."
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Transportadoras Ativas</Text>
                <FormLayout>
                  <Checkbox label="Ativar CTT" checked={isActiveCTT} onChange={setIsActiveCTT} />
                  <Checkbox label="Ativar GLS" checked={isActiveGLS} onChange={setIsActiveGLS} />
                  <Checkbox label="Ativar FedEx" checked={isActiveFedEx} onChange={setIsActiveFedEx} />
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}