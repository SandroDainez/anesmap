import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LimiteInfo = {
  pode_simular: boolean;
  usadas: number;
  restantes: number;
  limite: number;
  nivel: string;
  dias_para_renovar: number;
  mes_atual: string;
};

export async function verificarLimite(usuario_id: string): Promise<LimiteInfo> {
  const supabase = await createSupabaseServerClient();
  const mesAtual = new Date().toISOString().slice(0, 7);

  const limite_padrao = parseInt(process.env.LIMITE_SIMULACOES_MES ?? "5");

  if (!supabase) {
    return {
      pode_simular: false,
      usadas: 0,
      restantes: 0,
      limite: limite_padrao,
      nivel: "ME1",
      dias_para_renovar: 0,
      mes_atual: mesAtual,
    };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nivel, limite_simulacoes_mes")
    .eq("id", usuario_id)
    .single();

  const limite = (perfil as { limite_simulacoes_mes?: number } | null)?.limite_simulacoes_mes ?? limite_padrao;

  const { data: uso } = await supabase
    .from("uso_simulacao")
    .select("quantidade")
    .eq("usuario_id", usuario_id)
    .eq("mes_ano", mesAtual)
    .single();

  const quantidade = (uso as { quantidade?: number } | null)?.quantidade ?? 0;

  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const diasRestantes = Math.ceil((proximoMes.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  return {
    pode_simular: quantidade < limite,
    usadas: quantidade,
    restantes: Math.max(0, limite - quantidade),
    limite,
    nivel: (perfil as { nivel?: string } | null)?.nivel ?? "ME3",
    dias_para_renovar: diasRestantes,
    mes_atual: mesAtual,
  };
}

export async function incrementarUso(usuario_id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const mesAtual = new Date().toISOString().slice(0, 7);
  await supabase.rpc("incrementar_simulacao", {
    p_usuario_id: usuario_id,
    p_mes_ano: mesAtual,
  });
}

export async function resetarLimiteUsuario(usuario_id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const mesAtual = new Date().toISOString().slice(0, 7);
  await supabase
    .from("uso_simulacao")
    .update({ quantidade: 0 })
    .eq("usuario_id", usuario_id)
    .eq("mes_ano", mesAtual);
}

export async function ajustarLimiteUsuario(
  usuario_id: string,
  novo_limite: number,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({ limite_simulacoes_mes: novo_limite })
    .eq("id", usuario_id);
}
