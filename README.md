# Shipping App

A Shopify embedded app (Remix) for configuring custom carrier shipping rates and automating label/fulfillment workflows.

## What it does

Merchants configure one or more **carriers**, each using one of two pricing methods:

- **Table (manual)** — define rules per country/postal-code pattern (`RANGE`, `PREFIX`, or `EXACT`), each rule mapping shipment weight bands to a price and delivery time.
- **API (dynamic)** — fetch live rates from a carrier's API (FedEx, DHL, UPS, GLS) at checkout time, with an optional markup (percentage or fixed) applied on top.

Rates are served to Shopify's [Carrier Service API](https://shopify.dev/docs/apps/build/shipping-delivery) via `app/routes/api.shippingRates.tsx`, and orders can have shipping labels generated automatically through the carrier-specific integrations in `app/utils/shipping/`.

## Project structure

```
app/
  routes/
    app.carriers.tsx          # list carriers
    app.newCarrier.tsx        # create carrier
    app.carrier.$id.tsx       # edit carrier + manage postal-code rules
    app.rule.$id.tsx          # manage weight/price rates for a rule
    app.orders.tsx            # order overview / fulfillment actions
    app.adicionalRules.tsx    # free shipping threshold & default package dimensions
    api.shippingRates.tsx     # Carrier Service callback — returns calculated rates
  services/
    finalCarrier.ts           # carrier/rate selection logic for a given order
    shippingLabel.ts          # dispatches label generation per carrier
  utils/
    rates/                    # per-carrier rate-fetching (FedEx, DHL, UPS, GLS) + table rates
    shipping/                 # per-carrier label/shipment creation (FedEx, DHL, UPS)
    encryption.ts             # encrypt/decrypt stored API credentials
    logger.ts                 # winston logger
prisma/
  schema.prisma               # Session, StoreConfig, Carrier, Rule, Rate models
```

## Data model

- `Carrier` — name, calculation method, encrypted API credentials, markup config.
- `Rule` — a country/postal-code pattern belonging to a carrier (table method only).
- `Rate` — a weight-band price/delivery-time tier belonging to a rule.
- `StoreConfig` — per-shop free-shipping threshold and default package dimensions (used when a product is missing weight/dimensions).

## Local development

Requires Node `>=20.19 <22` or `>=22.12`, a Shopify Partner account, and the [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started).

```shell
npm install
npm run setup   # prisma generate + migrate deploy
npm run dev      # shopify app dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run deploy` (deploy app config/extensions to Shopify).

## Carrier API credentials

API-method carriers store their key/secret encrypted (`app/utils/encryption.ts`) in the `Carrier` table. The underlying carrier base URLs (e.g. `DHL_BASE_URL`, `UPS_BASE_URL`, `GLS_BASE_URL`) are read from environment variables — see `.env`.

## Known gap

`app/utils/rates/apiRates.ts` (`calculateAPIRates`) currently dispatches rate requests for `FedEx`, `DHL`, and `UPS` only — `GLSRates.ts` exists but isn't wired into that dispatcher yet.
