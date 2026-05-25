import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Select, Button,
  BlockStack, Text, IndexTable, InlineStack, Divider
} from "@shopify/polaris";
import { useState, useMemo, useEffect } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { decrypt, encrypt } from "../utils/encryption";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { id } = params;

  const carrier = await prisma.carrier.findUnique({
    where: { id, shopDomain: session.shop },
    include: {
      rules: {
        include: { rates: true }
      }
    }
  });

  if (!carrier) throw new Response("Not Found", { status: 404 });

  if (carrier.apiKey) {
    carrier.apiKey = decrypt(carrier.apiKey);
  }
  if (carrier.apiSecret) {
    carrier.apiSecret = decrypt(carrier.apiSecret);
  }

  if (carrier.calculationMethod === "TABLE") {
  // Execute the GraphQL query to fetch active markets and their countries
    const response = await admin.graphql(`
      query getMarkets {
        markets(first: 10) {
          edges {
            node {
              name
              status
              regions(first: 50) {
                edges {
                  node {
                    name
                    ... on MarketRegionCountry {
                      code
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
    const responseJson = await response.json();
    const marketsData = responseJson.data?.markets?.edges || [];

    const countriesList: { label: string; value: string }[] = [];
    const seenCodes = new Set<string>();

    // Parse the markets data and extract unique countries
    marketsData.forEach((edge: any) => {
      const market = edge.node;
      
      // if (market.status === "ACTIVE") to only allow enabled markets
      market.regions?.edges?.forEach((regionEdge: any) => {
        const region = regionEdge.node;
        if (region.code && !seenCodes.has(region.code)) {
          seenCodes.add(region.code);
          countriesList.push({
            label: region.name,
            value: region.code
          });
        }
      });
    });
    // Sort countries alphabetically by their label
    countriesList.sort((a, b) => a.label.localeCompare(b.label));

    return json({ carrier, countries: countriesList });
  }else {
    return json({ carrier, countries: [] });
  }  
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id: carrierId } = params;
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const isActive = formData.get("isActive") === "true";
  
  const apiKeyRaw = formData.get("apiKey") as string | null;
  const apiSecretRaw = formData.get("apiSecret") as string | null;
  const apiAccountNumber = formData.get("apiAccountNumber") as string | null;
  const markupType = formData.get("markupType") as string;
  const markupValue = Number(formData.get("markupValue") || 0);

  // Encrypt the credentials again before updating the database
  const apiKey = apiKeyRaw ? encrypt(apiKeyRaw) : null;
  const apiSecret = apiSecretRaw ? encrypt(apiSecretRaw) : null;

  if (actionType === "UPDATE_CARRIER") {
    await prisma.carrier.update({
      where: { id: carrierId, shopDomain: session.shop },
      data: {
        name,
        description,
        isActive,
        apiKey,
        apiSecret,
        apiAccountNumber,
        markupType,
        markupValue,
      }
    });
    return json({ 
      success: true, 
      message: "Transportadora atualizada com sucesso." 
    });
  }

  if (actionType === "CREATE_RULE") {
    await prisma.rule.create({
      data: {
        carrierId: carrierId!,
        country: formData.get("country") as string,
        countryCode: (formData.get("countryCode") as string).toUpperCase(),
        matchType: formData.get("matchType") as string,
        postalCodeRange: formData.get("postalCodeRange") as string,
        conversionFactor: parseFloat(formData.get("conversionFactor") as string || "5000"),
      }
    });
    return json({ success: true, message: "Regra criada com sucesso." });
  }

  if (actionType === "DELETE_RULE") {
    await prisma.rule.delete({ where: { id: formData.get("ruleId") as string } });
    return json({ success: true, message: "Regra excluída com sucesso." });
  }
};

export default function CarrierEdit() {
  const { carrier, countries } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const actionData = useActionData<typeof action>();

  const [name, setName] = useState(carrier.name);
  const [description, setDescription] = useState(carrier.description);
  const [isActive, setIsActive] = useState(carrier.isActive ? "true" : "false");

  const [apiKey, setApiKey] = useState(carrier.apiKey || "");
  const [apiSecret, setApiSecret] = useState(carrier.apiSecret || "");
  const [apiAccountNumber, setApiAccountNumber] = useState(carrier.apiAccountNumber || "");
  const [markupType, setMarkupType] = useState(carrier.markupType || "PERCENTAGE");
  const [markupValue, setMarkupValue] = useState(carrier.markupValue?.toString() || "0");

  const [ruleData, setRuleData] = useState({ country: "", countryCode: "", type: "", postalCodeRange: "", conversionFactor: "" });
  
  const [filterCountryCode, setFilterCountryCode] = useState("");

  const handleAction = (type: string, data: any) => {
    const fd = new FormData();
    fd.append("actionType", type);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v as string));
    submit(fd, { method: "POST" });
  };

  // Format the countries list received from the loader for the Polaris Select component
  const countryOptions = useMemo(() => {
    return [
      { label: "Selecionar um país...", value: "" },
      ...countries.map((c) => ({ label: c.label, value: c.value }))
    ];
  }, [countries]);

  // Handle the selection change and update the existing ruleData state object
  const handleCountryChange = (value: string) => {
    // Find the matching country name based on the selected ISO code
    const matchedCountry = countries.find((c) => c.value === value);

    setRuleData((prev) => ({
      ...prev,
      countryCode: value,
      country: matchedCountry ? matchedCountry.label : ""
    }));
  };

  // Generate options for the filter dropdown, including a fallback to show all rules
  const filterCountryOptions = useMemo(() => {
    return [
      { label: "Selecionar um país...", value: "" },
      { label: "Mostrar todas as regras", value: "ALL" },
      ...countries.map((c) => ({ label: c.label, value: c.value }))
    ];
  }, [countries]);

  // Filter rules based on the selected country code
  const filteredRules = useMemo(() => {
    if (!filterCountryCode) {
      return [];
    }
    if (filterCountryCode === "ALL") {
      return carrier.rules;
    }
    return carrier.rules.filter((rule: any) => rule.countryCode === filterCountryCode);
  }, [carrier.rules, filterCountryCode]);

  useEffect(() => {
    // Check if there is a response from the action and if it was successful
    if (actionData && actionData.message) {
      if (actionData.success) {
        // Trigger the Shopify App Bridge toast
        shopify.toast.show(actionData.message, {
          duration: 3000,
        });
      } else {
        // Show an error toast if success is false
        shopify.toast.show(actionData.message, {
          duration: 4000,
          isError: true,
        });
      }
    }
  }, [actionData]);

  return (
    <Page title={`Configurar: ${carrier.name}`} backAction={{ url: "/app/carriers" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Informação Base</Text>
              <FormLayout>
                <FormLayout.Group>
                  {carrier.calculationMethod === "TABLE" ? (
                    <TextField label="Nome da Transportadora" value={name} onChange={setName} autoComplete="off" placeholder="Ex: CTT Expresso" />
                  ) : (
                    <Select label="Nome da Transportadora" options={[{label:'Selecione o nome',value:''},{label:'FedEx',value:'FedEx'},{label:'GLS',value:'GLS'}]} value={name} onChange={setName} />
                  )}
                  <Select label="Estado" options={[{label:'Ativo',value:'true'},{label:'Inativo',value:'false'}]} value={isActive} onChange={setIsActive} />
                </FormLayout.Group>
                <FormLayout.Group>
                  <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
                </FormLayout.Group>
              </FormLayout>
                {carrier.calculationMethod === "API" && (
                  <>
                    <Divider />
                    <FormLayout>
                        <Text variant="headingSm" as="h3">Configuração API</Text>
                        <TextField label="Número de Conta (opcional)" value={apiAccountNumber} onChange={setApiAccountNumber} autoComplete="off" />
                        <FormLayout.Group>
                          <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                          <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                        </FormLayout.Group>
                        <FormLayout.Group>
                          <Select label="Markup" options={[{label:'%',value:'PERCENTAGE'},{label:'€',value:'ABSOLUTE'}]} value={markupType} onChange={setMarkupType} />
                          <TextField label="Valor Markup" type="number" value={markupValue} onChange={setMarkupValue} autoComplete="off" />
                        </FormLayout.Group>
                    </FormLayout>
                  </>
                )}
                <InlineStack align="end">
                  <Button variant="primary" onClick={() => handleAction("UPDATE_CARRIER", { name, description, isActive, apiAccountNumber, apiKey, apiSecret, markupType, markupValue })} loading={isSubmitting}>Guardar Geral</Button>
                </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {carrier.calculationMethod === "TABLE" && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Regras de Código Postal</Text>
                <Text variant="bodyMd" as="p">Defina as áreas geográficas. Clique em "Gerir Tarifas" para configurar os preços associados.</Text>
                <FormLayout>
                  <FormLayout.Group>
                    <Select
                      label="País de Destino"
                      options={countryOptions}
                      onChange={handleCountryChange}
                      value={ruleData.countryCode}
                    />
                    {/* <TextField label="País" value={ruleData.country} onChange={(v)=>setRuleData({...ruleData, country:v})} autoComplete="off" disabled /> */}
                    <TextField label="Código País (ISO)" value={ruleData.countryCode} onChange={(v)=>setRuleData({...ruleData, countryCode:v})} autoComplete="off" maxLength={2} disabled />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <Select label="Tipo de Correspondência" options={[{label:'Selecione o tipo',value:''},{label:'Intervalo',value:'RANGE'},{label:'Prefixo',value:'PREFIX'},{label:'Exato',value:'EXACT'}]} value={ruleData.type} onChange={(v)=>setRuleData({...ruleData, type:v})} />
                    <TextField label="Código Postal" value={ruleData.postalCodeRange} onChange={(v)=>setRuleData({...ruleData, postalCodeRange:v})} autoComplete="off" placeholder="Ex: 4000-4999, 4*** ou SW" />
                    <TextField label="Fator de Conversão para peso volumétrico" type="number" value={ruleData.conversionFactor} onChange={(v)=>setRuleData({...ruleData, conversionFactor:v})} autoComplete="off" placeholder="Ex: 5000" />
                  </FormLayout.Group>
                  <div style={{ alignSelf: 'end' }}>
                    <Button 
                      disabled={!ruleData.postalCodeRange} 
                      onClick={() => {
                        handleAction("CREATE_RULE", { country: ruleData.country, countryCode: ruleData.countryCode, matchType: ruleData.type, postalCodeRange: ruleData.postalCodeRange, conversionFactor: ruleData.conversionFactor });
                        setRuleData({...ruleData, postalCodeRange: ""});
                      }}
                    >
                      Adicionar Regra
                    </Button>
                  </div>
                </FormLayout>

                {carrier.rules.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <BlockStack gap="400">
                      
                      <Select
                        label="Filtrar regras por país"
                        options={filterCountryOptions}
                        onChange={(value) => setFilterCountryCode(value)}
                        value={filterCountryCode}
                      />

                      <Divider />

                      {!filterCountryCode ? (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            Por favor, selecione um país no menu acima para visualizar as respetivas regras de envio.
                          </Text>
                        </div>
                      ) : filteredRules.length > 0 ? (
                        <IndexTable
                          resourceName={{ singular: "regra", plural: "regras" }}
                          itemCount={filteredRules.length}
                          headings={[
                            { title: "País" },
                            { title: "Tipo de Correspondência" },
                            { title: "Fator de conversão" },
                            { title: "Escalões" },
                            { title: "Ações" }
                          ]}
                          selectable={false}
                        >
                          {filteredRules.map((rule: any) => (
                            <IndexTable.Row id={rule.id} key={rule.id} position={rule.id}>
                              <IndexTable.Cell>
                                <Text variant="bodyMd" fontWeight="bold" as="span">
                                  {rule.country} ({rule.countryCode})
                                </Text>
                              </IndexTable.Cell>
                              <IndexTable.Cell>{rule.matchType}: {rule.postalCodeRange}</IndexTable.Cell>
                              <IndexTable.Cell>{rule.conversionFactor}</IndexTable.Cell>
                              <IndexTable.Cell>{rule.rates.length} escalões</IndexTable.Cell>
                              <IndexTable.Cell>
                                <InlineStack gap="200">
                                  <Button url={`/app/rule/${rule.id}`} variant="secondary">Gerir Tarifas</Button>
                                  <Button tone="critical" variant="plain" onClick={() => handleAction("DELETE_RULE", { ruleId: rule.id })}>Remover</Button>
                                </InlineStack>
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          ))}
                        </IndexTable>
                      ) : (
                        /* Condition 3: Country selected but no rules found */
                        <div style={{ textAlign: "center", padding: "20px" }}>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            Não existem regras associadas a este país.
                          </Text>
                        </div>
                      )}
                    </BlockStack>
                  </div>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}