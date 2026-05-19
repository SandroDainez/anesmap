"use client";

import { useMemo, useState } from "react";
import { AppCard } from "@/components/AppCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";

type Severity = "Crítica" | "Alta" | "Média";
type SeverityTone = "rose" | "amber" | "blue";

type Complication = {
  title: string;
  severity: Severity;
  tone: SeverityTone;
  incidencia: string;
  descricao: string;
  fatoresRisco: string[];
  prevencao: string[];
  conduta: string[];
  referencia: string;
};

const COMPLICATIONS: Complication[] = [
  {
    title: "Hipertermia Maligna",
    severity: "Crítica",
    tone: "rose",
    incidencia: "1:5.000–1:65.000 anestesias",
    descricao:
      "Síndrome hipermetabólica potencialmente fatal desencadeada por halogenados (halotano, sevoflurano, desflurano, isoflurano) e succinilcolina em pacientes com mutação no gene RYR1. Caracteriza-se por rigidez muscular, hipertermia, acidose mista, rabdomiólise e hipercalemia.",
    fatoresRisco: [
      "História familiar de HM ou morte anestésica inexplicada",
      "Miopatias: distrofia muscular de Duchenne, miopatia central core",
      "Estrabismo em crianças (associação controversa)",
      "Uso de succinilcolina ou qualquer agente halogenado",
    ],
    prevencao: [
      "Investigar história familiar detalhada em toda consulta pré-anestésica",
      "Preferir TIVA (propofol + remifentanil) em pacientes suspeitos",
      "Usar circuito vaporizador limpo; purgar com O₂ por 20 min antes",
      "Manter dantrolene (36 frascos) e protocolo de HM acessíveis na sala",
      "Teste de contratura in vitro (IVCT/CHCT) para confirmação diagnóstica",
    ],
    conduta: [
      "1. Suspender IMEDIATAMENTE o agente desencadeante halogenado",
      "2. Pedir ajuda e acionar protocolo HM da instituição",
      "3. Dantrolene sódico 2,5 mg/kg IV bolus rápido — repetir a cada 5 min até 10 mg/kg",
      "4. Hiperventilar com O₂ 100% (fluxo alto), troca do circuito se possível",
      "5. Resfriamento ativo: SF gelado EV, compressa de gelo em axilas e virilhas, lavagem gástrica/vesical fria",
      "6. Tratar hipercalemia: bicarbonato, glicose + insulina, CaCl₂ 10% 10 mL IV",
      "7. Tratar acidose metabólica: bicarbonato de sódio 1–2 mEq/kg IV",
      "8. Monitorar: temperatura central contínua, gasometria, CPK, mioglobina, débito urinário (meta > 2 mL/kg/h)",
      "9. Manter dantrolene 1 mg/kg IV a cada 6h por 24–48h para prevenir recorrência",
    ],
    referencia:
      "Rosenberg H et al. Malignant hyperthermia. Orphanet J Rare Dis. 2015;10:93. / MHAUS Clinical Guidelines 2020. / Gropper MA. Miller's Anesthesia, 9ª ed., cap. 44.",
  },
  {
    title: "Via Aérea Difícil Não Antecipada (CICO)",
    severity: "Crítica",
    tone: "rose",
    incidencia: "CICO: 1:50.000 anestesias gerais",
    descricao:
      "'Can't Intubate, Can't Oxygenate': incapacidade de intubar e ventilar o paciente após múltiplas tentativas. Emergência absoluta responsável por 25–30% das mortes anestésicas. Exige decisão rápida e escalonada conforme algoritmo de via aérea difícil.",
    fatoresRisco: [
      "Mallampati III/IV, distância tireomentoniana < 6 cm",
      "Abertura oral < 3 cm, retrognatas, pescoço curto e espesso",
      "Cirurgia cervical prévia, radioterapia em cabeça e pescoço",
      "Obesidade mórbida (IMC > 40), apneia obstrutiva do sono",
      "Gravidez a termo, angioedema, epiglotite",
    ],
    prevencao: [
      "Avaliação sistemática pré-op: LEMON (Look, Evaluate 3-3-2, Mallampati, Obstruction, Neck)",
      "Plano A/B/C/D documentado e comunicado à equipe antes da indução",
      "Pré-oxigenação adequada: O₂ 100% por 3–5 min (SpO₂ > 95% como margem)",
      "Ter videolaringoscópio, fibroscópio e kit cricotireoidostomia disponíveis",
      "Considerar intubação com paciente acordado em via aérea previsivelmente difícil",
    ],
    conduta: [
      "1. Chamar ajuda imediatamente",
      "2. Plano A: laringoscopia otimizada (BURP, mudança de lâmina, videolaringoscópio) — máx. 3 tentativas",
      "3. Plano B: oxigenação com máscara facial + cânula de Guedel, two-hand grip",
      "4. Plano C: dispositivo supraglótico (máscara laríngea de 2ª geração — i-gel, ProSeal)",
      "5. Se CICO confirmado: declarar emergência — cricotireoidostomia cirúrgica imediata",
      "6. Cricotireoidostomia: incisão vertical 3 cm + incisão transversa na membrana + cânula 6,0 com balonete",
      "7. Registrar número de tentativas, dispositivos usados e desfecho",
    ],
    referencia:
      "Apfelbaum JL et al. ASA Difficult Airway Management Guidelines 2022. Anesthesiology. 2022;136:31–81. / Frerk C et al. DAS Guidelines 2015. Anaesthesia. 2015;70:1286–1318.",
  },
  {
    title: "Anafilaxia Perioperatória",
    severity: "Crítica",
    tone: "rose",
    incidencia: "1:10.000–1:20.000 anestesias",
    descricao:
      "Reação de hipersensibilidade sistêmica grave com risco de vida. Agentes mais comuns: bloqueadores neuromusculares (50–60%), látex (15–20%), antibióticos (15%), CMGR (5%). Mortalidade 3–9%. Diagnóstico clínico: hipotensão + broncoespasmo + eritema/urticária após exposição a agente.",
    fatoresRisco: [
      "Histórico de alergias a medicamentos ou látex",
      "Atopia, asma, rinite alérgica",
      "Múltiplas cirurgias prévias (risco de sensibilização a látex)",
      "Uso de IECA (potencializa reações mediadas por bradicinina)",
    ],
    prevencao: [
      "Anamnese detalhada de alergias em toda consulta pré-anestésica",
      "Protocolo 'livre de látex' em pacientes de risco (espinha bífida, atopia a frutas tropicais)",
      "Preferir rocurônio ou cisatracúrio em pacientes com histórico suspeito a BNM",
      "Manter epinefrina e material de reanimação sempre acessíveis",
    ],
    conduta: [
      "1. Suspender imediatamente o agente suspeito",
      "2. Chamar ajuda — ativar código de anafilaxia",
      "3. Epinefrina: PRIMEIRA LINHA — 0,01 mg/kg IV (adulto: 0,1–0,5 mg); repetir a cada 5 min se necessário",
      "4. O₂ 100%, posição Trendelenburg",
      "5. Expansão volêmica vigorosa: SF 0,9% ou Ringer lactato 1–2 L IV rápido",
      "6. Anti-histamínico: difenidramina 1 mg/kg IV (adjuvante, não substitui epinefrina)",
      "7. Corticoide: metilprednisolona 1–2 mg/kg IV (ação tardia, previne reação bifásica)",
      "8. Vasopressores contínuos se hipotensão refratária (norepinefrina 0,1–0,3 mcg/kg/min)",
      "9. Dosar triptase sérica em 1–2h para confirmação diagnóstica",
    ],
    referencia:
      "Mertes PM et al. Perioperative anaphylaxis. J Allergy Clin Immunol Pract. 2019;7(7):2134–2142. / Harper NJN et al. AAGBI Guidelines 2018. Anaesthesia. 2018;73:1286.",
  },
  {
    title: "Intoxicação por Anestésico Local (LAST)",
    severity: "Crítica",
    tone: "rose",
    incidencia: "1:1.000 bloqueios periféricos",
    descricao:
      "Toxicidade sistêmica por absorção excessiva ou injeção intravascular acidental de anestésico local. Manifestações bifásicas: fase excitatória (zumbido, tremores, convulsões) → fase depressiva (bradicardia, assistolia, colapso cardiovascular). Bupivacaína é o agente de maior cardiotoxicidade.",
    fatoresRisco: [
      "Injeção intravascular inadvertida (ausência de aspiração ou dose-teste)",
      "Dose total excessiva para o peso",
      "Acidose, hipercapnia, hipóxia (potencializam toxicidade)",
      "Doença cardíaca preexistente, uso de betabloqueadores",
      "Bloqueio de alta vascularização (intercostal, caudal, epidural)",
    ],
    prevencao: [
      "Calcular dose máxima antes de qualquer bloqueio: bupivacaína 2 mg/kg, ropivacaína 3 mg/kg, lidocaína 4,5 mg/kg (7 mg/kg com epinefrina)",
      "Aspirar antes de cada injeção e entre cada 5 mL injetado",
      "Usar dose-teste com epinefrina 1:200.000 (15–20 mcg): taquicardia > 20 bpm = intravascular",
      "Injeção fracionada lenta com comunicação ativa com o paciente",
      "Preferir ropivacaína à bupivacaína em bloqueios de grande volume",
      "Ter kit LAST (Intralipid 20%) acessível em toda sala onde se realiza bloqueio",
    ],
    conduta: [
      "1. Interromper injeção imediatamente",
      "2. Chamar ajuda — acionar código LAST",
      "3. Garantir via aérea: O₂ 100%, ventilação assistida se necessário",
      "4. Controlar convulsões: midazolam 2–5 mg IV ou propofol 1 mg/kg IV (baixa dose)",
      "5. EMULSÃO LIPÍDICA 20% (Intralipid): bolus 1,5 mL/kg IV em 1 min → infusão 0,25 mL/kg/min",
      "6. Se PCR: ACLS + repetir Intralipid bolus até 3x (dose total máx.: 12 mL/kg)",
      "7. Evitar vasopressina; preferir epinefrina em doses baixas (< 1 mcg/kg)",
      "8. Monitorização prolongada por ≥ 6h (risco de recorrência)",
    ],
    referencia:
      "Neal JM et al. ASRA Practice Advisory on Local Anesthetic Systemic Toxicity 2023. Reg Anesth Pain Med. 2023. / El-Boghdadly K et al. Anesthesiology. 2018;129:764.",
  },
  {
    title: "Laringoespasmo",
    severity: "Alta",
    tone: "amber",
    incidencia: "1:1.000 anestesias gerais; até 1:100 em crianças",
    descricao:
      "Contração reflexa e sustentada das cordas vocais causando obstrução parcial ou total da via aérea. Mais comum na indução e emergência anestésica, especialmente em crianças. Principal gatilho: estimulação em plano anestésico superficial (secreções, sangue, manipulação de via aérea).",
    fatoresRisco: [
      "Criança < 5 anos, infecção respiratória recente (< 4 semanas)",
      "Plano anestésico superficial durante manipulação de via aérea",
      "Presença de secreções, sangue ou corpo estranho em laringe",
      "Cirurgias de orofaringe (amigdalectomia, adenoidectomia)",
      "Tabagismo ativo, exposição passiva à fumaça",
    ],
    prevencao: [
      "Adiar cirurgia eletiva em criança com IVAS ativa ou nos 4 primeiros dias",
      "Aprofundar anestesia antes da intubação e extubação",
      "Lidocaína IV 1,5 mg/kg 1–2 min antes da extubação (reduz reflexo de laringe)",
      "Extubação com paciente em plano profundo (evitar fase de excitação) ou totalmente acordado",
      "Aspiração cuidadosa da orofaringe antes da extubação",
    ],
    conduta: [
      "1. Retirar estímulo precipitante (aspiração, agulha, campo cirúrgico)",
      "2. Posicionar: hiperextensão do pescoço + protrusão mandibular (jaw thrust)",
      "3. Pressão positiva com máscara facial firme (CPAP 20–30 cmH₂O) com O₂ 100%",
      "4. Pressão de Larson: pressão digital firme na fossa retromandibular bilateral",
      "5. Se parcial refratário: propofol 0,5–1 mg/kg IV para aprofundar anestesia",
      "6. Se total/hipóxia grave: succinilcolina 0,1 mg/kg IV (dose mínima efetiva) ou 4 mg/kg IM",
      "7. Intubação de emergência se não resolvido em 60 segundos",
      "8. Monitorar edema pulmonar por pressão negativa pós-laringoespasmo",
    ],
    referencia:
      "Hampson-Evans D et al. Pediatric laryngospasm. Paediatr Anaesth. 2008;18(4):303–7. / Gropper MA. Miller's Anesthesia, 9ª ed., cap. 55.",
  },
  {
    title: "Broncoespasmo Intraoperatório",
    severity: "Alta",
    tone: "amber",
    incidencia: "1,7% das anestesias gerais; até 9% em asmáticos",
    descricao:
      "Contração da musculatura lisa brônquica com aumento da resistência das vias aéreas. Diagnóstico: ↑ pressão de pico de vias aéreas, capnograma em rampa ascendente (sinal de 'tubo de palhinha'), sibilos à ausculta. Diagnóstico diferencial: intubação seletiva, pneumotórax, obstrução do circuito.",
    fatoresRisco: [
      "Asma brônquica (especialmente não controlada), DPOC",
      "Intubação em plano anestésico superficial",
      "Tabagismo ativo (aguardar ≥ 8 semanas de abstinência para benefício pulmonar)",
      "IVAS recente, anafilaxia, aspiração pulmonar",
      "Uso de morfina (liberação de histamina), cisatracúrio em altas doses",
    ],
    prevencao: [
      "Otimizar tratamento da asma/DPOC no pré-op; confirmar uso de broncodilatador no dia",
      "Lidocaína IV 1,5 mg/kg 2–3 min antes da intubação",
      "Considerar máscara laríngea em asmáticos (evita estimulação traqueal)",
      "Preferir cetamina na indução de asmáticos graves (broncodilatador endógeno)",
      "Usar sevoflurano (menor irritação brônquica entre os halogenados)",
    ],
    conduta: [
      "1. Confirmar diagnóstico: excluir intubação seletiva, dobramento do tubo, pneumotórax",
      "2. Aumentar FiO₂ para 100%",
      "3. Aprofundar anestesia: propofol 0,5–1 mg/kg IV ou aumentar sevoflurano",
      "4. Salbutamol inalatório: 4–8 puffs via adaptador no circuito ventilatório",
      "5. Brometo de ipratrópio 2–4 puffs se resposta incompleta",
      "6. Aminofilina 5 mg/kg IV em 20–30 min se refratário (monitorar arritmias)",
      "7. Corticoide IV: hidrocortisona 200 mg ou metilprednisolona 80 mg (ação em 4–6h)",
      "8. Epinefrina 0,1–0,3 mg IV em broncoespasmo grave com instabilidade hemodinâmica",
    ],
    referencia:
      "Woods BD, Sladen RN. Perioperative considerations for the patient with asthma and bronchospasm. Br J Anaesth. 2009;103(suppl 1):i57–i65. / Morgan & Mikhail, 6ª ed., cap. 24.",
  },
  {
    title: "Despertar Intraoperatório",
    severity: "Alta",
    tone: "amber",
    incidencia: "0,1–0,2% (geral); até 1% em cesariana e cirurgia cardíaca",
    descricao:
      "Memória explícita consciente de eventos durante anestesia geral com bloqueio neuromuscular. Pode causar dor, pânico e PTSD em 30–50% dos casos. Frequentemente associado a falha na administração de agentes hipnóticos, não a tolerância.",
    fatoresRisco: [
      "Uso de bloqueadores neuromusculares (mascaram o sinal clínico)",
      "Anestesia TIVA sem monitorização de profundidade",
      "Cesariana, cirurgia cardíaca com CEC, trauma com instabilidade",
      "Pacientes com história de despertar prévio ou baixo requerimento anestésico",
      "Erro de equipamento: vaporizador vazio, bomba de infusão desconectada",
    ],
    prevencao: [
      "Monitorização de profundidade anestésica: BIS (alvo 40–60) ou entropia",
      "Checklist pré-indução: nível do vaporizador, funcionamento da bomba de infusão",
      "Benzodiazepínico na indução em casos de alto risco (midazolam 1–2 mg)",
      "Evitar confiar apenas em sinais clínicos quando há bloqueio neuromuscular profundo",
      "Informar paciente de alto risco no pré-op sobre a possibilidade e abordagem",
    ],
    conduta: [
      "1. Reconhecer sinal: taquicardia, hipertensão, lacrimejamento, sudorese, movimento",
      "2. Aprofundar anestesia IMEDIATAMENTE: aumentar agente inalatório ou bolus de propofol",
      "3. Administrar amnéstico: midazolam 2 mg IV (oferta mesmo que tardia)",
      "4. Verificar equipamentos: vaporizador, bombas, conexões",
      "5. Após cirurgia: abordar o paciente com empatia, perguntar sobre a experiência",
      "6. Encaminhar para suporte psicológico se memória explícita dolorosa",
      "7. Documentar detalhadamente e notificar equipe anestésica",
    ],
    referencia:
      "Pandit JJ et al. 5th National Audit Project (NAP5). Anaesthesia. 2014;69:1089–1101. / Avidan MS et al. NEJM. 2008;358:1097–1108.",
  },
  {
    title: "Hipotensão Perioperatória",
    severity: "Média",
    tone: "blue",
    incidencia: "20–40% das anestesias gerais e neuroaxiais",
    descricao:
      "Redução ≥ 20% da PA sistólica basal ou PAM < 65 mmHg. Associada a lesão miocárdica, injúria renal aguda e aumento de mortalidade perioperatória quando prolongada. Causa mais comum: vasodilatação por agentes anestésicos associada a hipovolemia relativa.",
    fatoresRisco: [
      "Hipovolemia pré-operatória (jejum prolongado, perdas)",
      "Uso de anti-hipertensivos (IECA, BRA, betabloqueadores)",
      "Indução rápida em idosos ou cardiopatas",
      "Raquianestesia sem expansão volêmica prévia",
      "Sepse, insuficiência suprarrenal, cardiomiopatia",
    ],
    prevencao: [
      "Descontinuar IECA/BRA 24h antes em cirurgias eletivas (protocolo institucional)",
      "Pré-carga hídrica guiada em bloqueios neuroaxiais (250–500 mL cristaloide)",
      "Considerar norepinefrina profilática em pacientes de risco (0,05–0,1 mcg/kg/min)",
      "Indução lenta e titulada em idosos e cardiopatas",
      "Monitorização hemodinâmica avançada em cirurgias de grande porte",
    ],
    conduta: [
      "1. Identificar causa: hipovolemia × vasodilatação × disfunção cardíaca × sangramento",
      "2. Reduzir profundidade anestésica se adequado clinicamente",
      "3. Cristaloide 250–500 mL IV em bolus se hipovolemia provável",
      "4. Vasodilatação: fenilefrina 100–200 mcg IV bolus ou efedrina 5–10 mg IV",
      "5. Hipotensão refratária: norepinefrina 0,05–0,3 mcg/kg/min em infusão contínua",
      "6. Bradicardia associada: atropina 0,5 mg IV + efedrina (preferir efedrina em bradicardia + hipotensão)",
      "7. Investigar e tratar causa subjacente (hemorragia, pneumotórax, TEP)",
    ],
    referencia:
      "Sessler DI et al. POISE-3 trial. Lancet. 2022;399(10349):877–887. / Gropper MA. Miller's Anesthesia, 9ª ed., cap. 46.",
  },
  {
    title: "Náuseas e Vômitos Pós-operatórios (NVPO)",
    severity: "Média",
    tone: "blue",
    incidencia: "20–30% (geral); 70–80% em pacientes de alto risco",
    descricao:
      "Complicação mais frequente da anestesia. Aumenta tempo de recuperação, risco de aspiração, deiscência de anastomoses e insatisfação do paciente. Avaliação de risco obrigatória pelo score de Apfel (0–4 pontos): ≥ 2 indica profilaxia combinada.",
    fatoresRisco: [
      "Score de Apfel: sexo feminino (+1), não-fumante (+1), NVPO ou cinetose prévia (+1), uso de opioide pós-op (+1)",
      "Anestesia inalatória (óxido nitroso, halogenados)",
      "Cirurgias de estrabismo, otológicas, abdominais laparoscópicas",
      "Duração > 60 min, uso de neostigmina em alta dose",
    ],
    prevencao: [
      "Calcular Score de Apfel no pré-op; protocolo para ≥ 2 fatores",
      "TIVA com propofol: reduz NVPO em 30% em relação a anestesia inalatória",
      "Dexametasona 4–8 mg IV na indução (ação sinérgica)",
      "Ondansetrona 4 mg IV no final da cirurgia",
      "Minimizar opioides: analgesia multimodal (AINE + dipirona + bloqueio regional)",
      "Hidratação adequada intraoperatória; evitar hipotensão",
    ],
    conduta: [
      "1. Ondansetrona 4 mg IV (se não usada na profilaxia)",
      "2. Metoclopramida 10 mg IV (efeito proquinético adicional)",
      "3. Droperidol 0,625 mg IV (eficaz, monitorar QTc)",
      "4. Dexametasona 4 mg IV se não usada previamente",
      "5. Hidratação EV e manter SpO₂ adequada",
      "6. Scopolamina transdérmica 1,5 mg em NVPO de difícil controle",
      "7. Acupressão no ponto P6 (Neiguan): evidência como adjuvante",
    ],
    referencia:
      "Gan TJ et al. Fourth Consensus Guidelines for the Management of PONV. Anesth Analg. 2020;131(2):411–448. / Apfel CC et al. NEJM. 2004;350:2441–2451.",
  },
  {
    title: "Hipotermia Perioperatória",
    severity: "Média",
    tone: "blue",
    incidencia: "50–90% sem prevenção ativa",
    descricao:
      "Temperatura central < 36°C. Redistribuição periférica do calor corporal na 1ª hora (hipotermia fase 1: queda de 1–1,5°C) é a causa principal. Consequências: coagulopatia (↓ função plaquetária, ↓ atividade enzimática da cascata), ↑ infecção de sítio cirúrgico, prolongamento de bloqueadores neuromusculares, tremores no pós-op.",
    fatoresRisco: [
      "Cirurgias longas (> 2h), abertura de grandes cavidades",
      "Idosos (↓ produção de calor) e crianças (↑ relação superfície/volume)",
      "Temperatura ambiente fria na sala operatória",
      "Infusão de grandes volumes de fluidos frios",
      "Anestesia neuroaxial (vasodilatação periférica extensa)",
    ],
    prevencao: [
      "Pré-aquecimento ativo 30 min antes da indução: reduz queda de temperatura na fase 1",
      "Manta de ar quente (forced-air warming): cobertura de pelo menos 50% da superfície corporal",
      "Fluidos EV aquecidos a 37–38°C (especialmente volumes > 500 mL)",
      "Temperatura da sala: ≥ 21°C para adultos, ≥ 24°C para neonatos",
      "Monitorização de temperatura central (esofagiana, timpânica, retal) em cirurgias longas",
    ],
    conduta: [
      "1. Iniciar aquecimento ativo imediatamente (manta de ar quente)",
      "2. Fluidos IV aquecidos a 37–38°C",
      "3. Aumentar temperatura da sala operatória",
      "4. Cobrir extremidades e cabeça (30% da perda é pela cabeça)",
      "5. Tratar tremores pós-operatórios: meperidina 12,5–25 mg IV (mais eficaz), tramadol 1 mg/kg IV",
      "6. Monitorar coagulação em hipotermia grave (< 35°C): TEG/ROTEM, repor fatores",
      "7. Meta: temperatura central ≥ 36°C antes da extubação",
    ],
    referencia:
      "Sessler DI. Perioperative thermoregulation and heat balance. Lancet. 2016;387(10038):2655–2664. / NICE Guidelines IPG535: Inadvertent perioperative hypothermia. 2016.",
  },
  {
    title: "Dor Pós-operatória Inadequada",
    severity: "Média",
    tone: "blue",
    incidencia: "30–40% dos pacientes relatam dor moderada a intensa no pós-op",
    descricao:
      "Controle inadequado da dor aguda pós-operatória está associado a complicações respiratórias (atelectasia, pneumonia), trombose venosa profunda, retardo de mobilização, cronificação da dor (síndrome de dor pós-cirúrgica persistente em 10–50% dos casos) e aumento de mortalidade.",
    fatoresRisco: [
      "Planejamento analgésico pré-operatório inadequado",
      "Dependência exclusiva de opioides (risco de hiperalgesia induzida)",
      "Procedimentos de alta intensidade dolorosa: cirurgia torácica, artroplastia, laparotomia",
      "Histórico de dor crônica pré-operatória, uso crônico de opioides",
      "Ansiedade, catastrofização da dor (fatores psicológicos)",
    ],
    prevencao: [
      "Analgesia multimodal preventiva: iniciar AINE e/ou dipirona antes da incisão",
      "Bloqueio regional quando indicado: reduz consumo de opioides em 30–60%",
      "Ketamina subdissociativa (0,1–0,5 mg/kg) na indução em dor pós-op intensa esperada",
      "Dexametasona 4–8 mg IV: analgésico adjuvante + antiemético",
      "Educação do paciente sobre expectativas de dor e plano analgésico",
    ],
    conduta: [
      "1. Avaliar sistematicamente com EVA/NRS antes e após intervenção",
      "2. EVA 1–3 (leve): paracetamol 1g IV + dipirona 1g IV + AINE oral/IV",
      "3. EVA 4–6 (moderada): adicionar tramadol 1–2 mg/kg IV ou morfina 0,05–0,1 mg/kg IV",
      "4. EVA 7–10 (intensa): morfina 0,05–0,1 mg/kg IV titulada + considerar bloqueio de resgate",
      "5. Evitar opioide como único agente: sempre associar não opioide de base",
      "6. Considerar PCA (analgesia controlada pelo paciente) em cirurgias de grande porte",
      "7. Encaminhar para dor crônica se dor persistente > 3 meses após cirurgia",
    ],
    referencia:
      "Kehlet H et al. Persistent postsurgical pain. Lancet. 2006;367(9522):1618–1625. / Chou R et al. Management of postoperative pain. J Pain. 2016;17(2):131–157.",
  },
];

