# Agentity Hedera Testing Guide

This guide is written for the live deployed app and API. It tests the Hedera integration end to end: runtime status, agent identity, wallet linking, HCS proof creation, proof history, simulations, alerts, HBAR/HTS payments, execution proofs, transaction records, mirror-node inspection, and partner API-key flows.

Use simulated mode for normal QA. Use live Hedera testnet only after the simulated flow passes. Keep mainnet configured separately so the team can run readiness checks without replacing testnet values.

## Live Deployment Quick Start

Use these variables when testing the deployed app. `BASE_URL` is already set to the live Render backend, and `FRONTEND_URL` is set to the live Vercel frontend.

```bash
export BASE_URL="https://agentitymonorepo.onrender.com"
export FRONTEND_URL="https://agentity-monorepo-client.vercel.app"

export RUN_ID="$(date +%Y%m%d%H%M%S)"
export TEST_EMAIL="qa+hedera-${RUN_ID}@example.com"
export TEST_PASSWORD="TestPass123"
export TEST_NAME="Hedera QA ${RUN_ID}"

# Safe for simulated QA. For live transfers, replace this with a real funded Hedera testnet account.
export TEST_HEDERA_ACCOUNT="0.0.1${RUN_ID: -6}"
export TEST_HEDERA_PUBLIC_KEY="$TEST_HEDERA_ACCOUNT"
```

Live deployment notes:

- Use a fresh `RUN_ID` per QA pass so live database uniqueness rules do not collide with previous test agents.
- Render services can cold start; if `/health` is slow, retry for 60-90 seconds before treating it as failed.
- Keep `HEDERA_ENABLE_REAL_TRANSFERS=false` for normal live app QA unless you intentionally want funded testnet settlement.
- If the frontend is deployed separately, confirm its environment has `VITE_API_BASE_URL=https://agentitymonorepo.onrender.com` and redeploy it after changing the env var.
- Use test accounts only. Do not run live-transfer tests with production wallets or mainnet credentials.

## 1. Test Modes

The backend reads profile-specific values first, based on `HEDERA_NETWORK`, and falls back to generic `HEDERA_*` values only when that profile group is empty. This prevents a testnet account from accidentally borrowing a generic mainnet private key or topic.

### Mode A: Safe QA, no real Hedera spend

Use this for frontend testing, demos, and regression checks.

```bash
HEDERA_NETWORK=testnet
HEDERA_TESTNET_OPERATOR_ACCOUNT_ID=
HEDERA_TESTNET_OPERATOR_PRIVATE_KEY=
HEDERA_TESTNET_CONSENSUS_TOPIC_ID=
HEDERA_ENABLE_REAL_PROOFS=false
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Expected behavior:

- Agent verification creates local proof hashes.
- Task execution creates simulated Hedera proof records.
- Payments are marked paid but `simulated: true`.
- `hederaTransactionId` is `null`.
- Proof and payment histories still persist in the database.

### Mode B: Live HCS proof testnet

Use this after Mode A passes.

```bash
HEDERA_NETWORK=testnet
HEDERA_TESTNET_OPERATOR_ACCOUNT_ID=0.0.x
HEDERA_TESTNET_OPERATOR_PRIVATE_KEY=...
HEDERA_TESTNET_CONSENSUS_TOPIC_ID=0.0.y
HEDERA_ENABLE_REAL_PROOFS=true
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Expected behavior:

- Verification and execution proofs submit messages to the configured HCS topic.
- Responses include `transactionId`, `topicSequenceNumber`, and `explorerUrl`.
- `/hedera/transactions/:transactionId` can inspect the transaction via mirror node.

### Mode C: Live HBAR/HTS payment testnet

Use this only with funded testnet accounts.

```bash
HEDERA_ENABLE_REAL_TRANSFERS=true
```

Expected behavior:

- `/tasks/:id/pay` performs a real transfer from the operator account to the linked agent wallet.
- HBAR payments use native tinybar transfers.
- HTS payments require `tokenId`, token association, and enough operator balance.

