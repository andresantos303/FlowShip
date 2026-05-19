import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Select, Button,
  BlockStack, Text, IndexTable, InlineStack, Badge, Divider, Box
} from "@shopify/polaris";
import { useState, useCallback, useMemo } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const carrier = await prisma.carrier.findUnique({
    where: { id, shopDomain: session.shop },
    include: {
      zones: {
        include: { rules: true, rates: true }
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

  // 1. Atualizar Transportadora (Geral + API)
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

  // 2. Gestão de Zonas
  if (actionType === "CREATE_ZONE") {
    await prisma.zone.create({
      data: {
        carrierId: carrierId!,
        name: formData.get("zoneName") as string,
      }
    });
  }

  if (actionType === "DELETE_ZONE") {
    await prisma.zone.delete({ where: { id: formData.get("zoneId") as string } });
  }

  // 3. Gestão de Regras Postais
  if (actionType === "CREATE_RULE") {
    await prisma.postalRule.create({
      data: {
        zoneId: formData.get("zoneId") as string,
        countryCode: (formData.get("countryCode") as string).toUpperCase(),
        matchType: formData.get("matchType") as string,
        valueMin: formData.get("valueMin") as string,
        valueMax: formData.get("valueMax") as string || null,
      }
    });
  }

  if (actionType === "DELETE_RULE") {
    await prisma.postalRule.delete({ where: { id: formData.get("ruleId") as string } });
  }

  // 4. Gestão de Tarifas
  if (actionType === "CREATE_RATE") {
    await prisma.carrierRate.create({
      data: {
        carrierId: carrierId!,
        zoneId: formData.get("zoneId") as string,
        maxWeight: parseFloat(formData.get("maxWeight") as string),
        price: parseFloat(formData.get("price") as string),
        deliveryTime: parseInt(formData.get("deliveryTime") as string, 10),
      }
    });
  }

  if (actionType === "DELETE_RATE") {
    await prisma.carrierRate.delete({ where: { id: formData.get("rateId") as string } });
  }

  return json({ success: true });
};

export default function CarrierEdit() {
  const { carrier } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Estados Gerais
  const [name, setName] = useState(carrier.name);
  const [description, setDescription] = useState(carrier.description);
  const [isActive, setIsActive] = useState(carrier.isActive ? "true" : "false");

  // Estados API
  const [apiKey, setApiKey] = useState(carrier.apiKey || "");
  const [apiSecret, setApiSecret] = useState(carrier.apiSecret || "");
  const [apiUrlRates, setApiUrlRates] = useState(carrier.apiUrlRates || "");
  const [markupType, setMarkupType] = useState(carrier.markupType || "PERCENTAGE");
  const [markupValue, setMarkupValue] = useState(carrier.markupValue?.toString() || "0");

  // Estados para Criação (Zonas, Regras, Preços)
  const [newZoneName, setNewZoneName] = useState("");
  const [ruleData, setRuleData] = useState({ zoneId: "", country: "PT", type: "", min: "", max: "" });
  const [rateData, setRateData] = useState({ zoneId: "", weight: "", price: "", time: "3" });

  const handleAction = (type: string, data: any) => {
    const fd = new FormData();
    fd.append("actionType", type);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v as string));
    submit(fd, { method: "POST" });
  };

  return (
    <Page title={`Configurar: ${carrier.name}`} backAction={{ url: "/app" }}>
      <Layout>
        {/* SECÇÃO 1: DADOS GERAIS E API */}
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

        {/* SECÇÃO 2: GESTÃO DE ZONAS (Apenas para TABLE) */}
        {carrier.calculationMethod === "TABLE" && (
          <>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Zonas de Destino</Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField label="Novo Nome de Zona (ex: Continental)" value={newZoneName} onChange={setNewZoneName} autoComplete="off" />
                      <div style={{ alignSelf: 'end' }}>
                        <Button onClick={() => { handleAction("CREATE_ZONE", { zoneName: newZoneName }); setNewZoneName(""); }}>Criar Zona</Button>
                      </div>
                    </FormLayout.Group>
                  </FormLayout>

                  <IndexTable resourceName={{singular:'zona',plural:'zonas'}} itemCount={carrier.zones.length} headings={[{title:'Nome'},{title:'Regras'},{title:'Preços'},{title:'Ações'}]} selectable={false}>
                    {carrier.zones.map((zone, i) => (
                      <IndexTable.Row id={zone.id} key={zone.id} position={i}>
                        <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{zone.name}</Text></IndexTable.Cell>
                        <IndexTable.Cell>{zone.rules.length} regras</IndexTable.Cell>
                        <IndexTable.Cell>{zone.rates.length} escalões</IndexTable.Cell>
                        <IndexTable.Cell>
                          <Button tone="critical" variant="plain" onClick={() => handleAction("DELETE_ZONE", { zoneId: zone.id })}>Remover</Button>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* SECÇÃO 3: REGRAS POSTAIS POR ZONA */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Regras de Correspondência (Códigos Postais)</Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select 
                        label="Zona Destino" 
                        options={[{label: 'Selecionar Zona', value: ''}, ...carrier.zones.map(z => ({label: z.name, value: z.id}))]} 
                        value={ruleData.zoneId} 
                        onChange={(v)=>setRuleData({...ruleData, zoneId:v})} 
                      />
                      <TextField label="País (ISO)" value={ruleData.country} onChange={(v)=>setRuleData({...ruleData, country:v})} autoComplete="off" maxLength={2} />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <Select label="Tipo" options={[{label:'Selecionar Tipo',value:''},{label:'Tudo',value:'ALL'},{label:'Intervalo',value:'RANGE'},{label:'Prefixo',value:'PREFIX'}]} value={ruleData.type} onChange={(v)=>setRuleData({...ruleData, type:v})} />
                      <TextField label="Valor Min/Prefixo" value={ruleData.min} onChange={(v)=>setRuleData({...ruleData, min:v})} autoComplete="off" disabled={ruleData.type==='ALL'} />
                      {ruleData.type === 'RANGE' && <TextField label="Valor Máx" value={ruleData.max} onChange={(v)=>setRuleData({...ruleData, max:v})} autoComplete="off" />}
                    </FormLayout.Group>
                    <div style={{ alignSelf: 'end' }}>
                      <Button 
                        disabled={!ruleData.zoneId || (ruleData.type !== 'ALL' && !ruleData.min)} 
                        onClick={() => {
                          handleAction("CREATE_RULE", { zoneId: ruleData.zoneId, countryCode: ruleData.country, matchType: ruleData.type, valueMin: ruleData.min, valueMax: ruleData.max });
                          setRuleData({...ruleData, min: "", max: ""}); // Clean inputs after add
                        }}
                      >
                        Adicionar Regra
                      </Button>
                    </div>
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* SECÇÃO 4: PREÇOS POR ZONA */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Tabela de Preços (Escalões de Peso)</Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select 
                        label="Zona" 
                        options={[{label: 'Selecionar Zona', value: ''}, ...carrier.zones.map(z => ({label: z.name, value: z.id}))]} 
                        value={rateData.zoneId} 
                        onChange={(v)=>setRateData({...rateData, zoneId:v})} 
                      />
                      <TextField label="Até (Kg)" type="number" value={rateData.weight} onChange={(v)=>setRateData({...rateData, weight:v})} autoComplete="off" />
                    </FormLayout.Group>
                    <FormLayout.Group>
                      <TextField label="Preço (€)" type="number" value={rateData.price} onChange={(v)=>setRateData({...rateData, price:v})} autoComplete="off" prefix="€" />
                      <TextField label="Entrega (Dias)" type="number" value={rateData.time} onChange={(v)=>setRateData({...rateData, time:v})} autoComplete="off" />
                    </FormLayout.Group>
                    <div style={{ alignSelf: 'end' }}>
                      <Button 
                        variant="primary" 
                        disabled={!rateData.zoneId || !rateData.weight || !rateData.price} 
                        onClick={() => {
                          handleAction("CREATE_RATE", { zoneId: rateData.zoneId, maxWeight: rateData.weight, price: rateData.price, deliveryTime: rateData.time });
                          setRateData({...rateData, weight: "", price: ""}); // Clean inputs after add
                        }}
                      >
                        Adicionar Preço
                      </Button>
                    </div>
                  </FormLayout>
                </BlockStack>
              </Card>
            </Layout.Section>
          </>
        )}
      </Layout>
    </Page>
  );
}