const SEVERITY_ORDER: Record<Severity, number> = { Crítica: 0, Alta: 1, Média: 2 };

function cleanStepText(value: string) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

const CONDUCT_COMPLEMENTS: Record<
  string,
  {
    primeiros5min: string[];
    monitorizacao: string[];
    errosComuns: string[];
    aposEstabilizar: string[];
  }
> = {
  "Hipertermia Maligna": {
    primeiros5min: [
      "Suspender agente desencadeante e hiperventilar com O2 100% imediatamente.",
      "Administrar dantrolene sem aguardar exames confirmatórios.",
      "Iniciar resfriamento ativo enquanto organiza equipe e medicações.",
    ],
    monitorizacao: [
      "Temperatura central contínua e ETCO2 em tempo real.",
      "Gasometria seriada, K+, CPK, lactato e débito urinário.",
      "ECG contínuo para arritmias por hipercalemia.",
    ],
    errosComuns: [
      "Aguardar hipertermia importante para suspeitar HM.",
      "Subdosar dantrolene ou atrasar repetição da dose.",
      "Interromper monitorização cedo demais após melhora inicial.",
    ],
    aposEstabilizar: [
      "UTI por 24–48h pelo risco de recorrência.",
      "Documentar gatilho e orientar paciente/família para futuras anestesias.",
      "Encaminhar para investigação específica (IVCT/avaliação genética).",
    ],
  },
  "Via Aérea Difícil Não Antecipada (CICO)": {
    primeiros5min: [
      "Declarar verbalmente CICO e chamar ajuda imediata.",
      "Limitar tentativas repetidas de laringoscopia; priorizar oxigenação.",
      "Se falha de oxigenação persistente, avançar para acesso frontal do pescoço.",
    ],
    monitorizacao: [
      "SpO2 contínua e capnografia para confirmar ventilação.",
      "Frequência cardíaca/PA para sinais de hipóxia progressiva.",
      "Registrar tempo de apneia e dispositivos usados.",
    ],
    errosComuns: [
      "Insistir em múltiplas tentativas de IOT sem mudança de estratégia.",
      "Postergar cricotireoidostomia quando já há dessaturação grave.",
      "Equipe sem comunicação clara de plano A/B/C/D.",
    ],
    aposEstabilizar: [
      "Garantir via aérea definitiva e revisar causa da dificuldade.",
      "Notificar no prontuário: 'via aérea difícil' para futuras abordagens.",
      "Debriefing da equipe para melhoria de processo.",
    ],
  },
  "Anafilaxia Perioperatória": {
    primeiros5min: [
      "Suspender agente suspeito e administrar epinefrina precocemente.",
      "Oxigênio 100% + expansão volêmica vigorosa.",
      "Preparar vasopressor contínuo se hipotensão refratária.",
    ],
    monitorizacao: [
      "PA invasiva se instabilidade persistente.",
      "Capnografia e complacência para broncoespasmo.",
      "Diurese e lactato para perfusão sistêmica.",
    ],
    errosComuns: [
      "Tratar primeiro com anti-histamínico e atrasar epinefrina.",
      "Subestimar quadro sem lesão cutânea evidente.",
      "Não coletar triptase na janela adequada.",
    ],
    aposEstabilizar: [
      "Encaminhar para alergologia e investigação etiológica formal.",
      "Entregar relatório anestésico com provável agente gatilho.",
      "Planejar futura anestesia com protocolo de evicção.",
    ],
  },
  "Intoxicação por Anestésico Local (LAST)": {
    primeiros5min: [
      "Interromper injeção imediatamente e chamar ajuda.",
      "Assegurar via aérea/oxigenação para evitar hipóxia e acidose.",
      "Iniciar emulsão lipídica sem atraso quando houver suspeita clínica.",
    ],
    monitorizacao: [
      "ECG contínuo para arritmias e bloqueios.",
      "Gasometria, pH e lactato seriados.",
      "Nível de consciência e recorrência de convulsões.",
    ],
    errosComuns: [
      "Aguardar colapso cardiovascular para iniciar lipídio.",
      "Usar doses altas de epinefrina na RCP da LAST.",
      "Não revisar cálculo de dose máxima antes do bloqueio.",
    ],
    aposEstabilizar: [
      "Observação monitorizada por pelo menos 6 horas.",
      "Documentar dose, local de bloqueio e provável mecanismo.",
      "Reforçar protocolo de prevenção em bloqueios futuros.",
    ],
  },
  Laringoespasmo: {
    primeiros5min: [
      "Remover estímulo, realizar jaw thrust e CPAP com O2 100%.",
      "Aprofundar plano anestésico rapidamente se necessário.",
      "Usar succinilcolina precoce em obstrução completa com dessaturação.",
    ],
    monitorizacao: [
      "SpO2 contínua e capnografia para retorno de ventilação.",
      "PA/FC para repercussão hemodinâmica da hipóxia.",
      "Ausculta pulmonar após reversão para edema por pressão negativa.",
    ],
    errosComuns: [
      "Atrasar bloqueador neuromuscular em laringoespasmo total.",
      "Ventilar com pressão insuficiente e máscara mal selada.",
      "Ignorar secreções/sangue na via aérea.",
    ],
    aposEstabilizar: [
      "Observar em recuperação para recorrência.",
      "Avaliar edema pulmonar e necessidade de suporte ventilatório.",
      "Registrar evento para planejamento de próxima anestesia.",
    ],
  },
  "Broncoespasmo Intraoperatório": {
    primeiros5min: [
      "Diferenciar rapidamente broncoespasmo de causas mecânicas.",
      "Aumentar FiO2 e aprofundar anestesia.",
      "Iniciar broncodilatador inalatório em altas doses precoces.",
    ],
    monitorizacao: [
      "Pressões de via aérea, volume corrente e curva capnográfica.",
      "SpO2 e ETCO2 seriados.",
      "Gasometria se broncoespasmo persistente.",
    ],
    errosComuns: [
      "Tratar como broncoespasmo sem checar tubo/circuito.",
      "Manter estímulo cirúrgico intenso sem aprofundar anestesia.",
      "Atrasar epinefrina em broncoespasmo grave com instabilidade.",
    ],
    aposEstabilizar: [
      "Reavaliar necessidade de UTI dependendo da gravidade.",
      "Ajustar plano de analgesia e broncodilatação no pós-op.",
      "Documentar gatilhos e resposta terapêutica.",
    ],
  },
  "Despertar Intraoperatório": {
    primeiros5min: [
      "Aumentar imediatamente o componente hipnótico da anestesia.",
      "Checar vaporizador, fluxo e bomba de infusão.",
      "Adicionar amnéstico como adjuvante.",
    ],
    monitorizacao: [
      "BIS/entropia quando disponível.",
      "Sinais autonômicos persistentes sob bloqueio neuromuscular.",
      "Concentração expirada de halogenado (MAC).",
    ],
    errosComuns: [
      "Interpretar sinais autonômicos apenas como dor cirúrgica.",
      "Não investigar falha técnica de equipamento.",
      "Desconsiderar relato do paciente no pós-operatório.",
    ],
    aposEstabilizar: [
      "Conversar de forma empática e validar experiência do paciente.",
      "Registrar detalhadamente o evento.",
      "Encaminhar para apoio psicológico se necessário.",
    ],
  },
  "Hipotensão Perioperatória": {
    primeiros5min: [
      "Confirmar PA e correlacionar com contexto clínico/cirúrgico.",
      "Tratar causa provável em paralelo (volume, vasoplegia, sangramento).",
      "Iniciar vasopressor precoce se PAM < 65 mmHg persistente.",
    ],
    monitorizacao: [
      "PA em intervalos curtos ou invasiva em alto risco.",
      "Diurese, lactato e perfusão periférica.",
      "ECG para isquemia miocárdica perioperatória.",
    ],
    errosComuns: [
      "Tratar toda hipotensão apenas com volume.",
      "Atrasar norepinefrina na vasoplegia importante.",
      "Não revisar profundidade anestésica e perdas cirúrgicas.",
    ],
    aposEstabilizar: [
      "Reavaliar estratégia hemodinâmica para o restante da cirurgia.",
      "Manter metas de perfusão conforme comorbidades.",
      "No pós-op, vigiar função renal e troponina quando indicado.",
    ],
  },
  "Náuseas e Vômitos Pós-operatórios (NVPO)": {
    primeiros5min: [
      "Classificar risco e iniciar profilaxia combinada quando indicado.",
      "No evento agudo, usar antiemético de classe diferente da profilaxia.",
      "Corrigir dor, hipotensão e hipovolemia associadas.",
    ],
    monitorizacao: [
      "Hidratação e tolerância oral progressiva.",
      "Episódios de vômito e risco de aspiração.",
      "ECG quando usar droperidol (QTc).",
    ],
    errosComuns: [
      "Repetir o mesmo antiemético sem trocar classe farmacológica.",
      "Negligenciar contribuição de opioides e dor mal controlada.",
      "Não estratificar risco no pré-operatório.",
    ],
    aposEstabilizar: [
      "Prescrever esquema domiciliar em pacientes de alto risco.",
      "Orientar retorno se vômitos persistentes/desidratação.",
      "Registrar profilaxia para ajustar em anestesias futuras.",
    ],
  },
  "Hipotermia Perioperatória": {
    primeiros5min: [
      "Iniciar aquecimento ativo e fluidos aquecidos imediatamente.",
      "Reduzir perda térmica por exposição desnecessária.",
      "Checar temperatura central e tendência.",
    ],
    monitorizacao: [
      "Temperatura central contínua em cirurgias prolongadas.",
      "Sangramento e coagulopatia quando hipotermia moderada/grave.",
      "Tremores e conforto térmico no pós-operatório.",
    ],
    errosComuns: [
      "Aguardar queda acentuada para iniciar aquecimento.",
      "Subestimar impacto da hipotermia na coagulação e infecção.",
      "Usar apenas cobertor passivo em casos de alto risco.",
    ],
    aposEstabilizar: [
      "Manter temperatura >= 36C antes da alta da recuperação.",
      "Ajustar protocolo térmico para próximos procedimentos.",
      "Documentar evento e tempo até normotermia.",
    ],
  },
  "Dor Pós-operatória Inadequada": {
    primeiros5min: [
      "Mensurar dor com escala padronizada e tratar por intensidade.",
      "Combinar analgésicos de mecanismos diferentes desde o início.",
      "Reavaliar resposta em intervalos curtos e titular doses.",
    ],
    monitorizacao: [
      "EVA/NRS seriados e sedação respiratória com opioides.",
      "Sinais de efeito adverso (náusea, retenção urinária, prurido).",
      "Impacto funcional: tosse, mobilização e respiração profunda.",
    ],
    errosComuns: [
      "Prescrever apenas opioide sem base multimodal.",
      "Não reavaliar dor após intervenção.",
      "Ignorar fatores psicossociais que amplificam dor.",
    ],
    aposEstabilizar: [
      "Planejar desmame e analgesia domiciliar segura.",
      "Orientar sinais de alerta e quando retornar.",
      "Encaminhar para dor especializada se persistência > 3 meses.",
    ],
  },
};

