-- Migration v3: Adicionar campo trimestre nas tabelas flashcards e simulados
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Adicionar coluna trimestre na tabela flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS trimestre text
  CHECK (trimestre IN ('T1', 'T2', 'T3', 'T4', 'anual'));

-- 2. Adicionar coluna trimestre na tabela simulados
ALTER TABLE public.simulados
  ADD COLUMN IF NOT EXISTS trimestre text
  CHECK (trimestre IN ('T1', 'T2', 'T3', 'T4', 'anual'));

-- Estrutura lógica:
-- T1, T2, T3, T4 = simulados trimestrais (30 questões) / flashcards do respectivo período
-- anual           = simulados anuais (50 questões) / conteúdo completo do ano
-- NULL            = conteúdo sem período definido (aparece em todos os filtros)

-- 3. (Opcional) Verificar colunas adicionadas
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('flashcards', 'simulados')
--   AND column_name = 'trimestre';
