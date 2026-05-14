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
  Badge,
  InlineStack
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// Loader: Fetches existing rules for the current shop
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const rules = await prisma.postalRule.findMany({
    where: { shopDomain: session.shop },
    orderBy: { createdAt: "desc" }
  });
  
  return json({ rules });
};

// Action: Handles creation and deletion of rules
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "CREATE") {
    const countryCode = formData.get("countryCode") as string;
    const groupName = formData.get("groupName") as string;
    const matchType = formData.get("matchType") as string;
    const valueMin = formData.get("valueMin") as string || "";
    const valueMax = formData.get("valueMax") as string || null;

    console.log(`[Zones UI] Creating new rule for ${groupName} in ${countryCode}`);

    await prisma.postalRule.create({
      data: {
        shopDomain: session.shop,
        countryCode: countryCode.toUpperCase(),
        groupName,
        matchType,
        valueMin,
        valueMax: matchType === "RANGE" ? valueMax : null
      }
    });
    
    return json({ success: true });
  }

  if (actionType === "DELETE") {
    const id = formData.get("id") as string;
    
    console.log(`[Zones UI] Deleting rule with ID: ${id}`);
    
    await prisma.postalRule.delete({
      where: { id, shopDomain: session.shop }
    });
    
    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function ZonesManagement() {
  const { rules } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Form State
  const [countryCode, setCountryCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [matchType, setMatchType] = useState("ALL");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");

  const matchTypeOptions = [
    { label: "Todo o País", value: "ALL" },
    { label: "Intervalo (Ex: 1000 a 4999)", value: "RANGE" },
    { label: "Prefixo (Ex: Começa por 9)", value: "PREFIX" },
    { label: "Código Exato", value: "EXACT" },
  ];

  const handleCreateRule = useCallback(() => {
    const formData = new FormData();
    formData.append("actionType", "CREATE");
    formData.append("countryCode", countryCode);
    formData.append("groupName", groupName);
    formData.append("matchType", matchType);
    formData.append("valueMin", valueMin);
    if (matchType === "RANGE") {
      formData.append("valueMax", valueMax);
    }

    submit(formData, { method: "POST" });

    // Reset form after submission
    setCountryCode("");
    setGroupName("");
    setValueMin("");
    setValueMax("");
  }, [countryCode, groupName, matchType, valueMin, valueMax, submit]);

  const handleDelete = useCallback((id: string) => {
    const formData = new FormData();
    formData.append("actionType", "DELETE");
    formData.append("id", id);
    submit(formData, { method: "POST" });
  }, [submit]);

  const rowMarkup = rules.map((rule, index) => (
    <IndexTable.Row id={rule.id} key={rule.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">{rule.countryCode}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{rule.groupName}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{rule.matchType}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {rule.matchType === "ALL" ? "N/A" : 
         rule.matchType === "RANGE" ? `${rule.valueMin} - ${rule.valueMax}` : 
         rule.valueMin}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button tone="critical" variant="plain" onClick={() => handleDelete(rule.id)}>
          Eliminar
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Gestão de Zonas de Envio">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Criar Nova Zona</Text>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Código do País (ISO Ex: PT, ES)"
                    value={countryCode}
                    onChange={setCountryCode}
                    autoComplete="off"
                    maxLength={2}
                  />
                  <TextField
                    label="Nome da Zona (Ex: PT Continental)"
                    value={groupName}
                    onChange={setGroupName}
                    autoComplete="off"
                  />
                </FormLayout.Group>

                <Select
                  label="Tipo de Correspondência"
                  options={matchTypeOptions}
                  value={matchType}
                  onChange={setMatchType}
                />

                {matchType !== "ALL" && (
                  <FormLayout.Group>
                    <TextField
                      label={matchType === "RANGE" ? "Código Inicial" : "Valor de Correspondência"}
                      value={valueMin}
                      onChange={setValueMin}
                      autoComplete="off"
                      helpText="Apenas letras e números. Sem espaços ou hífenes."
                    />
                    {matchType === "RANGE" && (
                      <TextField
                        label="Código Final"
                        value={valueMax}
                        onChange={setValueMax}
                        autoComplete="off"
                        helpText="O limite máximo do intervalo postal."
                      />
                    )}
                  </FormLayout.Group>
                )}

                <InlineStack align="end">
                  <Button 
                    variant="primary" 
                    onClick={handleCreateRule} 
                    loading={isSubmitting}
                    disabled={!countryCode || !groupName || (matchType !== "ALL" && !valueMin)}
                  >
                    Guardar Regra
                  </Button>
                </InlineStack>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={{ singular: "regra", plural: "regras" }}
              itemCount={rules.length}
              headings={[
                { title: "País" },
                { title: "Zona" },
                { title: "Tipo" },
                { title: "Regra Postal" },
                { title: "Ações" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}