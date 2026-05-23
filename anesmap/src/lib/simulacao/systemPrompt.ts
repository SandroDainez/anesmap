export const SYSTEM_PROMPT_SIMULACAO = `
Você é um simulador de anestesiologia clínica altamente realista usado para
treinamento de médicos residentes (ME1, ME2 e ME3) em anestesiologia.

REGRAS DE AVALIAÇÃO:
- Avalie cada conduta como: correto, parcial, incorreto ou tardio
- correto: conduta adequada e no tempo certo → estabilize parcialmente, gere nova intercorrência
- parcial: conduta certa mas incompleta → melhora parcial, alerta sobre o que faltou
- incorreto: conduta errada → piore o quadro proporcionalmente ao erro
- tardio: conduta certa mas após 2+ turnos sem tratar → gere complicação por atraso

PROGRESSÃO DO CASO:
- Cada caso tem entre 6 e 12 turnos antes do desfecho
- Condutas corretas consecutivas levam a recuperação
- 2 condutas incorretas seguidas agravam significativamente
- 3 condutas incorretas ou 1 erro grave → pode levar a óbito
- Seja fisiologicamente rigoroso: os sinais vitais devem fazer sentido clínico

DESFECHO:
- Após o turno final, defina o desfecho baseado no histórico completo:
  - recuperacao: maioria das condutas corretas
  - complicacao: condutas mistas, caso controlado mas com sequela
  - obito: condutas majoritariamente incorretas ou erro grave não corrigido

PONTUAÇÃO POR TURNO:
- correto: 10 pontos
- parcial: 6 pontos
- incorreto: 0 pontos
- tardio: 3 pontos
- Bônus velocidade: +2 pontos se resposta em menos de 30 segundos

FORMATO DE RESPOSTA — responda SEMPRE em JSON válido:
{
  "avaliacao": "correto | parcial | incorreto | tardio",
  "feedback": "avaliação da conduta em 2-3 linhas, didática e objetiva",
  "explicacao_clinica": "por que esta conduta é correta/incorreta — 1-2 linhas educativas",
  "sinais_vitais": {
    "PA": "120/80",
    "FC": 72,
    "SpO2": 98,
    "ETCO2": 35,
    "FR": 14,
    "Temp": 36.5
  },
  "nova_situacao": "descrição da próxima intercorrência ou evolução do caso",
  "opcoes": [
    "opção de conduta A",
    "opção de conduta B",
    "opção de conduta C",
    "opção de conduta D"
  ],
  "turno_atual": 3,
  "pontuacao_turno": 10,
  "desfecho": null,
  "resumo_final": null,
  "pontos_fortes": null,
  "pontos_melhorar": null
}

Quando for o turno final, preencha:
- "desfecho": "recuperacao" | "complicacao" | "obito"
- "resumo_final": "resumo do caso e das decisões tomadas"
- "pontos_fortes": ["lista de acertos do residente"]
- "pontos_melhorar": ["lista de pontos a melhorar com explicação"]
- "nova_situacao": descrição do desfecho clínico
- "opcoes": []

Mantenha sempre realismo clínico. Lembre-se que isso é treinamento médico sério.
`;

export type HistoricoItem = {
  situacao: string;
  conduta: string;
  avaliacao: string;
  feedback: string;
  nova_situacao?: string;
  pontuacao_turno?: number;
};

export type Fase = {
  titulo: string;
  situacao: string;
  sinais_vitais: SinaisVitais;
  opcoes: string[];
};

export type CasoSimulacao = {
  id: string;
  titulo: string;
  descricao: string;
  nivel_residente: string;
  situacao_inicial: string;
  sinais_vitais_iniciais: SinaisVitais;
  opcoes_iniciais: string[];
  dificuldade: string;
  nivel_recomendado: string[];
  duracao_estimada: string;
  tags: string[];
  /** Optional pre-scripted phases that guide AI progression */
  fases?: Fase[];
};

export type SinaisVitais = {
  PA: string;
  FC: number;
  SpO2: number;
  ETCO2: number;
  FR: number;
  Temp: number;
};

export function montarMensagem(
  caso: CasoSimulacao,
  historico: HistoricoItem[],
  condutaAtual: string,
): string {
  const turnoAtual = historico.length + 1;

  const historicoFormatado = historico
    .map(
      (h, i) =>
        `Turno ${i + 1}:\n     Situação: ${h.situacao}\n     Conduta do residente: ${h.conduta}\n     Avaliação: ${h.avaliacao}\n     Feedback: ${h.feedback}`,
    )
    .join("\n\n");

  // Build phase roadmap if case has pre-scripted phases
  let roteiro = "";
  if (caso.fases && caso.fases.length > 1) {
    const fasesTexto = caso.fases
      .map((f, i) => {
        const sv = f.sinais_vitais;
        const opcoes = f.opcoes.filter(Boolean);
        return (
          `  Fase ${i + 1} — ${f.titulo || `Turno ~${i + 1}`}:\n` +
          `    Situação: ${f.situacao}\n` +
          `    Sinais vitais esperados: PA ${sv.PA}, FC ${sv.FC}, SpO2 ${sv.SpO2}%, ETCO2 ${sv.ETCO2}, FR ${sv.FR}, Temp ${sv.Temp}°C\n` +
          (opcoes.length > 0 ? `    Condutas esperadas: ${opcoes.join(" | ")}` : "")
        );
      })
      .join("\n\n");

    // Which phase should we be at now (based on turn count)
    const faseAlvo = Math.min(turnoAtual, caso.fases.length);
    roteiro = `
ROTEIRO DO CASO (${caso.fases.length} fases pré-definidas pelo instrutor):
${fasesTexto}

Turno atual: ${turnoAtual} → direcione a evolução clínica para a Fase ${faseAlvo}.
Condutas corretas avançam o roteiro fase a fase. Erros desviam e agravam o quadro.
Ao atingir a última fase com condutas majoritariamente corretas, encaminhe para desfecho de recuperação.
`;
  }

  return `
CASO CLÍNICO:
${caso.descricao}

NÍVEL DO RESIDENTE: ${caso.nivel_residente}
${roteiro}
HISTÓRICO DO ATENDIMENTO:
${historicoFormatado || "Início do caso — nenhuma conduta tomada ainda."}

CONDUTA ATUAL DO RESIDENTE:
"${condutaAtual}"

Avalie esta conduta e continue a simulação.
Lembre-se: turno atual é ${turnoAtual}.
${turnoAtual >= 9 ? "Este é um dos últimos turnos — considere encaminhar para o desfecho." : ""}
  `;
}
