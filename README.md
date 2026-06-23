# Agentity AI Monorepo

Agentity is a Hedera-backed trust, simulation, payment, and audit platform for autonomous AI agents.

The platform helps teams answer a practical question before an AI agent moves value or acts inside a production workflow: can this agent be identified, simulated, scored, paid, executed, and audited with a tamper-evident proof trail?

## Why Hedera

Hedera is a strong fit for Agentity's trust layer because the product needs high-throughput proofs, predictable fees, fast finality, and easy enterprise integration. In this repo, Hedera is used for:

- Hedera Consensus Service proof notarization for agent registration, verification, and task execution.
- Hedera account linkage for agent identity and settlement readiness.
- HBAR and HTS payment flows, with simulated mode for local testing and live mode for funded environments.
- Mirror node and HashScan references for proof and transaction inspection.

The app still keeps sandbox simulation, policy checks, alerts, KMS audit signing, and database persistence off-chain where they belong. Hedera is the trust and settlement layer, not a replacement for application-level validation.

## Monorepo Structure

```text
.
├── apps
│   ├── client              # React/Vite frontend
│   └── server              # Express API, database schema, tests, smoke runner
├── docs
│   ├── API_INTEGRATION_GUIDE.md
│   └── TESTING_GUIDE.md
├── docker-compose.yml      # Local PostgreSQL helper
├── package.json            # Workspace orchestration
└── package-lock.json
```

## Core Product Flow

1. Register an AI agent with a stable public identity.
2. Link the agent to a Hedera account.
3. Verify the agent and create a Hedera proof record.
4. Run sandbox simulations before execution.
5. Apply transaction policies and guardrails.
6. Quote and settle payment in HBAR or an HTS token.
7. Execute the task through the Agentity trust workflow.
8. Persist audit logs, alerts, transaction records, and Hedera proof history.

## Stack

- Node.js, Express, Sequelize
- PostgreSQL or Supabase Postgres
- Supabase Auth with JWT bearer tokens and httpOnly cookie support
- Hedera JavaScript SDK for HCS proofs and HBAR/HTS transfers
- Hedera mirror node and HashScan URLs for inspection
- React 19, Vite 7, Zustand, Axios, Tailwind CSS 4
- Swagger/OpenAPI at `/docs`
- Docker sandbox service for agent simulation
- Optional AWS KMS signing for execution audit payloads

## Requirements

- Node.js 18+
- npm 10+
- PostgreSQL or Supabase database
- Docker if running sandbox images locally
- Hedera testnet or mainnet operator credentials only when live proofs or transfers are required

## Install

```bash
npm install
```

## Environment

Backend:

```bash
cp apps/server/.env.example apps/server/.env
```

Required backend values:

```bash
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
DB_SYNC_ON_START=false
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PUBLIC_API_BASE_URL=http://localhost:5000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Hedera values:

```bash
HEDERA_NETWORK=mainnet
HEDERA_MIRROR_NODE_URL=https://mainnet-public.mirrornode.hedera.com
HEDERA_OPERATOR_ACCOUNT_ID=
HEDERA_OPERATOR_PRIVATE_KEY=
HEDERA_OPERATOR_KEY_PATH=
HEDERA_CONSENSUS_TOPIC_ID=
HEDERA_DEFAULT_TOKEN_ID=
HEDERA_ENABLE_REAL_PROOFS=true
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Pricing values:

```bash
HEDERA_PRICE_HBAR_SIMULATION=0.10
HEDERA_PRICE_HBAR_AUDIT=0.20
HEDERA_PRICE_HBAR_EXECUTION=0.50
HEDERA_PRICE_HBAR_COORDINATION=0.15
HEDERA_PRICE_HTS_EXECUTION=5.00
```

Client:

```bash
cp apps/client/.env.example apps/client/.env
```

For local development:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Development

Run the API:

```bash
npm run dev:api
```

Run the client:

```bash
npm run dev:client
```

By default, the API uses port `5000` and Vite uses port `5173`.

## Database

Start local Postgres if needed:

```bash
docker compose up -d postgres
```

Apply the schema:

```bash
npm run db:schema:apply
```

For local model sync only:

```bash
DB_SYNC_ON_START=true
```

## API Documentation

Swagger is served by the backend:

```text
GET /docs
```

Important integration endpoints:

