import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  IndexTable, 
  Badge, 
  Text, 
  Button, 
  EmptyState,
  InlineStack,
} from "@shopify/polaris";
import { DeleteIcon } from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  const carriers = await prisma.carrier.findMany({
    where: { shopDomain: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ carriers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id") as string;
  const intent = formData.get("intent");

  if (intent === "delete") {
    try {
      const carrier = await prisma.carrier.findUnique({
        where: { id, shopDomain: session.shop },
        select: { isActive: true }
      });

      if (carrier?.isActive) {
        return json({ success: false, message: "Não podes eliminar uma transportadora ativa. Desativa-a primeiro." }, { status: 400 });
      }

      await prisma.carrier.delete({
        where: { id, shopDomain: session.shop },
      });
      return json({ success: true, message: "Transportadora eliminada com sucesso" });
      
    } catch (error) {
      return json({ success: false, message: "Erro ao eliminar transportadora" }, { status: 500 });
    }
  }

  if (intent === "toggle_status") {
    const isActive = formData.get("isActive") === "true";
    await prisma.carrier.update({
      where: { id, shopDomain: session.shop },
      data: { isActive },
    });
    return json({ success: true });
  }

  return json({ success: false }, { status: 400 });
}

export default function CarriersList() {
  const { carriers } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message, {
        isError: !fetcher.data.success
      });
    }
  }, [fetcher.data]);

  if (carriers.length === 0) {
    return (
      <Page title="Transportadoras">
        <Layout>
          <Layout.Section>
            <EmptyState
              heading="Ainda não tens transportadoras configuradas"
              action={{
                content: 'Criar Transportadora',
                onAction: () => navigate("/app/newCarrier"),
              }}
              image=""
            >
              <p>Cria a tua primeira transportadora para começares a gerir os teus envios.</p>
            </EmptyState>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const rowMarkup = carriers.map(
    ({ id, name, calculationMethod, isActive }, index) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">{name}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {calculationMethod === "API" ? "Integração via API" : "Tabela de tarifas"}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={isActive ? "success" : "attention"}>
            {isActive ? "Ativa" : "Inativa"}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button onClick={() => navigate(`/app/carrier/${id}`)}>Editar</Button>
              <div>
                <fetcher.Form method="post">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="intent" value="delete" />
                  <Button
                    tone="critical"
                    icon={DeleteIcon}
                    onClick={() => {
                      if (!confirm("Tens a certeza que pretendes eliminar esta transportadora? Esta ação não pode ser revertida.")) {
                        return;
                      }
                      const fd = new FormData();
                      fd.append("id", id);
                      fd.append("intent", "delete");
                      fetcher.submit(fd, { method: "post" });
                    }}
                    disabled={isActive}
                    loading={fetcher.state === "submitting" && fetcher.formData?.get("id") === id && fetcher.formData?.get("intent") === "delete"}
                  >
                    Eliminar
                  </Button>
                </fetcher.Form>
              </div>
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="intent" value="toggle_status" />
              <input type="hidden" name="isActive" value={String(!isActive)} />
              <Button variant="tertiary" submit>
                {isActive ? "Desativar" : "Ativar"}
              </Button>
            </fetcher.Form>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Transportadoras"
      primaryAction={{
        content: "Criar Transportadora",
        onAction: () => navigate("/app/newCarrier"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={{ singular: "transportadora", plural: "transportadoras" }}
              itemCount={carriers.length}
              headings={[
                { title: "Nome" },
                { title: "Método de Cálculo" },
                { title: "Estado" },
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