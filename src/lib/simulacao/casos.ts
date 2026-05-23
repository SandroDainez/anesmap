import type { CasoSimulacao } from "./systemPrompt";

export { CasoSimulacao };

export const CASOS_SIMULACAO: CasoSimulacao[] = [
  {
    id: "broncoespasmo-01",
    titulo: "Broncoespasmo Intraoperatório",
    dificuldade: "intermediário",
    nivel_recomendado: ["ME1", "ME2", "ME3"],
    duracao_estimada: "15 min",
    tags: ["via aérea", "broncoespasmo", "ventilação"],
    descricao: `Paciente: Masculino, 45 anos, 78kg, ASA II.
Procedimento: Herniorrafia inguinal sob anestesia geral balanceada.
Comorbidades: Asma leve intermitente, controlada com salbutamol SOS (última crise há 6 meses).
Medicações habituais: Salbutamol spray SOS.
Indução: Propofol 2mg/kg + Fentanil 3mcg/kg + Rocurônio 0,6mg/kg.
Intubação orotraqueal sem intercorrências. TOT 8,0 fixado a 22cm.
Ventilação mecânica: VC 550mL, FR 12, PEEP 5, FiO2 50%.
T+10min: Sinais vitais estáveis. Cirurgia iniciada.
T+20min: Ventilador alarma. Pressão de pico sobe de 18 para 36 cmH2O.
SpO2 cai de 99% para 93% em 2 minutos. Ausculta: sibilos difusos bilaterais.`,
    nivel_residente: "ME1",
    situacao_inicial:
      "T+20min de cirurgia. O ventilador dispara alarme de alta pressão. Pressão de pico: 36 cmH2O (estava em 18). SpO2: 93% e caindo. Ausculta pulmonar: sibilos difusos bilaterais. Cirurgião pergunta: \"Está tudo bem?\"",
    sinais_vitais_iniciais: { PA: "138/84", FC: 96, SpO2: 93, ETCO2: 52, FR: 12, Temp: 36.4 },
    opcoes_iniciais: [
      "Aumentar FiO2 para 100% e ventilar manualmente",
      "Aprofundar anestesia com propofol",
      "Administrar salbutamol inalatório no TOT",
      "Checar posição do tubo e excluir intubação seletiva",
    ],
  },
  {
    id: "anafilaxia-01",
    titulo: "Anafilaxia Intraoperatória",
    dificuldade: "avançado",
    nivel_recomendado: ["ME2", "ME3"],
    duracao_estimada: "20 min",
    tags: ["anafilaxia", "choque", "emergência"],
    descricao: `Paciente: Feminino, 32 anos, 65kg, ASA I.
Procedimento: Apendicectomia videolaparoscópica de urgência.
Sem alergias conhecidas relatadas.
Indução: Propofol + Fentanil + Atracúrio 0,5mg/kg.
T+5min após início do atracúrio: queda súbita da PA.`,
    nivel_residente: "ME2",
    situacao_inicial:
      "T+5min. PA despenca de 124/76 para 68/40 em 90 segundos. FC: 128. SpO2: 91%. Surgem eritema e urticária no tronco. Pressão de pico aumenta para 32 cmH2O. Cirurgião ainda não incisou.",
    sinais_vitais_iniciais: { PA: "68/40", FC: 128, SpO2: 91, ETCO2: 28, FR: 16, Temp: 36.2 },
    opcoes_iniciais: [
      "Adrenalina 0,5mg IM imediatamente",
      "Expandir volume com 1000mL de SF 0,9% rápido",
      "Adrenalina 0,1mg IV diluída + comunicar equipe",
      "Hidrocortisona 500mg IV",
    ],
  },
  {
    id: "hipotensao-raqui-01",
    titulo: "Hipotensão Pós-Raquianestesia",
    dificuldade: "iniciante",
    nivel_recomendado: ["ME1", "ME2"],
    duracao_estimada: "10 min",
    tags: ["raquianestesia", "hipotensão", "bloqueio"],
    descricao: `Paciente: Feminino, 28 anos, 70kg, 38 semanas de gestação, ASA II.
Procedimento: Cesárea eletiva sob raquianestesia.
Raqui realizada com bupivacaína hiperbárica 10mg + fentanil 20mcg.
Nível de bloqueio: T4. Paciente posicionada em decúbito dorsal com cunha lateral.
T+5min: Paciente refere tontura e náusea.`,
    nivel_residente: "ME1",
    situacao_inicial:
      "T+5min após raqui. Paciente refere tontura intensa e náusea. PA: 78/48 (basal era 118/72). FC: 58. SpO2: 97%. Feto com BCF 142bpm. Cirurgia ainda não iniciou.",
    sinais_vitais_iniciais: { PA: "78/48", FC: 58, SpO2: 97, ETCO2: 0, FR: 18, Temp: 36.6 },
    opcoes_iniciais: [
      "Efedrina 10mg IV em bolus",
      "Aumentar infusão de cristaloide rapidamente",
      "Fenilefrina 100mcg IV",
      "Deslocar mais o útero para a esquerda",
    ],
  },
  {
    id: "iam-intraop-01",
    titulo: "Isquemia Miocárdica Intraoperatória",
    dificuldade: "avançado",
    nivel_recomendado: ["ME3"],
    duracao_estimada: "25 min",
    tags: ["cardíaco", "isquemia", "ECG", "alto risco"],
    descricao: `Paciente: Masculino, 68 anos, 88kg, ASA III.
Procedimento: Colecistectomia laparoscópica eletiva.
Comorbidades: HAS, DM2, dislipidemia, angina estável.
Medicações: AAS, atenolol, sinvastatina, metformina.
Indução e intubação sem intercorrências.
T+30min: Cirurgia transcorrendo bem. Pneumoperitônio estabelecido.`,
    nivel_residente: "ME3",
    situacao_inicial:
      "T+30min. Monitor exibe supradesnivelamento de ST em DII e V5. PA sobe para 178/102. FC: 88. SpO2: 98%. Cirurgião acabou de aplicar clipe em estrutura do hilo hepático.",
    sinais_vitais_iniciais: { PA: "178/102", FC: 88, SpO2: 98, ETCO2: 38, FR: 12, Temp: 36.3 },
    opcoes_iniciais: [
      "Solicitar ECG de 12 derivações urgente",
      "Nitroglicerina 0,1mcg/kg/min IV",
      "Comunicar cirurgião para suspender cirurgia",
      "Aprofundar anestesia com isoflurano",
    ],
  },
  {
    id: "laringoespasmo-01",
    titulo: "Laringoespasmo na Extubação",
    dificuldade: "intermediário",
    nivel_recomendado: ["ME1", "ME2", "ME3"],
    duracao_estimada: "12 min",
    tags: ["via aérea", "extubação", "laringoespasmo"],
    descricao: `Paciente: Feminino, 8 anos, 25kg, ASA I.
Procedimento: Amigdalectomia + adenoidectomia sob anestesia geral inalatória.
Cirurgia concluída. Sevoflurano descontinuado. Revertido com neostigmina + atropina.
Paciente com reflexos presentes, respirando espontaneamente.
Extubação realizada com criança em plano superficial.`,
    nivel_residente: "ME1",
    situacao_inicial:
      "Imediatamente após extubação. Criança apresenta estridor intenso, tiragem subcostal, SpO2 caindo de 99% para 88% em 40 segundos. Movimentos torácicos paradoxais. Não responde ao estímulo verbal.",
    sinais_vitais_iniciais: { PA: "108/68", FC: 142, SpO2: 88, ETCO2: 0, FR: 0, Temp: 36.8 },
    opcoes_iniciais: [
      "CPAP com máscara facial com pressão firme",
      "Succinilcolina 1mg/kg IV imediatamente",
      "Reintubação orotraqueal imediata",
      "Jaw thrust + hiperextensão do pescoço + O2 100%",
    ],
  },
];