const POCKET_CHECKLIST: Record<
  string,
  { reconhecer: string[]; agir: string[]; confirmar: string[] }
> = {
  "Hipertermia Maligna": {
    reconhecer: ["ETCO2 subindo rapidamente", "Rigidez muscular", "Taquicardia/hipertermia progressiva"],
    agir: ["Suspender gatilho", "Dantrolene imediato", "O2 100% + resfriamento ativo"],
    confirmar: ["Gasometria e K+", "CPK/mioglobina", "Planejar UTI 24–48h"],
  },
  "Via Aérea Difícil Não Antecipada (CICO)": {
    reconhecer: ["Falha em intubação e ventilação", "SpO2 em queda", "Capnografia ausente/ineficaz"],
    agir: ["Chamar ajuda", "Plano B/C imediato", "Acesso frontal do pescoço se CICO"],
    confirmar: ["Capnografia após via aérea", "Registrar dispositivos/tentativas", "Sinalizar via aérea difícil no prontuário"],
  },
  "Anafilaxia Perioperatória": {
    reconhecer: ["Hipotensão súbita", "Broncoespasmo", "Eritema/urticária (quando presente)"],
    agir: ["Suspender agente suspeito", "Epinefrina precoce", "Volume + O2 100%"],
    confirmar: ["Melhora hemodinâmica", "Coletar triptase", "Encaminhar para alergologia"],
  },
  "Intoxicação por Anestésico Local (LAST)": {
    reconhecer: ["Sintomas neurológicos iniciais", "Convulsão/arrítmia", "Colapso após bloqueio"],
    agir: ["Parar injeção", "Via aérea e O2", "Iniciar emulsão lipídica 20%"],
    confirmar: ["Estabilidade ECG/hemodinâmica", "Observação >= 6h", "Revisar cálculo de dose"],
  },
  Laringoespasmo: {
    reconhecer: ["Estridor/silêncio respiratório", "Movimento torácico sem ventilação", "Dessaturação rápida"],
    agir: ["Jaw thrust + CPAP", "Aprofundar anestesia", "Succinilcolina se obstrução completa"],
    confirmar: ["Capnografia retomada", "SpO2 recuperada", "Pesquisar edema pulmonar"],
  },
  "Broncoespasmo Intraoperatório": {
    reconhecer: ["Pico de pressão alto", "Capnograma em rampa", "Sibilos difusos"],
    agir: ["Excluir causa mecânica", "Aprofundar anestesia", "Salbutamol em circuito"],
    confirmar: ["Queda de pressões de via aérea", "Melhora ETCO2/SpO2", "Definir plano broncodilatador pós-op"],
  },
};

