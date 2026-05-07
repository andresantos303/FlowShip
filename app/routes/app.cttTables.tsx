import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack, DataTable } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  // Fetch all required data concurrently
  const [cttZones, cttPricing, cttIslandsPricing] = await Promise.all([
    prisma.cttZoneMatrix.findMany(),
    prisma.cttPricing.findMany({ orderBy: { maxWeight: 'asc' } }),
    prisma.cttIslandsPricing.findMany({ orderBy: { maxWeight: 'asc' } })
  ]);

  return ({ cttZones, cttPricing, cttIslandsPricing });
}

export default function CttTables() {
  const { cttZones, cttPricing, cttIslandsPricing } = useLoaderData<typeof loader>();

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  // Build matrix rows
  const matrixRows = digits.map(origin => {
    const row = [origin + 'xxx'];
    
    digits.forEach(dest => {
      const zone = cttZones.find(z => z.originDigit === origin && z.destDigit === dest);
      row.push(zone ? zone.zoneName : '');
    });
    
    return row;
  });

  // Build pricing rows for T1 and T2
  const pricingRows = cttPricing.map(p => [
    p.weightLabel,
    `${p.priceT1.toFixed(2).replace('.', ',')} €`,
    `${p.priceT2.toFixed(2).replace('.', ',')} €`
  ]);

  // Build pricing rows for Islands
  const islandsPricingRows = cttIslandsPricing.map(p => [
    p.weightLabel,
    `${p.price.toFixed(2).replace('.', ',')} €`
  ]);

  return (
    <Page title="Tabelas CTT">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="400">
              <div style={{ padding: '20px 30px 0 30px', textAlign: 'center' }}>
                <Text as="span" variant="bodyMd">Código postal de destino</Text>
              </div>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                headings={[
                  'Código postal de origem', 
                  '1xxx', '2xxx', '3xxx', '4xxx', '5xxx', '6xxx', '7xxx', '8xxx'
                ]}
                rows={matrixRows}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <BlockStack gap="500">
            <Card padding="0">
              <div style={{ padding: '16px' }}>
                <Text variant="headingMd" as="h2">Tarifas Ilhas (9xxx)</Text>
              </div>
              <DataTable
                columnContentTypes={['text', 'numeric']}
                headings={['Escalão de peso', 'Preço Base']}
                rows={islandsPricingRows}
              />
            </Card>
          </BlockStack>
        </Layout.Section>
        
        <Layout.Section variant="oneHalf">
          <BlockStack gap="500">
            <Card padding="0">
              <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">Zonas</Text>
            </div>
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric']}
                headings={['Escalão de peso', 'T1', 'T2']}
                rows={pricingRows}
              />
            </Card>
            
            <div style={{ padding: '0 4px' }}>
              <Text as="p" variant="bodyMd" fontWeight="medium">
                Taxas extras: Entrega ao domicílio - 2.95€ até 5kg | 3.35€ até 10kg
              </Text>
              <br/>
              <Text as="p" variant="bodyMd" fontWeight="medium">
                Peso máximo: 10kg
              </Text>
            </div>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}