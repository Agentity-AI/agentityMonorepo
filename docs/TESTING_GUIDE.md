# Agentity Testing Guide

This guide is designed to prove the platform is ready for serious partner and investor demos, not just local happy paths.

## 1. Local Setup Check

Install dependencies:

```bash
npm install
```

Start Postgres:

```bash
docker compose up -d postgres
```

Create backend env:

```bash
cp apps/server/.env.example apps/server/.env
```

Set `DATABASE_URL`, Supabase keys, and keep these safe defaults:

```bash
HEDERA_NETWORK=testnet
HEDERA_ENABLE_REAL_PROOFS=false
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Apply schema:

```bash
npm run db:schema:apply
```

Start API:

```bash
npm run dev:api
```

Expected:

```http
GET /health -> 200 healthy
GET /hedera/status -> ready or degraded with clear configErrors
```

## 2. Automated Tests

Run backend unit tests:

```bash
npm run test:api
```

Run client lint and build:

```bash
npm run test:client
```

Run all:

```bash
npm run test:all
```

Smoke test against a running API:

```bash
npm run smoke
```

Useful smoke variables:

```bash
SMOKE_BASE_URL=http://localhost:5000
SMOKE_EMAIL=founder-smoke@example.com
SMOKE_PASSWORD=SmokeTest123
SMOKE_HEDERA_ACCOUNT_ID=0.0.1234567
SMOKE_HEDERA_PUBLIC_KEY=302a300506032b6570032100...
```

## 3. Real-Life Scenario: Treasury Risk Monitor

Goal: prove an AI agent can be verified, simulated, paid, executed, and audited before touching treasury workflows.

1. Register a `Treasury Risk Monitor` agent.
2. Link a Hedera testnet account.
3. Verify the agent.
4. Confirm `/agents/{id}/hedera-history` returns at least one proof row.
5. Create a task with:

```json
{
  "taskType": "execution",
  "inputPayload": {
    "target": "treasury-payment-review",
    "amount": 2500,
    "asset": "HBAR",
    "recipient": "0.0.987654",
    "policy": "manual-review-above-threshold"
  }
}
```

6. Simulate the task and review risk score.
7. Pay with `HBAR`.
8. Execute the task.
9. Confirm:

- task status becomes `completed`
- transaction history has both payment and execution records
- `hederaProof.proofHash` exists
- `hederaProof.simulated` is expected for local mode
- alerts are created if simulation risk crosses thresholds

## 4. Real-Life Scenario: Partner API Integration

Goal: prove an external Web3 or AI-agent partner can request agent work through Agentity.

1. Create or log in as a user.
2. Register and verify an agent.
3. Generate an integration API key from settings/integrations.
4. Fetch:

```http
GET /integrations/overview
GET /integrations/snippets/curl
```

5. Use the returned snippet to call:

```http
POST /tasks/request
```

6. Confirm the task belongs to the configured agent and appears in `/tasks/history`.

Pass criteria:

- API key works without browser cookies
- invalid API key returns `401`
- unknown `agentId` returns `404`
- partner payload is preserved in `inputPayload`

## 5. Real-Life Scenario: Risky Agent Execution

Goal: prove the platform does not blindly execute risky agent activity.

Create a task payload with high-risk intent:

```json
{
  "taskType": "execution",
  "inputPayload": {
    "target": "unbounded-transfer",
    "amount": 1000000,
    "asset": "HBAR",
    "recipient": "unknown",
    "constraints": []
  }
}
```

Expected:

- simulation records elevated risk
- alerts may be created
- execution workflow returns a policy decision
- transaction record captures risk rating and execution trace

## 6. Live Hedera Testnet Proofs

Use this only after local flows pass.

Create or choose a Hedera testnet account and HCS topic, then set:

```bash
HEDERA_ENABLE_REAL_PROOFS=true
HEDERA_OPERATOR_ACCOUNT_ID=0.0.x
HEDERA_OPERATOR_PRIVATE_KEY=...
HEDERA_CONSENSUS_TOPIC_ID=0.0.y
```

Restart API and verify:

```http
GET /hedera/status
```

Expected:

- `operatorCanSubmit: true`
- `proofMode: "hcs-topic"`
- empty `configErrors`

Run:

```bash
npm run smoke
```

Pass criteria:

- verification or execution returns a Hedera `transactionId`
- `explorerUrl` opens in HashScan
- mirror node lookup for `/hedera/transactions/{transactionId}` returns a response or a clear mirror-node error

## 7. Live Hedera Testnet Payments

Use only after proof tests pass and the operator account is funded.

```bash
HEDERA_ENABLE_REAL_TRANSFERS=true
```

Pass criteria:

- `/tasks/{id}/pay` returns `simulated: false`
- `hederaTransactionId` is populated
- HashScan shows the transfer
- payment record status is `paid`
- transaction history includes the payment

For HTS payments, ensure the sender and recipient accounts are associated with the token before running the test.

## 8. Regression Checklist Before Sharing

Run this before investor, partner, or public demos:

- `npm run test:api`
- `npm run test:client`
- `npm run smoke` against staging
- `GET /docs` loads Swagger
- `GET /hedera/status` has expected proof/payment mode
- register, verify, simulate, pay, execute flow succeeds
- transaction and task histories render in the client
- no legacy chain terminology appears in UI or docs
- real transfers are disabled unless intentionally demonstrating funded testnet settlement

## 9. Troubleshooting

`/health` returns `503`:

- check `DATABASE_URL`
- apply `apps/server/db/schema.sql`
- confirm Supabase/Postgres allows the connection

`/hedera/status` is degraded:

- check account ID format
- check private key format
- check HCS topic ID
- confirm `HEDERA_NETWORK` is `testnet`, `previewnet`, `mainnet`, or `localnet`

Payment is simulated:

- set `HEDERA_ENABLE_REAL_TRANSFERS=true`
- fund the operator account
- confirm the agent has a linked Hedera account

Proof is simulated:

- set `HEDERA_ENABLE_REAL_PROOFS=true`
- configure `HEDERA_OPERATOR_ACCOUNT_ID`
- configure `HEDERA_OPERATOR_PRIVATE_KEY`
- configure `HEDERA_CONSENSUS_TOPIC_ID`
