import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, TextField, Text, Checkbox, FormLayout } from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  let config = await prisma.storeConfig.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!config) {
    config = await prisma.storeConfig.create({
      data: { shopDomain: session.shop }
    });
  }

  return json({ config });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const isFreeShippingActive = formData.get("freeShippingActive") === "true";

  // Update the StoreConfig table with the new default dimensions
  await prisma.storeConfig.update({
    where: { shopDomain: session.shop },
    data: {
      freeShippingThreshold: Number(formData.get("freeShippingThreshold")),
      freeShippingActive: isFreeShippingActive,
      defaultWeight: Number(formData.get("defaultWeight")),
      defaultLength: Number(formData.get("defaultLength")),
      defaultWidth: Number(formData.get("defaultWidth")),
      defaultHeight: Number(formData.get("defaultHeight")),
    },
  });

  return json({ success: true });
}

export default function AdditionalRules() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [threshold, setThreshold] = useState(String(config.freeShippingThreshold || 0));
  const [isActive, setIsActive] = useState(config.freeShippingActive || false);
  const [defaultWeight, setDefaultWeight] = useState(String(config.defaultWeight || 0));
  const [defaultLength, setDefaultLength] = useState(String(config.defaultLength || 0));
  const [defaultWidth, setDefaultWidth] = useState(String(config.defaultWidth || 0));
  const [defaultHeight, setDefaultHeight] = useState(String(config.defaultHeight || 0));

  useEffect(() => {
    if (actionData?.success) {
      (window as any).shopify.toast.show('Configurações guardadas com sucesso!');
    }
  }, [actionData]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("freeShippingThreshold", threshold);
    formData.append("freeShippingActive", String(isActive));
    
    // Append new fields to the form data
    formData.append("defaultWeight", defaultWeight);
    formData.append("defaultLength", defaultLength);
    formData.append("defaultWidth", defaultWidth);
    formData.append("defaultHeight", defaultHeight);

    submit(formData, { method: "post" });
  }, [threshold, isActive, defaultWeight, defaultLength, defaultWidth, defaultHeight, submit]);

  return (
    <Page
      title="Definições"
      primaryAction={{ content: 'Guardar', onAction: handleSave, loading: isSaving }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Regras adicionais</Text>
                <TextField
                  label="Valor mínimo para portes grátis"
                  type="number"
                  value={threshold}
                  onChange={setThreshold}
                  autoComplete="off"
                />
                <Checkbox
                  label="Portes grátis ativos"
                  checked={isActive}
                  onChange={setIsActive}
                  helpText="Se desativada, não será considerado o valor mínimo para portes grátis, mesmo que definido."
                />
              </BlockStack>
            </Card>

            {/* New card for default dimensions */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Dimensões predefinidas</Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Estes valores serão utilizados no cálculo dos portes caso um produto não tenha o tamanho e o peso definidos.
                </Text>
                
                <FormLayout>
                  <TextField
                    label="Peso predefinido (kg)"
                    type="number"
                    value={defaultWeight}
                    onChange={setDefaultWeight}
                    autoComplete="off"
                  />
                  <FormLayout.Group>
                    <TextField
                      label="Comprimento (cm)"
                      type="number"
                      value={defaultLength}
                      onChange={setDefaultLength}
                      autoComplete="off"
                    />
                    <TextField
                      label="Largura (cm)"
                      type="number"
                      value={defaultWidth}
                      onChange={setDefaultWidth}
                      autoComplete="off"
                    />
                    <TextField
                      label="Altura (cm)"
                      type="number"
                      value={defaultHeight}
                      onChange={setDefaultHeight}
                      autoComplete="off"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}