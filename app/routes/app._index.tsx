// app/routes/app.onboarding.tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  List,
  InlineStack,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Authenticate the session before rendering the page
  await authenticate.admin(request);
  return json({});
}

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <Page title="Configuração Inicial">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">
                Bem-vindo ao Gestor de Envios
              </Text>
              
              <Text as="p" variant="bodyMd">
                Para começares a automatizar os cálculos de portes de envio e a gerir os teus serviços de entrega na loja, deves concluir a configuração inicial da aplicação.
              </Text>
              
              <Divider />

              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  Passos para a ativação do serviço:
                </Text>
                
                <List type="number">
                  <List.Item>
                    <strong>Configurar métodos de cálculo:</strong> Podes optar por introduzir tabelas manuais estruturadas por zonas e pesos ou ativar ligações automáticas através de chaves de API das tuas transportadoras.
                  </List.Item>
                  <List.Item>
                    <strong>Definir margens de lucro:</strong> Escolhe se queres aplicar taxas adicionais (*markup*) fixas ou percentuais sobre o valor real do envio para cobrir custos operacionais.
                  </List.Item>
                  <List.Item>
                    <strong>Disponibilizar tarifas no checkout:</strong> Garante que as novas opções aparecem corretamente configuradas para os clientes no momento da finalização de compra.
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <InlineStack align="end">
                <Button variant="primary" onClick={() => navigate("/app/newCarrier")}>
                  Começar e Criar Transportadora
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}