const ADVANCED_CONDUCT: Record<
  string,
  {
    metas: string[];
    dosesChave: string[];
    escalonamento: string[];
  }
> = {
  "Hipertermia Maligna": {
    metas: [
      "ETCO2 em queda progressiva nas primeiras intervenções.",
      "Temperatura central < 38 C em tendência de queda contínua.",
      "Diurese > 2 mL/kg/h para proteção renal por mioglobinúria.",
    ],
    dosesChave: [
      "Dantrolene 2,5 mg/kg IV imediato; repetir até 10 mg/kg.",
      "Manutenção: dantrolene 1 mg/kg IV a cada 6h por 24–48h.",
      "Hipercalemia: insulina regular 10 U + glicose 25 g IV; considerar CaCl2 10% 10 mL IV.",
    ],
    escalonamento: [
      "UTI obrigatória por risco de recorrência e disfunção orgânica.",
      "Se instabilidade refratária, discutir suporte vasopressor contínuo e ventilação protetora.",
      "Repetir gasometria/eletrólitos em intervalos curtos (15–30 min até estabilizar).",
    ],
  },
  "Via Aérea Difícil Não Antecipada (CICO)": {
    metas: [
      "Restabelecer oxigenação (SpO2 em recuperação sustentada).",
      "Confirmar ventilação por capnografia (onda consistente).",
      "Limitar trauma de via aérea com tentativas racionais.",
    ],
    dosesChave: [
      "Se necessidade de aprofundar: propofol 0,5–1 mg/kg IV em bolus titulado.",
      "Se broncoespasmo associado: salbutamol em circuito (4–8 puffs).",
      "Se edema de via aérea suspeito: considerar dexametasona 8–10 mg IV como adjuvante.",
    ],
    escalonamento: [
      "Após CICO: manter via aérea definitiva e adiar extubação sem plano estruturado.",
      "Acionar equipe cirúrgica para acesso frontal do pescoço sem atraso.",
      "Registrar detalhadamente e emitir alerta de via aérea difícil para futuras anestesias.",
    ],
  },
  "Anafilaxia Perioperatória": {
    metas: [
      "PAM >= 65 mmHg sem piora de broncoespasmo.",
      "SpO2 > 94% com melhora de complacência ventilatória.",
      "Redução de necessidade de bolus repetidos de epinefrina.",
    ],
    dosesChave: [
      "Epinefrina IV titulada: 10–50 mcg em choque inicial; 0,1–0,5 mg em colapso grave.",
      "Volume: cristaloide 20–30 mL/kg rápido conforme resposta.",
      "Norepinefrina em infusão quando hipotensão persiste apesar de volume/epinefrina.",
    ],
    escalonamento: [
      "Se refratária: considerar monitorização invasiva e UTI pós-operatória.",
      "Coletar triptase em 1–2h e repetir em 24h para apoio diagnóstico.",
      "Encaminhar para investigação alergológica antes de novo procedimento eletivo.",
    ],
  },
  "Intoxicação por Anestésico Local (LAST)": {
    metas: [
      "Controlar convulsão/arrítmia e manter perfusão adequada.",
      "Normalização progressiva de ECG e estado neurológico.",
      "Evitar acidose/hipóxia, que amplificam cardiotoxicidade.",
    ],
    dosesChave: [
      "Emulsão lipídica 20%: bolus 1,5 mL/kg; infusão 0,25 mL/kg/min.",
      "Convulsão: midazolam 2–5 mg IV (preferir benzodiazepínico).",
      "Epinefrina em RCP: preferir doses menores e tituladas.",
    ],
    escalonamento: [
      "Se instabilidade persistente, manter suporte avançado e UTI.",
      "Observação monitorizada por pelo menos 6h (ou mais se evento grave).",
      "Revisar técnica de bloqueio, dose e documentação para prevenção secundária.",
    ],
  },
  Laringoespasmo: {
    metas: [
      "Ventilação efetiva com capnografia e SpO2 em ascensão.",
      "Reversão rápida da obstrução sem hipoxemia prolongada.",
      "Prevenir edema pulmonar por pressão negativa.",
    ],
    dosesChave: [
      "Propofol 0,5–1 mg/kg IV se espasmo parcial com plano superficial.",
      "Succinilcolina 0,1–0,5 mg/kg IV em espasmo refratário/hipóxia.",
      "Se sem acesso venoso: succinilcolina IM 4 mg/kg.",
    ],
    escalonamento: [
      "Persistência > 60s com dessaturação: avançar para estratégia invasiva de via aérea.",
      "Vigiar edema pulmonar e necessidade de suporte ventilatório no pós-op.",
      "Registrar evento e fatores precipitantes para anestesias futuras.",
    ],
  },
  "Broncoespasmo Intraoperatório": {
    metas: [
      "Queda de pressão de pico e melhora do volume corrente.",
      "Melhora de SpO2 e ETCO2.",
      "Estabilidade hemodinâmica durante broncodilatação.",
    ],
    dosesChave: [
      "Salbutamol 4–8 puffs via circuito; repetir conforme resposta.",
      "Epinefrina titulada em broncoespasmo grave com choque associado.",
      "Corticoide IV (hidrocortisona 200 mg ou equivalente) como adjuvante.",
    ],
    escalonamento: [
      "Se refratário: gasometria, exclusão de pneumotórax e UTI conforme gravidade.",
      "Avaliar ventilação controlada com tempo expiratório prolongado.",
      "Reavaliar plano anestésico e gatilho farmacológico.",
    ],
  },
  "Despertar Intraoperatório": {
    metas: [
      "Restabelecer profundidade hipnótica adequada rapidamente.",
      "Evitar recorrência do evento no mesmo procedimento.",
      "Reduzir impacto psicológico pós-operatório.",
    ],
    dosesChave: [
      "Bolus de propofol titulado conforme contexto hemodinâmico.",
      "Midazolam 1–2 mg IV como adjuvante amnéstico.",
      "Ajustar MAC alvo quando anestesia inalatória estiver em uso.",
    ],
    escalonamento: [
      "Checar sistema de entrega de anestésico (vaporizador, bombas, linhas).",
      "No pós-op, entrevista estruturada e documentação formal.",
      "Encaminhar para suporte psicológico se memória explícita traumática.",
    ],
  },
  "Hipotensão Perioperatória": {
    metas: [
      "PAM >= 65 mmHg (ou alvo individualizado por comorbidades).",
      "Perfusão periférica e diurese preservadas.",
      "Minimizar tempo acumulado de hipotensão.",
    ],
    dosesChave: [
      "Fenilefrina 50–200 mcg IV em vasoplegia com taquicardia.",
      "Efedrina 5–10 mg IV em hipotensão com bradicardia relativa.",
      "Norepinefrina 0,02–0,2 mcg/kg/min se necessidade persistente.",
    ],
    escalonamento: [
      "Se refratária: monitorização invasiva e busca ativa de causa estrutural/sangramento.",
      "Reavaliar profundidade anestésica, volemia e função cardíaca.",
      "Pós-op: vigilância de lesão renal e miocárdica conforme risco.",
    ],
  },
  "Náuseas e Vômitos Pós-operatórios (NVPO)": {
    metas: [
      "Controlar náusea/vômito mantendo hidratação e conforto.",
      "Evitar aspiração e atraso de alta.",
      "Reduzir recorrência nas primeiras 24h.",
    ],
    dosesChave: [
      "Ondansetrona 4 mg IV (se não usada na profilaxia).",
      "Droperidol 0,625–1,25 mg IV (avaliar QTc).",
      "Dexametasona 4–8 mg IV e/ou metoclopramida 10 mg IV conforme esquema prévio.",
    ],
    escalonamento: [
      "Se refratária: combinar classes diferentes e reavaliar dor/opioide/hipovolemia.",
      "Monitorar risco de desidratação e broncoaspiração.",
      "Plano domiciliar para alto risco ou recorrência.",
    ],
  },
  "Hipotermia Perioperatória": {
    metas: [
      "Temperatura central >= 36 C antes da alta da recuperação.",
      "Redução de tremores e desconforto térmico.",
      "Prevenção de coagulopatia associada ao frio.",
    ],
    dosesChave: [
      "Aquecimento ativo contínuo + fluidos aquecidos.",
      "Tremor importante: considerar meperidina 12,5–25 mg IV em contexto apropriado.",
      "Ajuste da temperatura ambiente e cobertura corporal ampla.",
    ],
    escalonamento: [
      "Se hipotermia moderada/grave, monitorar coagulação e sangramento.",
      "Prolongar monitorização na recuperação até normotermia sustentada.",
      "Revisar protocolo de prevenção para próximos casos de risco.",
    ],
  },
  "Dor Pós-operatória Inadequada": {
    metas: [
      "Alcançar dor tolerável com função preservada (respirar, tossir, mobilizar).",
      "Reduzir necessidade de resgates opioides repetidos.",
      "Evitar cronificação da dor.",
    ],
    dosesChave: [
      "Morfina IV titulada 1–2 mg a cada 5–10 min conforme resposta clínica.",
      "Dipirona 1 g IV / paracetamol 1 g como base multimodal.",
      "Adicionar AINE e bloqueio de resgate quando não houver contraindicação.",
    ],
    escalonamento: [
      "Se dor refratária: reavaliar causa cirúrgica/complicação e acionar equipe de dor.",
      "PCA em pacientes de alto consumo de analgésico.",
      "Plano de alta com orientação clara de uso e sinais de alerta.",
    ],
  },
};

