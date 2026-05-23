-- Migration v2: Adicionar alternativa E e explicações por alternativa nos simulados
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Adicionar coluna alternativa_e na tabela simulados
ALTER TABLE public.simulados
  ADD COLUMN IF NOT EXISTS alternativa_e text;

-- 2. Adicionar colunas de explicação individual por alternativa
ALTER TABLE public.simulados
  ADD COLUMN IF NOT EXISTS explicacao_a text,
  ADD COLUMN IF NOT EXISTS explicacao_b text,
  ADD COLUMN IF NOT EXISTS explicacao_c text,
  ADD COLUMN IF NOT EXISTS explicacao_d text,
  ADD COLUMN IF NOT EXISTS explicacao_e text;

-- 3. Atualizar a constraint da tabela simulado_answers para aceitar E
ALTER TABLE public.simulado_answers
  DROP CONSTRAINT IF EXISTS simulado_answers_selected_check;

ALTER TABLE public.simulado_answers
  ADD CONSTRAINT simulado_answers_selected_check
  CHECK (selected IN ('A', 'B', 'C', 'D', 'E'));

-- 4. (Opcional) Verificar as colunas adicionadas
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'simulados'
-- ORDER BY ordinal_position;