### Mode D: Mainnet readiness, no real Hedera spend

Use this to confirm the API, database, and frontend can run with mainnet selected while proofs and transfers stay simulated.

```bash
HEDERA_NETWORK=mainnet
HEDERA_MAINNET_OPERATOR_ACCOUNT_ID=
HEDERA_MAINNET_OPERATOR_PRIVATE_KEY=
HEDERA_MAINNET_CONSENSUS_TOPIC_ID=
HEDERA_ENABLE_REAL_PROOFS=false
HEDERA_ENABLE_REAL_TRANSFERS=false
```

Expected behavior:

- `/hedera/status` reports `network: "mainnet"` and `envPrefix: "HEDERA_MAINNET"`.
- Proof and payment writes remain simulated.
- No mainnet HBAR is moved.

## 2. Preflight Checklist

Check service health:

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/system/status"
curl "$BASE_URL/hedera/status"
curl "$BASE_URL/docs"
```

Pass criteria:

- `/health` returns `status: "healthy"` once the database is connected.
- `/system/status` returns `api: "healthy"` and `database: "connected"`.
- `/hedera/status` returns the expected `network`, `mirrorNodeUrl`, `proofMode`, `realProofsEnabled`, and `realPaymentsEnabled`.
- In live proof mode, `operatorCanSubmit` is `true`, `consensusTopicId` is populated, and `configErrors` is empty.

Record these values before every QA run:

```text
Backend URL:
Frontend URL:
Tester email:
Hedera mode: simulated | live proofs | live transfers
HEDERA_NETWORK:
HCS topic ID:
Operator account ID:
Agent wallet account ID:
```

## 3. Authenticate As A Real User

Create a fresh test account:

```bash
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASSWORD"'",
    "name": "'"$TEST_NAME"'"
  }'
```

Copy the returned `jwt`, then:

```bash
export JWT="PASTE_RETURNED_JWT_HERE"
```

Pass criteria:

- Response has `success: true`.
- Response includes `jwt`.
- Frontend stores the token and dashboard loads without redirecting to login.

Negative test:

```bash
curl "$BASE_URL/agents/my"
```

Expected: `401`, because no bearer token was sent.

## 4. Scenario One: Treasury Risk Monitor Agent

Goal: prove a treasury agent can be registered, linked to a Hedera account, verified, simulated, paid, executed, and audited.

### Step 4.1: Register the agent

```bash
curl -X POST "$BASE_URL/agents/register" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "Treasury Risk Monitor",
    "agentType": "Risk Monitoring Agent",
    "publicKey": "'"$TEST_HEDERA_ACCOUNT"'",
    "description": "Reviews DAO treasury payments before settlement.",
    "apiEndpoint": "https://agent.example.com/api/treasury-risk",
    "metadata": {
      "network": "testnet",
      "trustLayer": "hedera",
      "policyDomain": "treasury"
    }
  }'
```

Save the returned `id`:

```bash
export AGENT_ID="PASTE_AGENT_ID_HERE"
```

Pass criteria:

- Response status is `201`.
- Agent status starts as `pending`.
- `fingerprint` is populated.
- `GET /agents/my` shows the new agent.

Negative test:

- Repeat the same registration with the same `publicKey`.
- Expected: `409 Agent already exists`.

### Step 4.2: Link a Hedera wallet

```bash
curl -X POST "$BASE_URL/wallets/link" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "hederaAccountId": "'"$TEST_HEDERA_ACCOUNT"'",
    "hederaPublicKey": "'"$TEST_HEDERA_PUBLIC_KEY"'",
    "network": "testnet"
  }'
