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
  Divider,
  CalloutCard,
  Icon,
  FooterHelp,
  Link
} from "@shopify/polaris";
import {
  SettingsIcon,
  CashDollarIcon,
  PackageIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <Page title="Configuração Inicial">
      <Layout>
        <Layout.Section>
          <CalloutCard
            title="Bem-vindo ao FlowShip"
            illustration=""
            primaryAction={{
              content: 'Criar Transportadora',
              onAction: () => navigate("/app/newCarrier"),
            }}
          >
            <p>
              Automatiza os cálculos de portes de envio e otimiza a gestão das tuas entregas. O teu novo motor de decisão logística está pronto para ser configurado e ligado à tua loja.
            </p>
          </CalloutCard>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text variant="headingMd" as="h2">
                Passos para a ativação do serviço
              </Text>
              
              <BlockStack gap="400">
                <InlineStack wrap={false} gap="400" blockAlign="start">
                  <Icon source={SettingsIcon} tone="primary" />
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">1. Configurar métodos de cálculo</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Introduz regras estruturadas por zonas e pesos para cada transportadora, ou ativa ligações automáticas através de chaves de API das tuas transportadoras.
                    </Text>
                  </BlockStack>
                </InlineStack>

                <InlineStack wrap={false} gap="400" blockAlign="start">
                  <Icon source={CashDollarIcon} tone="primary" />
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">2. Definir margens de lucro</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Aplica taxas adicionais fixas ou percentuais sobre o valor real do envio recebido da api da transportadora para cobrir os teus custos operacionais.
                    </Text>
                  </BlockStack>
                </InlineStack>

                <InlineStack wrap={false} gap="400" blockAlign="start">
                  <Icon source={PackageIcon} tone="primary" />
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">3. Disponibilizar tarifas aos clientes</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Garante que as novas opções de envio aparecem corretamente configuradas no momento da finalização de compra.
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
              
              <Divider />
              
              <InlineStack align="end">
                <Button variant="primary" onClick={() => navigate("/app/newCarrier")}>
                  Começar agora
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Recursos de apoio</Text>
                <List>
                  <List.Item>
                    <Link url="#">Documentação oficial</Link>
                  </List.Item>
                  <List.Item>
                    <Link url="#">Guia de transportadoras</Link>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            
            <Card background="bg-surface-secondary">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Precisas de ajuda?</Text>
                <Text as="p" variant="bodyMd">
                  Se tiveres dúvidas durante a configuração, a nossa equipa de suporte está disponível para te ajudar a integrar todas as regras da loja.
                </Text>
                <InlineStack>
                  <Button onClick={() => console.log("Contactar Suporte")}>
                    Contactar suporte
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      <FooterHelp>
        Descobre mais sobre logística e envios na{' '}
        <Link url="https://help.shopify.com/pt-PT/manual/shipping">
          Central de Ajuda da Shopify
        </Link>.
      </FooterHelp>
    </Page>
  );
}