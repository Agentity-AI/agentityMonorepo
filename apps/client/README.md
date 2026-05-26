# Agentity Client

Vite React frontend for the Agentity Hedera backend.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Default API:

```text
https://agentitymonorepo.onrender.com
```

Override locally:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

From the monorepo root:

```bash
npm run dev:client
npm run test:client
npm run build:client
```

## Integration Notes

- Auth uses `/auth/register` and `/auth/login`.
- JWTs are stored in `localStorage` and sent as Bearer tokens.
- Cookies are also supported through `withCredentials: true`.
- Agent registration links Hedera wallet data.
- Verification surfaces synced, simulated, or failed Hedera proof status.
- The dashboard reads `/system/status` for Hedera runtime details.

## Deploy

Build command:

```bash
npm run build
```

Publish directory:

```text
dist
```
