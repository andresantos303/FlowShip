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
      boxSmallMaxWeight: Number(formData.get("boxSmallMaxWeight")),
      boxSmallLength: Number(formData.get("boxSmallLength")),
      boxSmallWidth: Number(formData.get("boxSmallWidth")),
      boxSmallHeight: Number(formData.get("boxSmallHeight")),
      
      boxMediumMaxWeight: Number(formData.get("boxMediumMaxWeight")),
      boxMediumLength: Number(formData.get("boxMediumLength")),
      boxMediumWidth: Number(formData.get("boxMediumWidth")),
      boxMediumHeight: Number(formData.get("boxMediumHeight")),
      
      boxLargeMaxWeight: Number(formData.get("boxLargeMaxWeight")),
      boxLargeLength: Number(formData.get("boxLargeLength")),
      boxLargeWidth: Number(formData.get("boxLargeWidth")),
      boxLargeHeight: Number(formData.get("boxLargeHeight")),
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

  const [islandTaxes, setIslandTaxes] = useState("0");
  const [threshold, setThreshold] = useState(String(config.freeShippingThreshold));
  const [isActive, setIsActive] = useState(config.freeShippingActive);
  const [boxSmall, setBoxSmall] = useState({
    weight: String(config.boxSmallMaxWeight), l: String(config.boxSmallLength), w: String(config.boxSmallWidth), h: String(config.boxSmallHeight)
  });
  const [boxMedium, setBoxMedium] = useState({
    weight: String(config.boxMediumMaxWeight), l: String(config.boxMediumLength), w: String(config.boxMediumWidth), h: String(config.boxMediumHeight)
  });
  const [boxLarge, setBoxLarge] = useState({
    weight: String(config.boxLargeMaxWeight), l: String(config.boxLargeLength), w: String(config.boxLargeWidth), h: String(config.boxLargeHeight)
  });

  useEffect(() => {
    if (actionData?.success) {
      (window as any).shopify.toast.show('Configurações guardadas com sucesso!');
    }
  }, [actionData]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("islandTaxes", islandTaxes);
    formData.append("freeShippingThreshold", threshold);
    formData.append("freeShippingActive", String(isActive));
    formData.append("boxSmallMaxWeight", boxSmall.weight);
    formData.append("boxSmallLength", boxSmall.l);
    formData.append("boxSmallWidth", boxSmall.w);
    formData.append("boxSmallHeight", boxSmall.h);
    
    formData.append("boxMediumMaxWeight", boxMedium.weight);
    formData.append("boxMediumLength", boxMedium.l);
    formData.append("boxMediumWidth", boxMedium.w);
    formData.append("boxMediumHeight", boxMedium.h);

    formData.append("boxLargeMaxWeight", boxLarge.weight);
    formData.append("boxLargeLength", boxLarge.l);
    formData.append("boxLargeWidth", boxLarge.w);
    formData.append("boxLargeHeight", boxLarge.h);

    submit(formData, { method: "post" });
  }, [islandTaxes, threshold, isActive, boxSmall, boxMedium, boxLarge, submit]);

  return (
    <Page
      title="Regras Adicionais e Caixas"
      primaryAction={{ content: 'Guardar', onAction: handleSave, loading: isSaving }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Regras adicionais</Text>
                {/* <FormLayout.Group>
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
                </FormLayout.Group> */}
                <TextField
                  label="Sobretaxa para transportes para ilhas"
                  type="number"
                  value={islandTaxes}
                  onChange={setIslandTaxes}
                  autoComplete="off"
                />
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
                <Divider/>
                <Text variant="headingMd" as="h2">Definição do tamanho de caixas</Text>
                <Text variant="bodyMd" as="p">
                  O tamanho da caixa é definido automaticamente pelo peso total do carrinho. 
                  Estas medidas são enviadas para a <b>API</b> das transportadoras.
                </Text>

                <Divider />
                
                <Text variant="headingSm" as="h3">Caixa Pequena</Text>
                <InlineGrid columns={4} gap="400">
                  <TextField label="Peso Máximo (kg)" value={boxSmall.weight} onChange={(v) => setBoxSmall({...boxSmall, weight: v})} autoComplete="off" />
                  <TextField label="Comprimento (cm)" value={boxSmall.l} type="number" onChange={(v) => setBoxSmall({...boxSmall, l: v})} autoComplete="off" />
                  <TextField label="Largura (cm)" value={boxSmall.w} type="number" onChange={(v) => setBoxSmall({...boxSmall, w: v})} autoComplete="off" />
                  <TextField label="Altura (cm)" value={boxSmall.h} type="number" onChange={(v) => setBoxSmall({...boxSmall, h: v})} autoComplete="off" />
                </InlineGrid>

                <Text variant="headingSm" as="h3">Caixa Média</Text>
                <InlineGrid columns={4} gap="400">
                  <TextField label="Peso Máximo (kg)" value={boxMedium.weight} onChange={(v) => setBoxMedium({...boxMedium, weight: v})} autoComplete="off" />
                  <TextField label="Comprimento (cm)" value={boxMedium.l} type="number" onChange={(v) => setBoxMedium({...boxMedium, l: v})} autoComplete="off" />
                  <TextField label="Largura (cm)" value={boxMedium.w} type="number" onChange={(v) => setBoxMedium({...boxMedium, w: v})} autoComplete="off" />
                  <TextField label="Altura (cm)" value={boxMedium.h} type="number" onChange={(v) => setBoxMedium({...boxMedium, h: v})} autoComplete="off" />
                </InlineGrid>

                <Text variant="headingSm" as="h3">Caixa Grande</Text>
                <InlineGrid columns={4} gap="400">
                  <TextField label="Peso Máximo (kg)" value={boxLarge.weight} onChange={(v) => setBoxLarge({...boxLarge, weight: v})} autoComplete="off" />
                  <TextField label="Comprimento (cm)" value={boxLarge.l} type="number" onChange={(v) => setBoxLarge({...boxLarge, l: v})} autoComplete="off" />
                  <TextField label="Largura (cm)" value={boxLarge.w} type="number" onChange={(v) => setBoxLarge({...boxLarge, w: v})} autoComplete="off" />
                  <TextField label="Altura (cm)" value={boxLarge.h} type="number" onChange={(v) => setBoxLarge({...boxLarge, h: v})} autoComplete="off" />
                </InlineGrid>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}