```

Pass criteria:

- Response includes `hederaAccountId`, `network`, and `status: "linked"`.
- Invalid account IDs return `400`.
- Reusing another user's linked Hedera account returns `409`.

### Step 4.3: Verify the agent and create Hedera proof records

```bash
curl -X POST "$BASE_URL/agents/$AGENT_ID/verify" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "hederaAccountId": "'"$TEST_HEDERA_ACCOUNT"'",
    "hederaPublicKey": "'"$TEST_HEDERA_PUBLIC_KEY"'",
    "network": "testnet"
  }'
```

Pass criteria in simulated mode:

- `success: true`
- `verificationStatus: "verified"`
- `hederaSyncStatus: "simulated"`
- `hedera.proofHash` is populated.
- `hedera.simulated` is `true`.
- `hedera.transactionId` is `null`.

Pass criteria in live HCS mode:

- `hederaSyncStatus: "synced"`
- `hedera.transactionId` is populated.
- `hedera.topicSequenceNumber` is populated.
- `hedera.explorerUrl` opens on HashScan.

### Step 4.4: Inspect proof history

```bash
curl "$BASE_URL/agents/$AGENT_ID/hedera-history" \
  -H "Authorization: Bearer $JWT"
```

Pass criteria:

- `proofCount` is at least `2` after first verification.
- Proof types include `AGENT_REGISTERED` and `VERIFIED`, or `AGENT_FLAGGED` if risk score is below threshold.
- Each item includes `proofHash`, `payload`, `status`, and `createdAt`.
- The proof payload includes the Hedera `network`.

## 5. Scenario Two: Sandbox Simulation And Alerting

Goal: prove risky agent behavior is detected before payment/execution.

Fetch supported scenarios:

```bash
curl "$BASE_URL/simulation/scenarios"
```

Run a direct simulation:

```bash
curl -X POST "$BASE_URL/simulation/run" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "scenarioType": "Token Swap",
    "parameters": {
      "amount": 2500,
      "tokenIn": "USDC",
      "tokenOut": "HBAR",
      "maxSlippageBps": 100,
      "recipient": "0.0.987654"
    }
  }'
```

Pass criteria:

- Response has `status: "completed"`.
- Response includes `riskScore`, `vulnerabilities`, and `result`.
- `GET /simulation/history` lists the run.
- If `riskScore >= 60` or vulnerabilities are found, `GET /alerts` includes a `simulation_risk` alert.
- If `riskScore >= 85` or vulnerabilities are `>= 3`, alert severity should be `critical`.

## 6. Scenario Three: Task Lifecycle With HBAR Payment

Goal: prove the real product flow: request -> simulate -> pay -> execute.

### Step 6.1: Create a task request

```bash
curl -X POST "$BASE_URL/tasks/request" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "taskType": "execution",
    "inputPayload": {
      "target": "treasury-payment-review",
      "amount": 2500,
      "asset": "HBAR",
      "recipient": "0.0.987654",
      "policy": "manual-review-above-threshold"
    }
  }'
```

Save the returned task id:

```bash
export TASK_ID="PASTE_TASK_ID_HERE"
```

Pass criteria:

- Response status is `201`.
- Task status is `requested`.

Lifecycle gate tests:

```bash
curl -X POST "$BASE_URL/tasks/$TASK_ID/pay" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"currency":"HBAR"}'

curl -X POST "$BASE_URL/tasks/$TASK_ID/execute" \
  -H "Authorization: Bearer $JWT"
```

Expected:

- Pay before simulation returns `400 Task must be simulated before payment`.
- Execute before payment returns `400 Task must be paid before execution`.

### Step 6.2: Simulate the task

```bash
curl -X POST "$BASE_URL/tasks/$TASK_ID/simulate" \
  -H "Authorization: Bearer $JWT"
