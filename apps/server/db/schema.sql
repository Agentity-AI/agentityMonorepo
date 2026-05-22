BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public."Agents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  blockchain_agent_id TEXT,
  blockchain_tx_hash TEXT,
  blockchain_registered_at TIMESTAMPTZ,
  blockchain_sync_status TEXT DEFAULT 'pending',
  blockchain_sync_error TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."AgentMetadata" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public."Agents"(id) ON DELETE CASCADE,
  model_name TEXT,
  version TEXT,
  execution_environment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."AgentReputations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public."Agents"(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."AgentBehaviorLogs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public."Agents"(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_payload JSONB,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  blockchain_tx_hash TEXT,
  blockchain_action_id TEXT,
  blockchain_logged_at TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public."Agents"(id) ON DELETE CASCADE,
  hedera_account_id TEXT NOT NULL UNIQUE,
  hedera_public_key TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'testnet',
  wallet_type TEXT NOT NULL DEFAULT 'agent',
  kms_key_id TEXT,
  status TEXT NOT NULL DEFAULT 'linked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_hedera_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES public."Agents"(id) ON DELETE CASCADE,
  registry_topic_id TEXT,
  registration_transaction_id TEXT UNIQUE,
  registration_topic_sequence_number TEXT,
  proof_hash TEXT,
  current_score DOUBLE PRECISION DEFAULT 0,
  current_risk_level TEXT DEFAULT 'unknown',
  last_verified_at TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'registered',
  network TEXT NOT NULL DEFAULT 'testnet',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_hedera_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public."Agents"(id) ON DELETE CASCADE,
  transaction_id TEXT,
  topic_sequence_number TEXT,
  proof_type TEXT NOT NULL,
  proof_hash TEXT NOT NULL,
  proof_payload JSONB,
  memo TEXT,
  score DOUBLE PRECISION,
  is_healthy BOOLEAN,
  score_delta DOUBLE PRECISION,
  network TEXT NOT NULL DEFAULT 'testnet',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public."Agents"(id) ON DELETE CASCADE,
  scenario_type TEXT NOT NULL,
  risk_score DOUBLE PRECISION DEFAULT 0,
  vulnerabilities_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  result_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public."Agents"(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  input_payload JSONB,
  simulation_run_id UUID,
  payment_record_id UUID,
  status TEXT NOT NULL DEFAULT 'requested',
  result_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_agent_id UUID NOT NULL REFERENCES public."Agents"(id) ON DELETE CASCADE,
  task_execution_id UUID,
  amount NUMERIC(30, 9) NOT NULL,
  amount_atomic TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HBAR',
  token_id TEXT,
  token_decimals INTEGER NOT NULL DEFAULT 8,
  hedera_transaction_id TEXT,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'quoted',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transaction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public."Agents"(id) ON DELETE CASCADE,
  task_execution_id UUID,
  payment_record_id UUID,
  transaction_type TEXT NOT NULL,
  contract_address TEXT,
  amount NUMERIC(30, 9),
  status TEXT NOT NULL,
  risk_rating TEXT,
  tx_hash TEXT,
  validation_summary JSONB,
  execution_trace JSONB,
  policy_snapshot JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_creator_id ON public."Agents"(creator_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_hedera_account_id ON public.agent_wallets(hedera_account_id);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_agent_id ON public.agent_hedera_proofs(agent_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON public.payment_records(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_records_user_id ON public.transaction_records(user_id);

COMMIT;
