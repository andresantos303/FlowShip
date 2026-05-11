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
  const freeShippingThreshold = Number(formData.get("freeShippingThreshold"));

  await prisma.storeConfig.update({
    where: { shopDomain: session.shop },
    data: {
      freeShippingThreshold,
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

  const [threshold, setThreshold] = useState(String(config.freeShippingThreshold));

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show('Configurações guardadas com sucesso!',{
        duration: 3000,
      });
    }
  }, [isSaving]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("freeShippingThreshold", threshold);

    submit(formData, { method: "post" });
  }, [threshold, submit]);

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
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}