```

Pass criteria:

- Response status is `200`.
- Task status becomes `simulated`.
- Response includes `simulationRunId`, `riskScore`, and `vulnerabilitiesCount`.

### Step 6.3: Preview HBAR pricing

```bash
curl "$BASE_URL/payments/pricing?taskType=execution&currency=HBAR"
```

Pass criteria:

- Default execution price is `0.50` HBAR unless env pricing overrides it.

### Step 6.4: Pay in HBAR

```bash
curl -X POST "$BASE_URL/tasks/$TASK_ID/pay" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"currency":"HBAR"}'
```

Pass criteria in simulated mode:

- `status: "paid"`
- `currency: "HBAR"`
- `amountAtomic` equals the HBAR amount in tinybars.
- `simulated: true`
- `hederaTransactionId: null`

Pass criteria in live transfer mode:

- `simulated: false`
- `hederaTransactionId` is populated.
- `explorerUrl` opens on HashScan.
- Linked agent account receives the testnet HBAR.

### Step 6.5: Execute the task

```bash
curl -X POST "$BASE_URL/tasks/$TASK_ID/execute" \
  -H "Authorization: Bearer $JWT"
```

Pass criteria:

- Response status is `200`.
- Task status is `completed`.
- `execution.trustLayer` is `hedera`.
- `execution.policy.decision` is `allow` when risk score is below `70`.
- `execution.policy.decision` is `manual_review` when risk score is `70` or higher.
- `hederaProof.proofHash` is populated.
- In live HCS mode, `hederaProof.transactionId` and `hederaProof.explorerUrl` are populated.
- `kms.auditId` is populated, with real or simulated KMS metadata depending on AWS KMS config.

### Step 6.6: Verify persisted records

```bash
curl "$BASE_URL/tasks/history" -H "Authorization: Bearer $JWT"
curl "$BASE_URL/payments/history" -H "Authorization: Bearer $JWT"
curl "$BASE_URL/transactions/history" -H "Authorization: Bearer $JWT"
curl "$BASE_URL/transactions/summary" -H "Authorization: Bearer $JWT"
```

Pass criteria:

- Task history shows the task as `completed`.
- Payment history shows the payment as `paid`.
- Transaction history has one `payment` record and one `execution` record.
- Payment transaction risk is `medium` in simulated mode and `low` in live transfer mode.
- Execution transaction risk is `low`, `medium`, or `high` based on simulation score.

## 7. Scenario Four: HTS Token Payment

Goal: prove non-HBAR Hedera payment support.

Use this only when the operator and agent accounts are associated with the HTS token.

```bash
curl "$BASE_URL/payments/pricing?taskType=execution&currency=USDC-HTS"
```

Create and simulate a fresh task first, then save that task as `HTS_TASK_ID`. Paying a task that is already paid or completed should fail because the payment endpoint expects `status: "simulated"`.

```bash
curl -X POST "$BASE_URL/tasks/request" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "taskType": "execution",
    "inputPayload": {
      "target": "hts-settlement-test",
      "asset": "USDC-HTS",
      "network": "hedera-testnet"
    }
  }'

export HTS_TASK_ID="PASTE_NEW_TASK_ID_HERE"

curl -X POST "$BASE_URL/tasks/$HTS_TASK_ID/simulate" \
  -H "Authorization: Bearer $JWT"

curl -X POST "$BASE_URL/tasks/$HTS_TASK_ID/pay" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USDC-HTS",
    "tokenId": "0.0.456789",
    "tokenDecimals": 6
  }'
```

Pass criteria:

- Quote uses HTS pricing, default execution amount `5.00`.
- `amountAtomic` uses token decimals.
- In simulated mode, payment succeeds without a transaction ID.
- In live transfer mode, HashScan shows the token transfer.

Negative tests:

- Missing `tokenId` in live HTS mode should fail unless `HEDERA_DEFAULT_TOKEN_ID` is configured.
- Unassociated token accounts should fail and create a `payment_failure` alert.

## 8. Scenario Five: Mirror Node And HashScan Inspection

Goal: prove local proof records match Hedera network data.

Use a live proof or payment transaction ID:

```bash
export HEDERA_TX_ID="0.0.x@1710000000.000000001"

