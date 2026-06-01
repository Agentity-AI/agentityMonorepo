BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'solana_address'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'hedera_account_id'
  ) THEN
    ALTER TABLE public.agent_wallets
      RENAME COLUMN solana_address TO hedera_account_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'solana_public_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'hedera_public_key'
  ) THEN
    ALTER TABLE public.agent_wallets
      RENAME COLUMN solana_public_key TO hedera_public_key;
  END IF;
END $$;

ALTER TABLE public.agent_wallets
  ADD COLUMN IF NOT EXISTS hedera_account_id TEXT,
  ADD COLUMN IF NOT EXISTS hedera_public_key TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'testnet',
  ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS kms_key_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'linked',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'solana_address'
  ) THEN
    UPDATE public.agent_wallets
    SET hedera_account_id = COALESCE(hedera_account_id, solana_address);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_wallets'
      AND column_name = 'solana_public_key'
  ) THEN
    UPDATE public.agent_wallets
    SET hedera_public_key = COALESCE(hedera_public_key, solana_public_key);
  END IF;
END $$;

UPDATE public.agent_wallets
SET
  network = COALESCE(network, 'testnet'),
  wallet_type = COALESCE(wallet_type, 'agent'),
  status = COALESCE(status, 'linked'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.agent_wallets
  ALTER COLUMN hedera_account_id SET NOT NULL,
  ALTER COLUMN hedera_public_key SET NOT NULL,
  ALTER COLUMN network SET NOT NULL,
  ALTER COLUMN wallet_type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_wallets_hedera_account_id_unique
  ON public.agent_wallets(hedera_account_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_hedera_account_id
  ON public.agent_wallets(hedera_account_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_network
  ON public.agent_wallets(network);

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

CREATE INDEX IF NOT EXISTS idx_agent_hedera_registry_agent_id
  ON public.agent_hedera_registry(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_registry_transaction_id
  ON public.agent_hedera_registry(registration_transaction_id);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_registry_status
  ON public.agent_hedera_registry(status);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_registry_network
  ON public.agent_hedera_registry(network);

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

CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_agent_id
  ON public.agent_hedera_proofs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_transaction_id
  ON public.agent_hedera_proofs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_proof_type
  ON public.agent_hedera_proofs(proof_type);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_proof_hash
  ON public.agent_hedera_proofs(proof_hash);
CREATE INDEX IF NOT EXISTS idx_agent_hedera_proofs_created_at
  ON public.agent_hedera_proofs(created_at);

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'token_mint'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'token_id'
  ) THEN
    ALTER TABLE public.payment_records
      RENAME COLUMN token_mint TO token_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'solana_signature'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'hedera_transaction_id'
  ) THEN
    ALTER TABLE public.payment_records
      RENAME COLUMN solana_signature TO hedera_transaction_id;
  END IF;
END $$;

ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS from_user_id UUID,
  ADD COLUMN IF NOT EXISTS to_agent_id UUID,
  ADD COLUMN IF NOT EXISTS task_execution_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(30, 9),
  ADD COLUMN IF NOT EXISTS amount_atomic TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HBAR',
  ADD COLUMN IF NOT EXISTS token_id TEXT,
  ADD COLUMN IF NOT EXISTS token_decimals INTEGER DEFAULT 8,
  ADD COLUMN IF NOT EXISTS hedera_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'quoted',
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'token_mint'
  ) THEN
    UPDATE public.payment_records
    SET token_id = COALESCE(token_id, token_mint);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_records'
      AND column_name = 'solana_signature'
  ) THEN
    UPDATE public.payment_records
    SET hedera_transaction_id = COALESCE(hedera_transaction_id, solana_signature);
  END IF;
END $$;

UPDATE public.payment_records
SET
  currency = COALESCE(currency, 'HBAR'),
  token_decimals = COALESCE(token_decimals, 8),
  status = COALESCE(status, 'quoted'),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.payment_records
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN token_decimals SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_records_hedera_transaction_id
  ON public.payment_records(hedera_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_currency
  ON public.payment_records(currency);
CREATE INDEX IF NOT EXISTS idx_payment_records_status
  ON public.payment_records(status);

COMMIT;
