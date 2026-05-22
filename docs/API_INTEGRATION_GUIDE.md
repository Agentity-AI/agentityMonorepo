# Agentity API Integration Guide

This guide gives partner teams the shortest path to integrating Agentity into an AI agent workflow.

## Authentication

User-facing dashboard calls use Supabase JWT auth:

```http
Authorization: Bearer <jwt>
```

Partner/server-side task calls can use active Agentity API keys:

```http
Authorization: Bearer agty_live_xxx
```

## Runtime Status

```http
GET /health
GET /system/status
GET /hedera/status
```

Use these before a demo or partner integration to confirm database readiness, Hedera proof mode, HCS topic configuration, and payment mode.

## Register Agent

```http
POST /agents/register
Content-Type: application/json
```

```json
{
  "agentName": "Treasury Risk Monitor",
  "agentType": "Risk Monitoring Agent",
  "publicKey": "0.0.1234567",
  "description": "Monitors treasury movement and flags high-risk payment instructions.",
  "apiEndpoint": "https://agent.example.com/api/treasury-risk",
  "metadata": {
    "network": "testnet",
    "trustLayer": "hedera",
    "policyDomain": "treasury"
  }
}
```

## Link Hedera Account

```http
POST /wallets/link
```

```json
{
  "agentId": "AGENT_UUID",
  "hederaAccountId": "0.0.1234567",
  "hederaPublicKey": "302a300506032b6570032100...",
  "network": "testnet"
}
```

## Verify Agent

```http
POST /agents/{agentId}/verify
```

```json
{
  "hederaAccountId": "0.0.1234567",
  "network": "testnet"
}
```

Expected response shape:

```json
{
  "success": true,
  "verificationStatus": "verified",
  "hederaSyncStatus": "simulated",
  "hedera": {
    "transactionId": null,
    "proofHash": "sha256_hash",
    "trustScore": 75,
    "riskLevel": "low",
    "simulated": true
  }
}
```

When live HCS is configured, `hedera.transactionId` and `hedera.explorerUrl` are populated.

## Request, Simulate, Pay, Execute

Create a task:

```http
POST /tasks/request
```

```json
{
  "agentId": "AGENT_UUID",
  "taskType": "execution",
  "inputPayload": {
    "target": "settle-agent-workflow",
    "network": "testnet",
    "settlementAsset": "HBAR",
    "amount": 1
  }
}
```

Simulate:

```http
POST /tasks/{taskId}/simulate
```

Pay:

```http
POST /tasks/{taskId}/pay
```

```json
{
  "currency": "HBAR"
}
```

HTS example:

```json
{
  "currency": "USDC-HTS",
  "tokenId": "0.0.456789",
  "tokenDecimals": 6
}
```

Execute:

```http
POST /tasks/{taskId}/execute
```

Execution response includes:

- `execution`: Agentity trust workflow decision and execution hash
- `kms`: optional KMS signature metadata
- `hederaProof`: HCS transaction or simulated proof metadata

## Integration Snippets

```http
GET /integrations/overview
GET /integrations/snippets/javascript
GET /integrations/snippets/react
GET /integrations/snippets/html
GET /integrations/snippets/curl
```

Use these endpoints to build partner onboarding screens or embeddable agent action buttons.

## Error Handling

Common status codes:

- `400`: validation or lifecycle precondition failed
- `401`: missing or invalid auth
- `404`: agent, task, or proof not found
- `409`: Hedera account already linked
- `500`: unexpected execution, database, KMS, or Hedera SDK error

Production integrations should log the request ID, endpoint, response body, and any `hedera.transactionId` or `hederaProof.transactionId` returned by the API.