curl "$BASE_URL/hedera/transactions/$HEDERA_TX_ID"
```

Pass criteria:

- Response includes `explorerUrl`.
- `mirror` contains mirror-node transaction data, or a clear `unavailable` message if mirror lookup is delayed.
- `proof` is populated for Agentity HCS proof transaction IDs.
- `proof` may be `null` for pure payment transfer transaction IDs because payments are stored in payment records, not proof records.

## 9. Scenario Six: Transaction Policies And Guardrails

Goal: prove policy setup and transaction reporting work around Hedera payment/execution records.

Create a treasury policy:

```bash
curl -X POST "$BASE_URL/transactions/policies" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Treasury Review Policy",
    "description": "Manual review for large or risky AI-agent payments.",
    "agentId": "'"$AGENT_ID"'",
    "maxTransactionAmount": 1000,
    "dailyLimit": 10000,
    "requireManualApproval": true,
    "autoRejectHighRisk": true,
    "policyEnabled": true
  }'
```

Pass criteria:

- Policy status is `active`.
- `GET /transactions/policies` returns the policy.
- `GET /transactions/summary` increments `activePolicies`.

Important current behavior:

- The backend stores policies and reports them.
- Execution approval currently uses the simulation risk threshold in `agentExecutionService`, where risk `>= 70` becomes `manual_review`.
- Policy records are not yet enforced as blocking rules in `/tasks/:id/pay` or `/tasks/:id/execute`.

## 10. Scenario Seven: Partner API-Key Integration

Goal: prove an external partner can request agent work through Agentity.

Generate an API key:

```bash
curl -X POST "$BASE_URL/integrations/api-keys" \
  -H "Authorization: Bearer $JWT"
```

Save the returned plaintext `apiKey` immediately:

```bash
export AGENTITY_API_KEY="PASTE_AGTY_LIVE_KEY_HERE"
```

Fetch integration overview and snippets:

```bash
curl "$BASE_URL/integrations/overview" -H "Authorization: Bearer $JWT"
curl "$BASE_URL/integrations/snippets?type=curl" -H "Authorization: Bearer $JWT"
```

Use the API key to create a task:

```bash
curl -X POST "$BASE_URL/tasks/request" \
  -H "Authorization: Bearer $AGENTITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "'"$AGENT_ID"'",
    "taskType": "execution",
    "inputPayload": {
      "target": "partner-payment-review",
      "network": "hedera-testnet",
      "settlementAsset": "HBAR"
    }
  }'
