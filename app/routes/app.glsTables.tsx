import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, IndexTable, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Fetch all GLS related data
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const [pricing, deliveryTimes, euroZones] = await Promise.all([
    prisma.glsPricing.findMany({ orderBy: [{ zoneName: 'asc' }, { sizeLabel: 'asc' }] }),
    prisma.glsDeliveryTime.findMany({ orderBy: { zoneName: 'asc' } }),
    prisma.glsEuroZone.findMany({ orderBy: { countryCode: 'asc' } })
  ]);
  return { pricing, deliveryTimes, euroZones };
}

export default function GlsTables() {
  const { pricing, deliveryTimes, euroZones } = useLoaderData<typeof loader>();

  return (
    <Page title="Tabelas GLS">
      <Layout>
        {/* Tabela de Preços */}
        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">Tarifas por Zona e Tamanho</Text>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', height: '350px' }}>
              <IndexTable
                resourceName={{ singular: 'preço', plural: 'preços' }}
                itemCount={pricing.length}
                headings={[
                  { title: 'Zona' },
                  { title: 'Tamanho (Size Label)' },
                  { title: 'Preço Base (€)' },
                ]}
                selectable={false}
              >
                {pricing.map(({ id, zoneName, sizeLabel, basePrice }, index) => (
                  <IndexTable.Row id={id} key={id} position={index}>
                    <IndexTable.Cell>{zoneName}</IndexTable.Cell>
                    <IndexTable.Cell>{sizeLabel}</IndexTable.Cell>
                    <IndexTable.Cell>{basePrice.toFixed(2)} €</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </div>
          </Card>
        </Layout.Section>

        {/* Tempos de Entrega */}
        <Layout.Section variant="oneHalf">
          <Card padding="0">
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">Tempos de Entrega</Text>
            </div>
            <IndexTable
              resourceName={{ singular: 'tempo', plural: 'tempos' }}
              itemCount={deliveryTimes.length}
              headings={[
                { title: 'Zona' },
                { title: 'Dias (Mín - Máx)' },
              ]}
              selectable={false}
            >
              {deliveryTimes.map(({ id, zoneName, minDays, maxDays }, index) => (
                <IndexTable.Row id={id} key={id} position={index}>
                  <IndexTable.Cell>{zoneName}</IndexTable.Cell>
                  <IndexTable.Cell>{minDays} a {maxDays} dias</IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>

        {/* Zonas Euro */}
        <Layout.Section variant="oneHalf">
          <Card padding="0">
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">Mapeamento de Países (Zonas Euro)</Text>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', height: '300px' }}>
              <IndexTable
                resourceName={{ singular: 'país', plural: 'países' }}
                itemCount={euroZones.length}
                headings={[
                  { title: 'Código do País' },
                  { title: 'Zona Atribuída' },
                ]}
                selectable={false}
              >
                {euroZones.map(({ id, countryCode, zoneName }, index) => (
                  <IndexTable.Row id={id} key={id} position={index}>
                    <IndexTable.Cell>{countryCode}</IndexTable.Cell>
                    <IndexTable.Cell>{zoneName}</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}