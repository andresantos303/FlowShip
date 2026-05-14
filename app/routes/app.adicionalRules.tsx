import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, TextField, Text, InlineGrid, Divider, Checkbox } from "@shopify/polaris";
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

  await prisma.storeConfig.update({
    where: { shopDomain: session.shop },
    data: {
      freeShippingThreshold: Number(formData.get("freeShippingThreshold")),
      freeShippingActive: isFreeShippingActive,
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

  const [threshold, setThreshold] = useState(String(config.freeShippingThreshold));
  const [isActive, setIsActive] = useState(config.freeShippingActive);

  useEffect(() => {
    if (actionData?.success) {
      (window as any).shopify.toast.show('Configurações guardadas com sucesso!');
    }
  }, [actionData]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("freeShippingThreshold", threshold);
    formData.append("freeShippingActive", String(isActive));

    submit(formData, { method: "post" });
  }, [threshold, isActive, submit]);

  return (
    <Page
      title="Regras Adicionais"
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
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}