export default function ComplicacoesPage() {
  const [filter, setFilter] = useState<Severity | "Todas">("Todas");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return COMPLICATIONS.filter((c) => {
      if (filter !== "Todas" && c.severity !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.title.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [filter, search]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <SectionHeader
        eyebrow="Módulo 05"
        title="Complicações"
        description="Condutas baseadas em evidências para as principais ocorrências em anestesiologia."
      />

      <AppCard>
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-rose">
          Filtrar por severidade
        </p>
        <div className="grid grid-cols-4 gap-2">
          {(["Todas", "Crítica", "Alta", "Média"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-xl border py-2 text-xs font-medium transition ${
                filter === s
                  ? s === "Crítica"
                    ? "border-rose/40 bg-rose/15 text-rose"
                    : s === "Alta"
                      ? "border-amber/40 bg-amber/15 text-amber"
                      : s === "Média"
                        ? "border-blue/40 bg-blue/15 text-blue"
                        : "border-teal/40 bg-teal/15 text-teal"
                  : "border-border bg-background/35 text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar complicação..."
          className="mt-3 w-full rounded-xl border border-border bg-background/35 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-teal/40 focus:outline-none"
        />
      </AppCard>

      <p className="text-xs text-muted px-1">
        {filtered.length} complicação{filtered.length !== 1 ? "ões" : ""} · clique para expandir
      </p>

      <section className="space-y-3">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.title;
          const extras = CONDUCT_COMPLEMENTS[item.title];
          const pocket = POCKET_CHECKLIST[item.title];
          const advanced = ADVANCED_CONDUCT[item.title];
          const quickChecklist = pocket
            ? [pocket.reconhecer[0], pocket.agir[0], pocket.confirmar[0]]
            : item.conduta
                .slice(0, 3)
                .map((step) => step.replace(/^\d+\.\s*/, "").trim());
          return (
            <AppCard
              key={item.title}
              as="article"
              className="cursor-pointer space-y-0 transition hover:border-border/80"
              onClick={() => setExpandedId(isExpanded ? null : item.title)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold leading-tight text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">{item.incidencia}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge
                    tone={item.tone}
                    className="px-2 py-1 text-xs"
                  >
                    {item.severity}
                  </StatusBadge>
                  <span className="text-muted text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted leading-relaxed">{item.descricao}</p>

              {/* Always-visible quick summary */}
              {!isExpanded && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-blue/20 bg-blue/5 px-3 py-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-blue mb-1">
                      Conduta de bolso (1-2-3)
                    </p>
                    <ul className="space-y-1">
                      {quickChecklist.map((step, idx) => (
                        <li key={idx} className="text-xs text-muted leading-relaxed">
                          <span className="mr-1 font-semibold text-foreground">{idx + 1})</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-teal/20 bg-teal/5 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-teal mb-1">
                        Prevenção estruturada
                      </p>
                      <ol className="space-y-1">
                        {item.prevencao.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="text-xs text-muted leading-relaxed">
                            <span className="mr-1 font-semibold text-foreground">{idx + 1})</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="rounded-xl border border-rose/20 bg-rose/5 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-rose mb-1">
                        Conduta inicial estruturada
                      </p>
                      <ol className="space-y-1">
                        {item.conduta.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="text-xs text-muted leading-relaxed">
                            <span className="mr-1 font-semibold text-foreground">{idx + 1})</span>
                            {cleanStepText(step)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  {advanced ? (
                    <div className="rounded-xl border border-amber/20 bg-amber/5 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-amber mb-1">
                        Escalonamento
                      </p>
                      <p className="text-xs text-muted leading-relaxed">{advanced.escalonamento[0]}</p>
                    </div>
                  ) : null}
                </div>
              )}

              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {/* Pocket checklist */}
                  {pocket ? (
                    <div className="rounded-xl border border-blue/20 bg-blue/5 px-3 py-3">
                      <p className="mb-2 font-mono text-xs uppercase tracking-wider text-blue">
                        Checklist de bolso
                      </p>
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-lg border border-border/70 bg-background/35 px-2.5 py-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber">
                            1) Reconhecer
                          </p>
                          <ul className="space-y-1">
                            {pocket.reconhecer.map((v, i) => (
                              <li key={i} className="text-xs text-muted leading-relaxed">
                                • {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/35 px-2.5 py-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose">
                            2) Agir
                          </p>
                          <ul className="space-y-1">
                            {pocket.agir.map((v, i) => (
                              <li key={i} className="text-xs text-muted leading-relaxed">
                                • {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/35 px-2.5 py-2">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-teal">
                            3) Confirmar
                          </p>
                          <ul className="space-y-1">
                            {pocket.confirmar.map((v, i) => (
                              <li key={i} className="text-xs text-muted leading-relaxed">
                                • {v}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Fatores de risco */}
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-amber">
                      Fatores de risco
                    </p>
                    <ul className="space-y-1">
                      {item.fatoresRisco.map((f, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted">
                          <span className="mt-0.5 shrink-0 text-amber">◦</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prevenção */}
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-teal">
                      Prevenção
                    </p>
                    <ul className="space-y-1">
                      {item.prevencao.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted">
                          <span className="mt-0.5 shrink-0 text-teal">◦</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conduta */}
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-rose">
                      Conduta anestésica prática (passo a passo)
                    </p>
                    <ol className="space-y-2">
                      {item.conduta.map((c, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-border/70 bg-background/30 px-2.5 py-2 text-sm text-muted leading-relaxed"
                        >
                          <span className="mr-1 font-semibold text-foreground">{i + 1})</span>
                          {cleanStepText(c)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Conduta complementar prática */}
                  {extras ? (
                    <div className="rounded-xl border border-border bg-background/35 px-3 py-3 space-y-3">
                      <p className="text-xs font-semibold text-foreground">
                        Complemento prático de conduta
                      </p>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-rose">
                          Primeiros 5 minutos
                        </p>
                        <ul className="space-y-1">
                          {extras.primeiros5min.map((step, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-blue">
                          Monitorização obrigatória
                        </p>
                        <ul className="space-y-1">
                          {extras.monitorizacao.map((step, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber">
                          Erros a evitar
                        </p>
                        <ul className="space-y-1">
                          {extras.errosComuns.map((step, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-teal">
                          Após estabilizar
                        </p>
                        <ul className="space-y-1">
                          {extras.aposEstabilizar.map((step, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {/* Conduta avançada */}
                  {advanced ? (
                    <div className="rounded-xl border border-purple/25 bg-purple/5 px-3 py-3 space-y-3">
                      <p className="text-xs font-semibold text-foreground">
                        Conduta avançada (aprofundamento)
                      </p>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-blue">
                          Metas clínicas
                        </p>
                        <ul className="space-y-1">
                          {advanced.metas.map((v, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {v}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-rose">
                          Doses e medidas-chave
                        </p>
                        <ul className="space-y-1">
                          {advanced.dosesChave.map((v, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {v}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-teal">
                          Quando escalar cuidado
                        </p>
                        <ul className="space-y-1">
                          {advanced.escalonamento.map((v, i) => (
                            <li key={i} className="text-xs text-muted leading-relaxed">
                              • {v}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {/* Referência */}
                  <div className="rounded-xl border border-border bg-background/35 px-3 py-2">
                    <p className="text-xs font-semibold text-foreground mb-1">Referências</p>
                    <p className="text-xs text-muted leading-relaxed italic">{item.referencia}</p>
                  </div>
                </div>
              )}
            </AppCard>
          );
        })}

        {filtered.length === 0 && (
          <AppCard>
            <p className="text-sm text-muted text-center py-4">
              Nenhuma complicação encontrada para o filtro selecionado.
            </p>
          </AppCard>
        )}
      </section>
    </main>
  );
}
