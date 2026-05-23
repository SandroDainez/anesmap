-- ============================================================
-- MIGRAÇÃO: Módulo de Simulação Clínica
-- Execute este SQL no painel do Supabase (SQL Editor)
-- ============================================================

-- 1. Adicionar colunas à tabela profiles existente
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'ME3',
  ADD COLUMN IF NOT EXISTS limite_simulacoes_mes INTEGER DEFAULT 5;

-- Constraint para nivel válido
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_nivel_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_nivel_check CHECK (nivel IN ('ME1', 'ME2', 'ME3'));

-- 2. Tabela de controle de uso mensal
CREATE TABLE IF NOT EXISTS uso_simulacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_ano TEXT NOT NULL,
  quantidade INTEGER DEFAULT 0,
  ultima_simulacao TIMESTAMPTZ,
  UNIQUE(usuario_id, mes_ano)
);

ALTER TABLE uso_simulacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_ve_proprio_uso" ON uso_simulacao;
CREATE POLICY "usuario_ve_proprio_uso" ON uso_simulacao
  FOR ALL USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "admin_ve_tudo_uso" ON uso_simulacao;
CREATE POLICY "admin_ve_tudo_uso" ON uso_simulacao
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 3. Tabela de sessões de simulação
CREATE TABLE IF NOT EXISTS simulacao_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  caso_id TEXT NOT NULL,
  caso_titulo TEXT NOT NULL,
  status TEXT DEFAULT 'em_andamento',
  desfecho TEXT,
  pontuacao_final INTEGER,
  iniciada_em TIMESTAMPTZ DEFAULT NOW(),
  concluida_em TIMESTAMPTZ,
  mes_ano TEXT NOT NULL
);

ALTER TABLE simulacao_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_ve_proprias_sessoes" ON simulacao_sessoes;
CREATE POLICY "usuario_ve_proprias_sessoes" ON simulacao_sessoes
  FOR ALL USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "admin_ve_tudo_sessoes" ON simulacao_sessoes;
CREATE POLICY "admin_ve_tudo_sessoes" ON simulacao_sessoes
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 4. Tabela de passos de cada simulação
CREATE TABLE IF NOT EXISTS simulacao_passos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES simulacao_sessoes(id) ON DELETE CASCADE,
  turno INTEGER NOT NULL,
  situacao_apresentada TEXT NOT NULL,
  sinais_vitais JSONB NOT NULL,
  conduta_usuario TEXT NOT NULL,
  tipo_conduta TEXT,
  avaliacao_ia TEXT,
  feedback_ia TEXT NOT NULL,
  nova_situacao TEXT,
  pontuacao_turno INTEGER,
  tempo_resposta_segundos INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE simulacao_passos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_ve_proprios_passos" ON simulacao_passos;
CREATE POLICY "usuario_ve_proprios_passos" ON simulacao_passos
  FOR ALL USING (
    sessao_id IN (
      SELECT id FROM simulacao_sessoes WHERE usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_ve_tudo_passos" ON simulacao_passos;
CREATE POLICY "admin_ve_tudo_passos" ON simulacao_passos
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 5. Função para incrementar contador (upsert atômico)
CREATE OR REPLACE FUNCTION incrementar_simulacao(
  p_usuario_id UUID,
  p_mes_ano TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO uso_simulacao (usuario_id, mes_ano, quantidade, ultima_simulacao)
  VALUES (p_usuario_id, p_mes_ano, 1, NOW())
  ON CONFLICT (usuario_id, mes_ano)
  DO UPDATE SET
    quantidade = uso_simulacao.quantidade + 1,
    ultima_simulacao = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Tabela de casos dinâmicos (para CRUD via admin — Doc 2)
CREATE TABLE IF NOT EXISTS casos_simulacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  dificuldade TEXT NOT NULL,
  nivel_recomendado TEXT[] DEFAULT '{ME1,ME2,ME3}',
  duracao_estimada TEXT,
  tags TEXT[] DEFAULT '{}',
  descricao TEXT NOT NULL,
  situacao_inicial TEXT NOT NULL,
  sinais_vitais_iniciais JSONB NOT NULL,
  opcoes_iniciais TEXT[] NOT NULL,
  ativo BOOLEAN DEFAULT FALSE,
  criado_por UUID REFERENCES auth.users(id),
  revisado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE casos_simulacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_gerencia_casos" ON casos_simulacao;
CREATE POLICY "admin_gerencia_casos" ON casos_simulacao
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

DROP POLICY IF EXISTS "mes_veem_casos_ativos" ON casos_simulacao;
CREATE POLICY "mes_veem_casos_ativos" ON casos_simulacao
  FOR SELECT USING (ativo = TRUE);
