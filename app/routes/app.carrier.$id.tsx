import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Select, Button,
  BlockStack, Text, IndexTable, InlineStack, Divider
} from "@shopify/polaris";
import { useState, useMemo } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
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

  return json({ carrier });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id: carrierId } = params;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "UPDATE_CARRIER") {
    await prisma.carrier.update({
      where: { id: carrierId, shopDomain: session.shop },
      data: {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        isActive: formData.get("isActive") === "true",
        apiKey: formData.get("apiKey") as string || null,
        apiSecret: formData.get("apiSecret") as string || null,
        apiUrlRates: formData.get("apiUrlRates") as string || null,
        markupType: formData.get("markupType") as string || "PERCENTAGE",
        markupValue: parseFloat(formData.get("markupValue") as string || "0"),
      }
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
      }
    });
  }

  if (actionType === "DELETE_RULE") {
    await prisma.rule.delete({ where: { id: formData.get("ruleId") as string } });
  }

  return json({ success: true });
};

export default function CarrierEdit() {
  const { carrier } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState(carrier.name);
  const [description, setDescription] = useState(carrier.description);
  const [isActive, setIsActive] = useState(carrier.isActive ? "true" : "false");

  const [apiKey, setApiKey] = useState(carrier.apiKey || "");
  const [apiSecret, setApiSecret] = useState(carrier.apiSecret || "");
  const [apiUrlRates, setApiUrlRates] = useState(carrier.apiUrlRates || "");
  const [markupType, setMarkupType] = useState(carrier.markupType || "PERCENTAGE");
  const [markupValue, setMarkupValue] = useState(carrier.markupValue?.toString() || "0");

  const [ruleData, setRuleData] = useState({ country: "", countryCode: "", type: "", postalCodeRange: "" });
  
  const [searchCountry, setSearchCountry] = useState("");

  const handleAction = (type: string, data: any) => {
    const fd = new FormData();
    fd.append("actionType", type);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v as string));
    submit(fd, { method: "POST" });
  };

  const filteredRules = useMemo(() => {
    if (!searchCountry) return carrier.rules;
    return carrier.rules.filter((rule) =>
      rule.country.toLowerCase().includes(searchCountry.toLowerCase())
    );
  }, [carrier.rules, searchCountry]);

  return (
    <Page title={`Configurar: ${carrier.name}`} backAction={{ url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Informação Base</Text>
              <FormLayout>
                <FormLayout.Group>
                  <TextField label="Nome" value={name} onChange={setName} autoComplete="off" />
                  <Select label="Estado" options={[{label:'Ativo',value:'true'},{label:'Inativo',value:'false'}]} value={isActive} onChange={setIsActive} />
                </FormLayout.Group>
                <TextField label="Descrição" value={description} onChange={setDescription} autoComplete="off" />
                
                {carrier.calculationMethod === "API" && (
                  <>
                    <Divider />
                    <Text variant="headingSm" as="h3">Configuração API</Text>
                    <FormLayout.Group>
                      <TextField label="API Key" value={apiKey} onChange={setApiKey} autoComplete="off" />
                      <TextField label="API Secret" type="password" value={apiSecret} onChange={setApiSecret} autoComplete="off" />
                    </FormLayout.Group>
                    <TextField label="Endpoint Rates" value={apiUrlRates} onChange={setApiUrlRates} autoComplete="off" />
                    <FormLayout.Group>
                      <Select label="Markup" options={[{label:'%',value:'PERCENTAGE'},{label:'€',value:'ABSOLUTE'}]} value={markupType} onChange={setMarkupType} />
                      <TextField label="Valor Markup" type="number" value={markupValue} onChange={setMarkupValue} autoComplete="off" />
                    </FormLayout.Group>
                  </>
                )}
                <InlineStack align="end">
                  <Button variant="primary" onClick={() => handleAction("UPDATE_CARRIER", { name, description, isActive, apiKey, apiSecret, apiUrlRates, markupType, markupValue })} loading={isSubmitting}>Guardar Geral</Button>
                </InlineStack>
              </FormLayout>
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
                    <TextField label="País" value={ruleData.country} onChange={(v)=>setRuleData({...ruleData, country:v})} autoComplete="off" placeholder="Ex: Portugal" />
                    <TextField label="Código País (ISO)" value={ruleData.countryCode} onChange={(v)=>setRuleData({...ruleData, countryCode:v})} autoComplete="off" maxLength={2} placeholder="Ex: PT" />
                  </FormLayout.Group>
                  <FormLayout.Group>
                    <Select label="Tipo de Correspondência" options={[{label:'Intervalo (Range)',value:'RANGE'},{label:'Prefixo',value:'PREFIX'},{label:'Exato',value:'EXACT'}]} value={ruleData.type} onChange={(v)=>setRuleData({...ruleData, type:v})} />
                    <TextField label="Códigos Postais" value={ruleData.postalCodeRange} onChange={(v)=>setRuleData({...ruleData, postalCodeRange:v})} autoComplete="off" placeholder="Ex: 4000-4999, 4*** ou SW" />
                  </FormLayout.Group>
                  <div style={{ alignSelf: 'end' }}>
                    <Button 
                      disabled={!ruleData.postalCodeRange} 
                      onClick={() => {
                        handleAction("CREATE_RULE", { country: ruleData.country, countryCode: ruleData.countryCode, matchType: ruleData.type, postalCodeRange: ruleData.postalCodeRange });
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
                      
                      <TextField
                        label="Pesquisar país"
                        labelHidden
                        value={searchCountry}
                        onChange={setSearchCountry}
                        placeholder="Pesquisar por país..."
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={() => setSearchCountry("")}
                      />

                      <IndexTable 
                        resourceName={{singular:'regra',plural:'regras'}} 
                        itemCount={filteredRules.length} 
                        headings={[{title:'País'},{title:'Critério'},{title:'Tarifas'},{title:'Ações'}]} 
                        selectable={false}
                      >
                        {filteredRules.map((rule, i) => (
                          <IndexTable.Row id={rule.id} key={rule.id} position={i}>
                            <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{rule.country} ({rule.countryCode})</Text></IndexTable.Cell>
                            <IndexTable.Cell>{rule.matchType}: {rule.postalCodeRange}</IndexTable.Cell>
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

                      {filteredRules.length === 0 && searchCountry !== "" && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            Nenhum país encontrado com o termo "{searchCountry}".
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