- `GET /health`
- `GET /system/status`
- `GET /hedera/status`
- `GET /hedera/transactions/:transactionId`
- `POST /auth/register`
- `POST /auth/login`
- `GET /agents/types`
- `POST /agents/register`
- `GET /agents/my`
- `POST /agents/:id/verify`
- `GET /agents/:id/hedera-history`
- `POST /wallets/link`
- `GET /simulation/scenarios`
- `POST /simulation/run`
- `POST /tasks/request`
- `POST /tasks/:id/simulate`
- `POST /tasks/:id/pay`
- `POST /tasks/:id/execute`
- `GET /payments/pricing`
- `GET /payments/history`
- `GET /transactions/history`
- `GET /transactions/policies`
- `POST /transactions/policies`
- `GET /integrations/overview`
- `GET /integrations/snippets/:type`
- `GET /alerts`
- `GET /alerts/summary`

See [API_INTEGRATION_GUIDE.md](docs/API_INTEGRATION_GUIDE.md) for partner-facing payload examples.

## Testing

Backend unit tests:

```bash
npm run test:api
```

Client lint and production build:

```bash
npm run test:client
```

Full local verification:

```bash
npm run test:all
```

Smoke test against a running API:

```bash
npm run smoke
```

See [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for real-life testing scenarios such as treasury monitoring, payment settlement, risky execution handling, and integration partner onboarding.

## Hedera Proof And Payment Modes

`GET /hedera/status` and `GET /system/status` report:

- network
- mirror node URL
- operator account ID
- HCS topic ID
- live proof availability
- live payment availability
- config errors

If operator credentials or an HCS topic are not configured, the backend still completes local flows using simulated Hedera proof records. This keeps demos, development, and automated testing safe.

Live proofs require:

```bash
HEDERA_OPERATOR_ACCOUNT_ID=0.0.x
HEDERA_OPERATOR_PRIVATE_KEY=...
HEDERA_CONSENSUS_TOPIC_ID=0.0.y
HEDERA_ENABLE_REAL_PROOFS=true
```

Recommended production setup:

```bash
HEDERA_NETWORK=mainnet
HEDERA_MIRROR_NODE_URL=https://mainnet-public.mirrornode.hedera.com
HEDERA_OPERATOR_ACCOUNT_ID=0.0.x
HEDERA_OPERATOR_KEY_PATH=/run/secrets/hedera-operator-key
HEDERA_CONSENSUS_TOPIC_ID=0.0.y
HEDERA_DEFAULT_TOKEN_ID=
HEDERA_ENABLE_REAL_PROOFS=true
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Use `HEDERA_OPERATOR_PRIVATE_KEY` only when your deployment platform stores it as a protected secret. If the platform supports secret files, prefer `HEDERA_OPERATOR_KEY_PATH`. `HEDERA_DEFAULT_TOKEN_ID` can stay blank for HBAR-only flows; set it only when enabling an HTS token.

Live transfers additionally require:

```bash
HEDERA_ENABLE_REAL_TRANSFERS=true
```

Keep real transfers disabled until the operator account, limits, policies, and mainnet funding are reviewed.

After setting mainnet values:

```bash
npm run db:migrate:hedera
npm run start
curl http://localhost:5000/hedera/status
npm run smoke
```

`/hedera/status` should show `network: "mainnet"`, `operatorConfigured: true`, `operatorCanSubmit: true`, `proofMode: "hcs-topic"`, and your `consensusTopicId`. The smoke output should stop reporting simulated proof sync once operator credentials and topic ID are valid.

## Security Notes

- Never commit `.env` files or Hedera private keys.
- Keep `HEDERA_ENABLE_REAL_TRANSFERS=false` in demos until payment behavior is approved.
- Treat all external agent outputs as untrusted, even when a proof exists.
- Use sandbox simulation and transaction policies before execution.
- Use KMS signing for higher-value execution audit payloads.
- Verify HashScan and mirror node data before using live transaction IDs in partner demos.

## Repository Remote

This working tree is intended to connect to:

```text
https://github.com/Agentity-AI/agentityMonorepo.git
```

## Business Positioning

Agentity is positioned as an AI agent trust platform for teams building in Web3, financial operations, DAO tooling, autonomous workflows, and agent marketplaces. The Hedera integration gives the product a credible, scalable trust layer while the application keeps the operational controls investors and partners will expect: identity, simulation, policy enforcement, payments, audit trails, alerts, and integration-ready APIs.