```

Pass criteria:

- API key works for `/tasks/*`.
- API key does not work for non-task routes such as `/agents/my`.
- Invalid API key returns `401`.
- Partner-created tasks appear in `/tasks/history`.

## 11. Live Frontend Testing Flow

Use the deployed frontend from `FRONTEND_URL`. The deployed frontend must be built with:

```bash
VITE_API_BASE_URL=https://agentitymonorepo.onrender.com
```

Open the live app:

```bash
echo "$FRONTEND_URL"
```

Test in this order:

1. Sign up or log in.
2. Open Dashboard and confirm Hedera status panel shows network, proof mode, mirror node, operator, HCS topic, and payment mode.
3. Open AI Agents and create `Treasury Risk Monitor`.
4. Confirm wallet auto-link succeeds if the modal sends the public key as Hedera account ID.
5. Click verify and confirm the toast says either live Hedera proof or simulated Hedera proof.
6. Open SDK & Documentation, then open Swagger and Hedera Status links.
7. Open Simulation, select the agent, run a realistic scenario, and confirm history updates.
8. Open Transactions, create a policy, and confirm it appears in the policy list.
9. Create a task through the available task flow or API, then use the task table buttons to pay and execute.
10. Open Alerts and verify simulation, payment, or execution alerts appear when expected.

Frontend pass criteria:

- No stale backend URL is used in network calls.
- Authenticated requests include the bearer token or cookie.
- Browser network calls go to `https://agentitymonorepo.onrender.com`.
- Toast messages match backend outcomes.
- Simulated payments and proofs are clearly shown as simulated.
- HashScan links appear only when transaction IDs exist.
- A hard refresh and a logout/login cycle do not break authenticated API calls.

## 12. Negative And Security Tests

Run these before demo sign-off:

```text
Missing auth token -> 401
Invalid JWT -> 401
Invalid Hedera account ID -> 400
Unknown agent ID -> 404
Duplicate agent public key -> 409
Pay before simulation -> 400
Execute before payment -> 400
API key on non-task endpoint -> 401
Wrong user's agent ID -> 404
Invalid transaction policy payload -> 400
Mirror lookup for fake transaction -> 200 with mirror.unavailable
```

## 13. Live Testnet Sign-Off Checklist

Only mark live Hedera ready when all items pass:

- `GET /hedera/status` shows `status: "ready"`.
- `operatorCanSubmit: true`.
- `consensusTopicId` is populated.
- `realProofsEnabled: true`.
- Live verification returns `hedera.transactionId`.
- Live execution returns `hederaProof.transactionId`.
- HashScan opens for proof transactions.
- `/hedera/transactions/:transactionId` returns mirror data or a delayed-but-clear mirror message.
- `realPaymentsEnabled` is `false` unless intentionally testing funded transfers.
- When testing live transfers, operator account has enough testnet HBAR or HTS balance.
- For HTS, operator and destination accounts are token-associated.
- After testing, disable `HEDERA_ENABLE_REAL_TRANSFERS` unless you are intentionally keeping live settlement on.

## 14. Automated Regression

Run backend tests:

```bash
npm run test:api
```

Run frontend lint and build:

```bash
npm run test:client
```

Run the smoke test against local or deployed API:

```bash
SMOKE_BASE_URL=https://agentitymonorepo.onrender.com npm run smoke
```

Run smoke against a specific profile without editing `.env`:

```bash
SMOKE_BASE_URL=https://agentitymonorepo.onrender.com npm run smoke:testnet
SMOKE_BASE_URL=https://agentitymonorepo.onrender.com npm run smoke:mainnet
```

Create a profile-specific HCS topic:

```bash
npm run hedera:create-topic:testnet
npm run hedera:create-topic:mainnet
```

Optional smoke variables:

```bash
SMOKE_EMAIL="$TEST_EMAIL"
SMOKE_PASSWORD="$TEST_PASSWORD"
SMOKE_HEDERA_ACCOUNT_ID="$TEST_HEDERA_ACCOUNT"
SMOKE_HEDERA_PUBLIC_KEY="$TEST_HEDERA_PUBLIC_KEY"
```

Smoke pass criteria:

- Health and system status pass.
- User auth passes.
- Agent registration, wallet link, verification, task lifecycle, payment, execution, policies, histories, and alerts all pass.
- Final smoke output correctly reports whether proofs, payments, and KMS signatures were simulated.

## 15. Evidence To Capture

For each complete QA run, capture:

- Screenshot of `/hedera/status` or Dashboard Hedera status panel.
- Agent ID and fingerprint.
- Linked Hedera account ID.
- Verification proof hash and transaction ID if live.
- Task ID.
- Simulation risk score and alert status.
- Payment ID, amount, currency, and transaction ID if live.
- Execution proof hash and transaction ID if live.
- Transaction history screenshot.
- HashScan links for live proof/payment tests.
- Any failed request payload and response body.

## 16. Known Behavior To Communicate

- Simulated mode is a valid local/demo mode, not a failed Hedera integration.
- `proofMode: "hcs-topic"` means a topic is configured, but real submission still requires operator credentials and `HEDERA_ENABLE_REAL_PROOFS` not set to `false`.
- Payments are simulated unless `HEDERA_ENABLE_REAL_TRANSFERS=true` and operator credentials are configured.
- Payment records and execution proof records are separate. Payment transfer IDs appear in payment/transaction history; HCS proof IDs appear in Hedera proof history.
- Transaction policies are currently stored and displayed, while execution approval is driven by simulation risk score.
