import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  FormLayout,
  TextField,
  BlockStack,
  InlineStack,
  EmptyState,
  Box
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const countryGroups = await prisma.countryGroup.findMany({
    where: { shopDomain: session.shop },
    orderBy: { groupName: 'asc' },
  });

  // Agrupar os dados por nome de grupo para facilitar a renderização na UI
  const groups = countryGroups.reduce((acc: any, curr) => {
    if (!acc[curr.groupName]) acc[curr.groupName] = [];
    acc[curr.groupName].push(curr);
    return acc;
  }, {});

  return json({ groups });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add_country") {
    const countryName = formData.get("countryName") as string;
    const countryCode = (formData.get("countryCode") as string).toUpperCase();
    const groupName = formData.get("groupName") as string;

    try {
      await prisma.countryGroup.upsert({
        where: {
          shopDomain_countryCode: {
            shopDomain: session.shop,
            countryCode: countryCode,
          },
        },
        update: { groupName, countryName },
        create: {
          shopDomain: session.shop,
          countryCode,
          countryName,
          groupName,
        },
      });
      return json({ success: true, message: "País adicionado ao grupo com sucesso." });
    } catch (error) {
      return json({ success: false, message: "Erro ao adicionar país. Verifique se o código é único." }, { status: 400 });
    }
  }

  if (intent === "delete_country") {
    const id = formData.get("id") as string;
    await prisma.countryGroup.delete({ where: { id } });
    return json({ success: true, message: "País removido do grupo." });
  }

  return json({ success: false });
}

export default function CountryGroups() {
  const { groups } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [newCountryName, setNewCountryName] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.message);
      if (navigation.state === "idle") {
        setNewCountryName("");
        setNewCountryCode("");
      }
    } else if (actionData?.message) {
      shopify.toast.show(actionData.message, { isError: true });
    }
  }, [actionData, navigation.state]);

  const handleAddCountry = useCallback(() => {
    const formData = new FormData();
    formData.append("intent", "add_country");
    formData.append("countryName", newCountryName);
    formData.append("countryCode", newCountryCode);
    formData.append("groupName", newGroupName);
    submit(formData, { method: "post" });
  }, [newCountryName, newCountryCode, newGroupName, submit]);

  const handleDeleteCountry = (id: string) => {
    const formData = new FormData();
    formData.append("intent", "delete_country");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  const groupNames = Object.keys(groups);

  return (
    <Page title="Grupos de Envio por País">
      <Layout>
        {/* Formulário para Adicionar Países */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Adicionar País a Grupo</Text>
              <FormLayout>
                <TextField
                  label="Nome do Grupo"
                  value={newGroupName}
                  onChange={setNewGroupName}
                  placeholder="Ex: Ibéricos, Europa Norte"
                  autoComplete="off"
                />
                <TextField
                  label="Nome do País"
                  value={newCountryName}
                  onChange={setNewCountryName}
                  placeholder="Ex: Portugal"
                  autoComplete="off"
                />
                <TextField
                  label="Código do País (SIGLA)"
                  value={newCountryCode}
                  onChange={setNewCountryCode}
                  placeholder="Ex: PT"
                  autoComplete="off"
                  helpText="Utilize o formato de dois carateres."
                />
                <Button 
                  onClick={handleAddCountry} 
                  loading={isSaving} 
                  icon={PlusIcon}
                  disabled={!newGroupName || !newCountryName || !newCountryCode}
                >
                  Adicionar ao Grupo
                </Button>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Listagem de Grupos Existentes */}
        <Layout.Section>
          <BlockStack gap="400">
            {groupNames.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Sem grupos definidos"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/empty-state-cards_customer-delivery-service.svg"
                >
                  <p>Adicione o seu primeiro país e grupo para começar a organizar as tarifas de envio.</p>
                </EmptyState>
              </Card>
            ) : (
              groupNames.map((groupName) => (
                <Card key={groupName} padding="0">
                  <Box padding="400">
                    <InlineStack align="space-between">
                      <Text variant="headingMd" as="h3">{groupName}</Text>
                      <Badge tone="info">{groups[groupName].length} Países</Badge>
                    </InlineStack>
                  </Box>
                  <ResourceList
                    resourceName={{ singular: 'país', plural: 'países' }}
                    items={groups[groupName]}
                    renderItem={(item: any) => {
                      const { id, countryName, countryCode } = item;
                      return (
                        <ResourceItem id={id} onClick={() => {}}>
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold">{countryName}</Text>
                              <Text variant="bodySm" tone="subdued">{countryCode}</Text>
                            </BlockStack>
                            <Button 
                              icon={DeleteIcon} 
                              tone="critical" 
                              variant="tertiary"
                              onClick={() => handleDeleteCountry(id)}
                            />
                          </InlineStack>
                        </ResourceItem>
                      );
                    }}
                  />
                </Card>
              ))
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}