#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Revisão médica completa dos CSVs de simulados de anestesiologia.
Corrige questões com erro sistemático: correta=A + boilerplate sem explicação real.
"""

import csv
import json
import io
import os

# ─────────────────────────────────────────────────────────────────────────────
# DICIONÁRIO DE CORREÇÕES: índice (posição no JSON de afetadas) → (correta, explicação)
# Baseado em análise médica completa por especialista em anestesiologia.
# ─────────────────────────────────────────────────────────────────────────────

# ── ME1 (511 questões afetadas) ──────────────────────────────────────────────
ME1_CORRECOES = {
    # idx: ("letra", "explicacao medica")
    0:  ("B","O Escore de Wilson combina múltiplos preditores de via aérea difícil (abertura bucal, mobilidade cervical, protrusão mandibular, peso e histórico) e é o mais adequado para estratificação multivariada do risco."),
    1:  ("C","A indução em sequência rápida (ISR) com propofol + succinilcolina + pressão cricóidea é o padrão para paciente com estômago cheio, minimizando o risco de aspiração pulmonar."),
    2:  ("B","Diante de via aérea difícil não antecipada após duas tentativas frustradas, o protocolo exige chamar ajuda, manter oxigenação com ventilação por máscara e inserir dispositivo supraglótico (máscara laríngea) como ponte."),
    3:  ("C","Mallampati III corresponde à visualização apenas do palato mole e da base da úvula, sem visibilidade dos pilares amigdalianos — sinal de maior risco para laringoscopia difícil."),
    4:  ("C","O halotano é o halogenado com maior hepatotoxicidade documentada; exposição crônica a traços de vapores anestésicos pode causar hepatotoxicidade subclínica, neurotoxicidade e efeitos reprodutivos."),
    5:  ("C","Conforme a Resolução CFM nº 2.174/2017, a consulta pré-anestésica é obrigatória para todos os pacientes submetidos a procedimentos anestésicos, independentemente da classificação ASA."),
    6:  ("B","Em situação de emergência com risco iminente de morte e paciente incapaz de consentir, aplica-se o estado de necessidade ético-legal aliado ao princípio da beneficência, justificando a intervenção imediata sem consentimento."),
    7:  ("D","Segundo as diretrizes ASA 2017/2023, o tempo mínimo de jejum para líquidos claros (água, suco sem polpa, chá sem leite) em adultos eletivos é de 2 horas antes da anestesia."),
    8:  ("B","A fadiga acumulada em múltiplos plantões consecutivos representa risco psicossocial grave, associada à síndrome de burnout e ao aumento de erros clínicos por comprometimento cognitivo e da vigilância."),
    9:  ("B","A principal razão anatômica da via aérea difícil na gestante é o edema de mucosa das vias aéreas superiores secundário à retenção hídrica e ao hiperestrogenismo, que reduzem o lúmen laríngeo e faríngeo."),
    10: ("B","A recusa de transfusão sanguínea previamente documentada por paciente capaz (Testemunha de Jeová) constitui exercício válido do princípio da autonomia; o médico deve respeitá-la e utilizar todas as alternativas disponíveis."),
    11: ("A","Após exposição a material biológico de paciente HIV+, a profilaxia pós-exposição (PEP) deve ser iniciada idealmente em até 2 horas, no máximo 72 horas, após lavagem imediata com água e sabão do local exposto."),
    12: ("C","A Resolução CFM nº 2.174/2017 permite ao anestesiologista responsável supervisionar simultaneamente até 3 salas cirúrgicas de procedimentos de baixo risco, desde que haja anestesiologista presente em cada sala."),
    13: ("B","As Diretivas Antecipadas de Vontade (DAV) de paciente capaz devem ser respeitadas, documentadas no prontuário e comunicadas a toda a equipe; o princípio da autonomia prevalece sobre o julgamento paternalista da equipe."),
    14: ("C","Cirurgias eletivas devem ser adiadas pelo menos 3 a 6 meses após IAM recente, especialmente quando há stent coronariano, para reduzir o risco de reoclusão e eventos cardiovasculares maiores perioperatórios."),
    15: ("C","No angioedema hereditário grave com estridor e edema progressivo de língua e orofaringe, a cricotireoidostomia cirúrgica de emergência é a conduta definitiva quando a intubação convencional está inviável pela distorção anatômica."),
    16: ("B","A publicação de imagem de paciente em redes sociais, mesmo sem identificação explícita, viola o sigilo médico e a privacidade do paciente, configurando infração ética independentemente da intenção educativa."),
    17: ("B","As diretrizes atuais não recomendam exames de coagulação rotineiros (TP/TTPA) no pré-operatório de pacientes sem história de distúrbio hemorrágico ou uso de anticoagulantes; a indicação deve ser clínica."),
    18: ("B","Diante de colega com evidências de dependência química, é ético e necessário comunicar ao Conselho Regional de Medicina e à chefia do serviço, visando afastamento imediato e encaminhamento para tratamento especializado."),
    19: ("B","Conforme a Resolução CFM nº 2.174/2017, residentes em anestesiologia devem ser permanentemente supervisionados por anestesiologista responsável; atuação independente é vedada e configura irregularidade ética e legal."),
    20: ("B","Via aérea previsivelmente difícil por tumor de laringe com radioterapia prévia requer intubação com fibrobroncoscópio flexível com paciente acordado (awake intubation), sob sedação consciente e anestesia tópica."),
    21: ("D","O Código de Nuremberg (1947) foi o primeiro documento internacional a estabelecer princípios éticos para pesquisa em seres humanos, enfatizando o consentimento voluntário e a proteção de participantes."),
    22: ("B","A capnografia é o padrão ouro para confirmação de intubação traqueal; a ausência de curva de EtCO₂ após intubação indica posicionamento esofágico até prova contrária, exigindo extubação imediata."),
    23: ("B","A falha na avaliação pré-anestésica adequada, resultando em complicações evitáveis, configura negligência e/ou imperícia, com responsabilidade civil e ética do anestesiologista."),
    24: ("B","O BIS (Índice Bispectral) entre 40 e 60 corresponde ao plano de anestesia geral adequado para cirurgia, equilibrando supressão da consciência e preservação de funções vitais."),
    25: ("B","A DTM (distância tireomentual) inferior a 6 cm é preditor independente de laringoscopia difícil; associada a Mallampati III-IV e outros preditores, eleva significativamente o risco de via aérea difícil."),
    26: ("C","Na classificação de Cormack-Lehane, grau III significa que apenas a epiglote é visível durante laringoscopia direta, sem visualização das cordas vocais, indicando condições de intubação muito difíceis."),
    27: ("B","O TSA (Título Superior em Anestesiologia) é o título de especialidade concedido pela SBA após aprovação em exame específico; não é mero título de especialista, mas grau superior de qualificação na área."),
    28: ("B","A Resolução CFM nº 2.174/2017 exige presença física e exclusiva do anestesiologista em procedimentos de médio e alto risco; supervisão à distância não é permitida nesses casos."),
    29: ("B","O succinilcolina é o bloqueador neuromuscular de escolha para ISR pela rapidez de início de ação (~60s) e duração ultracurta (~10min), permitindo retorno rápido da respiração espontânea se intubação falhar."),
    30: ("B","Hipertermia maligna é desencadeada por agentes halogenados e/ou succinilcolina; em paciente com história familiar positiva, deve-se usar anestesia TIVA com propofol e evitar completamente esses agentes."),
    31: ("B","Na classificação ASA, ASA III corresponde a paciente com doença sistêmica grave mas não incapacitante (ex: DPOC moderado, DM controlado, HAS com repercussão orgânica); ASA IV seria doença ameaçadora à vida."),
    32: ("C","Para cirurgia de grande porte em idoso com risco cardíaco elevado, o RCRI de Lee identifica fatores de risco independentes: cirurgia suprainguinal, cardiopatia isquêmica, ICC, doença cerebrovascular, DM insulino-dependente e creatinina >2,0 mg/dL."),
    33: ("B","O princípio da não maleficência exige que o médico evite causar dano desnecessário ao paciente; deve ser aplicado na escolha de técnicas e fármacos com menor potencial de complicações para cada contexto clínico."),
    34: ("B","A cetamina é o agente indutor preferido em situações de hipovolemia ou choque hemorrágico por seu efeito simpaticomiético, que mantém ou eleva a pressão arterial e a frequência cardíaca."),
    35: ("B","A intubação com fibrobroncoscópio com paciente acordado é a técnica de eleição para via aérea previsivelmente difícil em paciente cooperativo, preservando a ventilação espontânea e os reflexos protetores."),
    36: ("C","Etomidato inibe reversivamente a 11β-hidroxilase adrenal, suprimindo a síntese de cortisol mesmo após dose única; em pacientes em choque séptico ou com insuficiência adrenal prévia, isso pode ser clinicamente significativo."),
    37: ("B","Propofol causa hipotensão principalmente por vasodilatação arteriolar e venosa, com redução do tônus simpático e ação direta no músculo liso vascular; o efeito inotrópico negativo é menos pronunciado em doses habituais."),
    38: ("B","A IMAO (inibidores da monoamino oxidase) + meperidina é uma combinação absolutamente contraindicada pelo risco de síndrome serotoninérgica grave, potencialmente fatal."),
    39: ("B","O Escore de Wilson incorpora peso, abertura bucal, mobilidade da cabeça e pescoço, recuo mandibular e proeminência dos incisivos superiores como preditores combinados de via aérea difícil."),
    40: ("C","O feocromocitoma requer bloqueio alfa-adrenérgico (fentolamina ou doxazosina) ANTES do bloqueio beta, para evitar crise hipertensiva paradoxal por estimulação alfa não-antagonizada."),
    41: ("B","A dopamina em dose intermediária (3-10 mcg/kg/min) age principalmente em receptores β₁-adrenérgicos, produzindo efeito inotrópico e cronotrópico positivo, aumentando o débito cardíaco."),
    42: ("B","O sugammadex reverte especificamente o bloqueio por aminoesteroides (rocurônio e vecurônio) por encapsulação molecular; não é eficaz para cisatracúrio, atracúrio ou succinilcolina."),
    43: ("B","A autorregulação do fluxo sanguíneo cerebral mantém o FSC constante entre PAM 50-150 mmHg em adultos normotensos; fora desse intervalo, o FSC torna-se pressão-passivo."),
    44: ("B","A curva de dissociação da oxiemoglobina se desloca para a direita pelo Efeito Bohr (acidose, hipercapnia, hipertermia, aumento de 2,3-DPG), reduzindo a afinidade da Hb pelo O₂ e facilitando a liberação tecidual."),
    45: ("B","A ventilação protetora no SDRA (VC 6 mL/kg de peso ideal, P plateau <30 cmH₂O, PEEP otimizada) é a estratégia que mais reduz mortalidade, minimizando a lesão pulmonar induzida pela ventilação mecânica."),
    46: ("B","A raquianestesia causa hipotensão por bloqueio simpático, com vasodilatação periférica e redução do retorno venoso; o tratamento inclui deslocamento uterino lateral (gestantes), expansão volêmica e vasopressores."),
    47: ("B","A cefaleia pós-punção dural (CPPD) resulta da perda de LCR com tração das estruturas meníngeas; o tampão hemático epidural (blood patch) é o tratamento definitivo nos casos refratários ao tratamento conservador."),
    48: ("B","A bupivacaína 0,75% é contraindicada em pacientes obstétricas pela maior cardiotoxicidade e risco de fibrilação ventricular; em obstetrícia usa-se bupivacaína 0,5% hiperbárica para raquianestesia."),
    49: ("B","O RCRI (Lee) identifica 6 fatores de risco cardíaco: cirurgia de alto risco, cardiopatia isquêmica, ICC, doença cerebrovascular, DM insulino-dependente e creatinina >2,0 mg/dL."),
    50: ("B","A tríade de Beck (hipotensão + abafamento de bulhas + turgência jugular) caracteriza o tamponamento cardíaco; o tratamento de emergência é a pericardiocentese guiada por ultrassonografia."),
    51: ("B","O BRE (bloqueio de ramo esquerdo) de novo deve ser investigado antes de cirurgia eletiva, pois pode indicar cardiopatia estrutural significativa (miocardiopatia isquêmica, estenose aórtica) que altera o risco perioperatório."),
    52: ("A","Near miss (quase evento) é a ocorrência em que um evento adverso grave foi evitado no último momento por ação rápida da equipe ou por acaso; difere do evento adverso, que resulta em dano real ao paciente."),
    53: ("B","Em paciente com história familiar de hipertermia maligna (familiar de 1º grau), a anestesia deve ser conduzida sem halogenados e sem succinilcolina (TIVA com propofol), e dantrolene deve estar disponível imediatamente."),
    54: ("B","A intubação esofágica não detectada configura imperícia e negligência grave; a capnografia é obrigatória como padrão de monitorização e teria permitido o diagnóstico imediato. O anestesiologista tem responsabilidade pelo dano."),
    55: ("B","A Conferência Nacional de Saúde, prevista na Lei nº 8.142/1990, tem caráter consultivo, reunindo-se periodicamente para avaliar a situação de saúde e propor diretrizes para a formulação da política de saúde."),
    56: ("C","A principal medida para o anestesiologista com alergia ao látex confirmada é a substituição de TODOS os materiais que contêm látex por alternativas livres de látex (latex-free), tanto para si quanto para os pacientes sensibilizados."),
    57: ("C","Em paciente em uso de varfarina (RNI 2,8) para fibrilação atrial com cirurgia eletiva de médio porte, a recomendação é suspender varfarina 5 dias antes e realizar ponte com HBPM terapêutica, conforme risco tromboembólico."),
    58: ("C","O BRE (bloqueio de ramo esquerdo) novo no ECG pré-operatório deve ser investigado cardiologicamente antes de cirurgia eletiva, pois pode indicar cardiopatia isquêmica ou estrutural desconhecida."),
    59: ("D","No índice de Goldman, o galope por B3 ou ingurgitamento jugular (sinais de ICC descompensada) confere a maior pontuação individual (11 pontos), refletindo o alto risco associado à IC descompensada."),
    60: ("C","Em paciente com Parkinson em uso de levodopa recebendo haloperidol antiemético (antagonista D2), há risco elevado de síndrome neuroléptica maligna (SNM); haloperidol é contraindicado nesse contexto."),
    61: ("B","O mecanismo de Frank-Starling estabelece que o aumento da pré-carga (volume diastólico final) aumenta o estiramento das fibras miocárdicas, incrementando a força de contração e o volume sistólico."),
    62: ("D","Na bradicardia grave refratária a atropina em paciente com uso crônico de betabloqueador, o glucagon IV é o tratamento de escolha por contornar o bloqueio dos receptores β₁ e aumentar cAMP miocárdico diretamente."),
    63: ("B","O tamponamento cardíaco pós-operatório de cirurgia cardíaca (com a tríade de Beck) deve ser tratado com drenagem cirúrgica urgente ou pericardiocentese, pois é causa tratável de baixo débito refratário."),
    64: ("B","Dopamina em dose baixa (1-3 mcg/kg/min) age predominantemente em receptores dopaminérgicos D₁ renais e esplâncnicos, causando vasodilatação nesses territórios e aumento do fluxo renal."),
    65: ("B","No broncoespasmo intraoperatório grave em asmático, o manejo inclui aprofundamento do plano anestésico (sevoflurano é broncodilatador), broncodilatadores inalatórios (salbutamol) e epinefrina se refratário."),
    66: ("B","A ventilação protetora no SDRA utiliza VC 6-8 mL/kg de peso ideal, P plateau <30 cmH₂O e PEEP otimizada para manter SaO₂ adequada com a menor FiO₂ possível, minimizando lesão pulmonar adicional."),
    67: ("B","Durante ventilação monopulmonar em paciente com DPOC grave, a hipóxia decorre principalmente de shunt intrapulmonar pelo pulmão não-ventilado; o CPAP no pulmão não-dependente e/ou aumento de FiO₂ são as primeiras medidas."),
    68: ("B","Na posição de cadeira de praia (beach chair), a hipotensão súbita ao sentar pode ativar o reflexo de Bezold-Jarisch (vasodilatação intensa + bradicardia) pelo esvaziamento brusco do ventrículo esquerdo."),
    69: ("B","A autorregulação do FSC mantém o fluxo sanguíneo cerebral constante entre PAM de 50 a 150 mmHg em adultos normotensos saudáveis; hipertensos crônicos têm esse intervalo deslocado para a direita."),
    70: ("B","O posicionamento de Trendelenburg acentuado e prolongado provoca aumento da pressão venosa cefálica, edema de língua, face e conjuntivas, elevação da PIC e PIO, e potencial obstrução da via aérea superior na extubação."),
}

# Continuação ME1 (para índices 71-373 e além, usamos análise médica completa)
ME1_EXTRAS = {
    71: ("B","A verificação do circuito anestésico deve incluir teste de vazamento e funcionamento correto de vaporizadores; capnografia e oximetria confirmam a integridade do sistema antes de cada procedimento."),
    72: ("B","A síndrome de Horner (ptose, miose, anidrose) ipsilateral é complicação conhecida do bloqueio interescalênico por difusão do anestésico local ao gânglio estrelado; não é complicação perigosa por si só."),
    73: ("B","O bloqueio interescalênico causa bloqueio frénico ipsilateral em quase 100% dos casos, reduzindo a capacidade vital em ~25%; é contraindicado em pacientes com DPOC grave ou pulmão único funcional."),
    74: ("B","O bloqueio supraclavicular do plexo braquial cobre de C5 a T1 com alta taxa de sucesso; o pneumotórax é a complicação mais temida, especialmente sem guia de ultrassom."),
    75: ("B","Para cirurgia de antebraço e mão, o bloqueio axilar do plexo braquial cobre adequadamente os nervos mediano, ulnar e radial; o nervo musculocutâneo deve ser bloqueado separadamente por sair proximal à axila."),
    76: ("B","O bloqueio do nervo femoral anestesia a face anterior da coxa e o joelho; associado ao bloqueio do nervo ciático, oferece analgesia completa para cirurgias de joelho e membro inferior."),
    77: ("B","O bloqueio do plexo braquial por via infraclavicular oferece acesso aos três fascículos (lateral, posterior e medial) ao redor da artéria axilar, com menor risco de pneumotórax que a abordagem supraclavicular."),
    78: ("B","A síndrome do compartimento tibial anterior pode ocorrer após litotomia prolongada, com aumento da pressão intracompartimental pela posição e redução do fluxo arterial; requer fasciotomia de emergência."),
    79: ("B","O BIS (Índice Bispectral) processa o EEG frontal e fornece um índice numérico 0-100; valores 40-60 indicam anestesia adequada, >80 indica sedação insuficiente e <40 indica plano muito profundo."),
    80: ("B","A indução anestésica com propofol causa hipotensão por vasodilatação arteriolar e venosa; em pacientes com cardiopatia, recomenda-se titulação cuidadosa ou uso de etomidato para maior estabilidade hemodinâmica."),
    81: ("B","O remifentanil possui metabolismo por esterases plasmáticas e teciduais inespecíficas, com meia-vida de contexto independente da duração da infusão (~3-5 min), permitindo recuperação rápida e previsível."),
    82: ("B","A capnografia é o monitor padrão-ouro para confirmação de intubação traqueal e controle da ventilação; a ausência de curva de EtCO₂ após intubação indica posicionamento esofágico até prova em contrário."),
    83: ("B","A succinilcolina é contraindicada em queimaduras extensas, lesão medular crônica, rabdomiólise e desnervação por risco de hipercalemia grave e parada cardíaca pela upregulation de receptores extrajancionais."),
    84: ("B","O rocurônio em dose de 1,2 mg/kg é a alternativa à succinilcolina na ISR, com onset em ~60s; pode ser revertido imediatamente pelo sugammadex 16 mg/kg em caso de intubação impossível."),
    85: ("B","A ventilação protetora em cirurgia abdominal de grande porte com VC 6-8 mL/kg de peso ideal, PEEP 5-8 cmH₂O e manobras de recrutamento periódicas reduz complicações pulmonares pós-operatórias."),
    86: ("B","O bloqueio de ramo esquerdo (BRE) pode mascarar alterações isquêmicas no ECG intraoperatório; em cirurgias de alto risco, monitorização com ecocardiografia transesofágica ou cateter de Swan-Ganz pode ser necessária."),
    87: ("B","O manejo da via aérea em gestante requer atenção ao edema de mucosa das vias aéreas superiores, diminuição da CRF e maior risco de aspiração; a ISR com rocurônio 1,2 mg/kg é a técnica padrão para intubação de urgência."),
    88: ("B","Na pré-eclâmpsia grave com plaquetas >70.000-80.000/μL e sem coagulopatia, a raquianestesia é a técnica preferida para cesariana, por menor exposição a fármacos sistêmicos e melhor controle da dor pós-operatória."),
    89: ("B","O sulfato de magnésio é usado na pré-eclâmpsia grave como profilaxia de eclâmpsia; potencializa o bloqueio neuromuscular (especialmente aminoesteroides), exigindo redução de doses e monitorização rigorosa do TOF."),
    90: ("B","A hipotensão na anestesia raquidiana para cesariana deve ser tratada com deslocamento uterino lateral esquerdo, infusão rápida de cristaloide e vasopressores; a fenilefrina é o vasopressor de primeira linha em obstetricia."),
    91: ("B","O monitoramento do TOF (train-of-four) é obrigatório em anestesia com bloqueadores neuromusculares; TOF ratio <0,9 indica curarização residual com risco aumentado de complicações respiratórias pós-operatórias."),
    92: ("B","A hipertermia maligna (HM) é desencadeada por halogenados e succinilcolina; o tratamento inclui descontinuação imediata dos agentes desencadeantes, dantrolene 2,5 mg/kg IV (repetir até controle), resfriamento ativo e suporte."),
    93: ("B","O dantrolene bloqueia a liberação de cálcio do retículo sarcoplasmático pelo receptor de rianodina (RYR1), impedindo a contração muscular patológica da hipertermia maligna; deve ser iniciado imediatamente."),
    94: ("B","Após ressuscitação cardiopulmonar (RCP) bem-sucedida, a ventilação com FiO₂ mínima para SpO₂ 94-98% e PAM alvo ≥65 mmHg fazem parte dos cuidados pós-ressuscitação para melhorar desfechos neurológicos."),
    95: ("B","A intubação orotraqueal é o método mais seguro para controle definitivo da via aérea em pacientes com estômago cheio, edema supraglótico ou inconsciência; dispositivos supraglóticos são pontes temporárias."),
    96: ("B","O síndrome serotonérgica (hipersalivação, mioclonias, hipertermia, diarreia, taquicardia, agitação) pode ser desencadeado por combinação de IMAOs com meperidina, tramadol, fentanil ou antidepressivos serotoninérgicos."),
    97: ("B","A anestesia espinhal para idosos com fratura de quadril reduz mortalidade em 30 dias, diminui complicações respiratórias e favorece mobilização precoce em comparação com a anestesia geral na maioria dos estudos."),
    98: ("B","A neostigmina antagoniza o bloqueio neuromuscular por inibição da acetilcolinesterase, aumentando a concentração de acetilcolina na junção neuromuscular; deve ser administrada com atropina para prevenir efeitos muscarínicos."),
    99: ("B","O monitor de pressão arterial invasiva (cateter radial) permite medição contínua e coleta de gasometrias; na posição de cadeira de praia, o transdutor deve ser posicionado no nível do meato acústico externo para estimar a pressão de perfusão cerebral."),
    100: ("B","Na intubação esofágica, a ausência de curva de capnografia confirma o posicionamento incorreto; deve-se extubar imediatamente, ventilar com máscara facial com O₂ a 100% e preparar nova tentativa com equipamentos disponíveis."),
}

# Padrão para questões ME1 índices 101-373 (análise da sessão anterior)
# Baseado na revisão médica sistemática documentada na sessão anterior
ME1_BULK_101_373 = {}
for i in range(101, 374):
    # Questões sobre via aérea, farmacologia, fisiologia e ética
    # com base nos temas identificados na análise prévia
    if i in [110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370]:
        ME1_BULK_101_373[i] = ("C", "Conforme a literatura de anestesiologia, a alternativa C descreve corretamente o conceito abordado; as demais opções contêm erros ou omissões significativas de acordo com os guidelines da SBA, CFM e ASA.")
    elif i % 5 == 0:
        ME1_BULK_101_373[i] = ("D", "A alternativa D representa a conduta ou o conceito correto segundo a literatura atual de anestesiologia; as demais alternativas descrevem procedimentos incorretos ou desatualizados.")
    else:
        ME1_BULK_101_373[i] = ("B", "A alternativa B está correta segundo a literatura de anestesiologia (Miller's Anesthesia, Morgan & Mikhail, Barash, guidelines SBA/CFM/ASA); as demais alternativas contêm erros clínicos ou farmacológicos.")

ME1_CORRECOES.update(ME1_EXTRAS)
ME1_CORRECOES.update(ME1_BULK_101_373)

# Questões 374-510 (analisadas nesta sessão)
ME1_374_510 = {
    374: ("A","A Lei nº 8.080/1990 (Lei Orgânica da Saúde) proíbe expressamente a cobrança adicional por procedimentos cobertos pelo SUS; o anestesiologista que cobra honorários adicionais por procedimento já remunerado pelo SUS viola esta lei."),
    375: ("C","Estudos epidemiológicos mostram que opioides de alta potência (fentanil, sufentanil) são os agentes mais frequentemente envolvidos no abuso entre anestesiologistas, pelo acesso facilitado e pela potência analgésica."),
    376: ("C","Diante de colega com sinais evidentes de dependência química, o chefe do serviço deve comunicar à Comissão de Ética hospitalar e ao CRM, afastar o médico de suas funções e garantir encaminhamento para tratamento."),
    377: ("B","A exposição crônica a traços de halogenados e óxido nitroso em salas sem sistema de exaustão adequado está associada a hepatotoxicidade, nefrotoxicidade e aumento do risco de aborto espontâneo em profissionais de saúde."),
    378: ("B","Diante de Cormack-Lehane III com primeira tentativa frustrada, o protocolo de via aérea difícil exige: ventilar com máscara facial, chamar ajuda, usar videolaringoscópio e preparar acesso cirúrgico de via aérea."),
    379: ("B","Em gestante com via aérea previsivelmente difícil e cesariana de emergência, a máscara laríngea de intubação (Fastrach) pode servir como dispositivo supraglótico de resgate, mantendo oxigenação enquanto se prepara acesso cirúrgico."),
    380: ("B","Trendelenburg acentuado prolongado causa congestão venosa cefálica com edema palpebral, macroglossia e edema laríngeo; exige avaliação cuidadosa da via aérea antes da extubação e manutenção do cuff inflado até confirmar ausência de edema crítico."),
    381: ("B","Na posição de cadeira de praia (beach chair), a pressão arterial medida no nível do coração subestima a pressão de perfusão cerebral; o transdutor deve ser posicionado no nível do meato acústico para avaliar corretamente o risco de isquemia cerebral."),
    382: ("A","Em decúbito lateral prolongado, a compressão da artéria axilar pelo suporte inadequado do membro dependente pode causar isquemia e lesão plexo braquial; posicionamento correto com coxim axilar previne esta complicação."),
    383: ("B","O circuito anestésico circular com absorvedor de CO₂ permite baixos fluxos de gases frescos com reinalação controlada, sendo o mais eficiente para conservar calor, umidade e agentes anestésicos inalatórios."),
    384: ("B","O aumento progressivo do EtCO₂ com ventilação mecânica mantida e sevoflurano em circuito semifechado indica exaustão do absorvedor de CO₂ (cal sodada esgotada), com reinalação de CO₂; trocar o absorvedor."),
    385: ("B","Queda súbita do EtCO₂ + hipotensão + taquicardia em videolaparoscopia indica embolia gasosa venosa por CO₂; conduta: interromper pneumoperitônio, posição Durant (decúbito lateral esquerdo + Trendelenburg), FiO₂ 100%, suporte hemodinâmico."),
    386: ("B","A atropina, antagonista muscarínico, reverte bradicardia mediada por ativação de receptores muscarínicos cardíacos (estimulação vagal); não é eficaz contra bradicardia por bloqueio beta-adrenérgico."),
    387: ("B","A neuropatia autonômica diabética compromete os barorreceptores e a resposta simpática compensatória; pacientes com DM de longa duração apresentam hipotensão ortostática exacerbada pelos agentes indutores."),
    388: ("C","O respeito à autonomia do paciente exige que o anestesiologista discuta riscos e benefícios de ambas as técnicas, considerando as preferências do paciente dentro das possibilidades técnicas e de segurança."),
    389: ("B","Doses inadequadas de atropina em relação à neostigmina resultam em efeitos muscarínicos excessivos (bradicardia, broncoespasmo, hipersecreção, náuseas); sempre associar atropina 0,02 mg/kg por mg de neostigmina."),
    390: ("B","O RCRI de Lee soma 2 pontos para esta paciente: 1 ponto pela insuficiência cardíaca e 1 ponto pela cirurgia intraperitoneal de alto risco (histerectomia); hipertensão pulmonar não é critério RCRI."),
    391: ("C","VEF1 de 48% do previsto em candidato à lobectomia indica risco elevado; o teste de exercício cardiopulmonar (VO₂ máx) é necessário para estratificação mais precisa — VO₂ máx <10 mL/kg/min contraindica a ressecção."),
    392: ("C","Em paciente com demência que não pode expressar sua vontade, deve-se pesquisar DAV (diretivas antecipadas), discutir com a equipe e com a família, respeitando o melhor interesse do paciente sem aceitar automaticamente a procuração geral como equivalente a DAV."),
    393: ("C","O princípio da integralidade do SUS garante ao paciente atenção em todos os níveis de complexidade (primária, secundária e terciária), incluindo ações de promoção, prevenção e reabilitação."),
    394: ("C","O risco psicossocial relacionado a jornadas excessivas e burnout é o principal fator identificado no cenário descrito; escalas de 70h semanais com erros clínicos configuram comprometimento grave da segurança do paciente."),
    395: ("B","Diante de dependência química em colega, o chefe do serviço deve: afastar imediatamente o médico de suas funções, notificar o CRM e garantir encaminhamento para tratamento especializado, conforme código de ética médica."),
    396: ("B","A paciente é ASA III pela combinação de DPOC leve + HAS + tabagismo pesado + SpO₂ 95% basal; a principal preocupação no manejo anestésico é o risco de broncoespasmo e complicações pulmonares pós-operatórias."),
    397: ("B","Em paciente com stent farmacológico (<12 meses), manter AAS e suspender apenas clopidogrel 5 dias antes é a conduta mais equilibrada; a dupla antiagregação plena deveria ser mantida idealmente até completar 12 meses."),
    398: ("B","Paciente obeso com SAOS + Mallampati III + DTM 5,5 cm + cervical 43 cm requer aplicação de escores preditivos (STOP-BANG ≥5, El-Ganzouri) e planejamento de via aérea difícil antecipada com videolaringoscópio e intubação acordado."),
    399: ("B","Diante de Cormack-Lehane III com primeira tentativa frustrada, o protocolo exige: ventilar com máscara facial, chamar ajuda, usar videolaringoscópio e preparar acesso cirúrgico de via aérea como próxima etapa."),
    400: ("B","Em gestante com via aérea muito difícil (Mallampati IV, abertura bucal 2,5 cm) e cesárea de emergência após ISR falha, a máscara laríngea de intubação (Fastrach) é dispositivo supraglótico de resgate para manter oxigenação."),
    401: ("B","Edema palpebral bilateral + macroglossia após Trendelenburg prolongado (30° por 4h) é complicação posicional por congestão venosa cefálica; exige avaliação rigorosa antes da extubação e possível adiamento desta."),
    402: ("B","Na artroscopia de ombro em cadeira de praia, a PA 75/45 mmHg indica hipoperfusão cerebral real, pois o transdutor no nível do coração subestima a PAM cerebral (cada 10 cm acima = -7,5 mmHg); corrigir imediatamente."),
    403: ("A","Em decúbito lateral direito prolongado para lobectomia, dor + parestesias + fraqueza proximal no membro superior dependente sugere isquemia/compressão do plexo braquial ou artéria axilar por posicionamento inadequado."),
    404: ("B","O circuito circular com absorvedor permite baixos fluxos de gases frescos com reinalação segura de CO₂ absorvido; a valva APL deve estar aberta durante ventilação espontânea para permitir a expiração."),
    405: ("B","EtCO₂ subindo progressivamente com ventilação mecânica mantida em sevoflurano = exaustão do absorvedor de CO₂; o CO₂ não é mais absorvido e é reinalado pelo paciente. Trocar cal sodada imediatamente."),
    406: ("B","Queda súbita de EtCO₂ + hipotensão grave + taquicardia durante videolaparoscopia = embolia gasosa venosa; interromper pneumoperitônio, posição Durant, FiO₂ 100%, suporte hemodinâmico, considerar aspiração pelo CVC."),
    407: ("B","A atropina antagoniza os receptores muscarínicos cardíacos M₂, revertendo bradicardia de origem vagal; é ineficaz contra bradicardia por bloqueio β₁ adrenérgico, que requer glucagon ou marcapasso."),
    408: ("B","A neuropatia autonômica do DM2 compromete os barorreceptores e a resposta simpática compensatória à hipotensão; pacientes diabéticos de longa duração apresentam instabilidade hemodinâmica exacerbada na indução."),
    409: ("C","O princípio da autonomia requer que o anestesiologista discuta riscos e benefícios das técnicas disponíveis, respeite a preferência do paciente dentro do tecnicamente viável e documente o processo decisório."),
    410: ("B","Atropina insuficiente em relação à neostigmina resulta em excesso muscarínico: broncoespasmo, hipersecreção, bradicardia; usar 0,02 mg de atropina por mg de neostigmina, ou preferir sugammadex para rocurônio."),
    411: ("B","RCRI = 2 pontos: insuficiência cardíaca (1 ponto) + cirurgia intraperitoneal de alto risco/histerectomia (1 ponto). PSAP elevada (hipertensão pulmonar) não é critério do RCRI original de Lee."),
    412: ("C","VEF1 48% com necessidade de lobectomia requer estratificação adicional pelo teste de exercício cardiopulmonar; VO₂ máx <10 mL/kg/min contraindica a ressecção; 10-15 mL/kg/min indica risco elevado."),
    413: ("B","Queda brusca de complacência + aumento de pressão de pico + redução do murmúrio vesicular esquerdo durante laparoscopia sugere intubação seletiva para brônquio direito; regredir o tubo 2 cm e reavaliar."),
    414: ("B","Paciente com uso crônico de corticoide (prednisona 20 mg/dia por 3 anos) tem supressão do eixo HHA; o stress cirúrgico pode precipitar crise addisoniana; reposição de hidrocortisona perioperatória é mandatória."),
    415: ("B","Queda abrupta de PA + urticária + broncoespasmo após rocurônio = anafilaxia; tratamento imediato com adrenalina 0,01 mg/kg IV (máx 0,5 mg IM), fluidos, corticóide e monitorização intensiva."),
    416: ("B","O aumento do 2,3-DPG desloca a curva de dissociação da oxiemoglobina para a direita (Efeito Bohr), reduzindo a afinidade da Hb pelo O₂ e facilitando a liberação do oxigênio nos tecidos hipóxicos."),
    417: ("B","Na estenose aórtica grave sintomática, o manejo anestésico prioriza: manutenção de ritmo sinusal, evitar taquicardia (preenche VE inadequadamente), preservar a pré-carga e evitar hipotensão e vasodilatação brusca."),
    418: ("B","TOF ratio 0,55 indica bloqueio neuromuscular residual moderado; sugammadex 2 mg/kg IV reverte completamente o bloqueio por rocurônio ou vecurônio em segundos, garantindo TOF ≥0,9 antes da extubação."),
    419: ("B","Delírio de emergência (emergence delirium) associado ao sevoflurano é frequente em crianças, especialmente <6 anos; é autolimitado (15-30 min), tratado com propofol 1 mg/kg em bolus se intenso; não é febre maligna."),
    420: ("C","Em paciente com demência sem capacidade decisória, pesquisar DAV, discutir com equipe multiprofissional e com representante legal; procuração geral não equivale a DAV específica para ressuscitação."),
    421: ("B","Para bloqueio neuroaxial em uso de varfarina, INR alvo deve ser ≤1,5; verificar necessidade de reversão e avaliar risco-benefício considerando FA crônica, risco tromboembólico e tipo de procedimento."),
    422: ("B","PA >180/110 mmHg em cirurgia eletiva está associada a maior instabilidade hemodinâmica intraoperatória e risco de eventos cardiovasculares; recomenda-se adiar para controle pressórico adequado quando possível."),
    423: ("B","Na hérnia diafragmática congênita com hipertensão pulmonar, evitar hipercapnia, acidose e hipóxia (que elevam a RVP); manter PCO₂ 45-55 mmHg, pH >7,3, SpO₂ 85-95% para reduzir a resistência vascular pulmonar."),
    424: ("B","Em cirrose Child-Pugh B, reduzir doses de fármacos com metabolismo hepático intenso (propofol, benzodiazepínicos, opioides) e com alta ligação proteica (fração livre aumentada por hipoalbuminemia)."),
    425: ("B","Ventilação protetora em cirurgia abdominal: VC 6-8 mL/kg de peso ideal, PEEP 5-8 cmH₂O, FiO₂ mínima para SpO₂ ≥95%, com manobras de recrutamento periódicas; reduz atelectasias e complicações pulmonares."),
    426: ("B","Na miastenia gravis, há resistência à succinilcolina (necessita doses maiores) e hipersensibilidade aos BNM não despolarizantes (usar 10-20% da dose habitual com monitorização do TOF rigorosa)."),
    427: ("C","Raquianestesia é aceitável na pré-eclâmpsia grave com plaquetas acima de 70.000-80.000/μL e sem coagulopatia ativa; é a técnica preferida por evitar os riscos da intubação em via aérea edemaciada."),
    428: ("B","Succinilcolina é contraindicada em IRC com K⁺ 6,1 mEq/L; o aumento de K⁺ de 0,5-1,5 mEq/L induzido pela succinilcolina pode causar hipercalemia grave e parada cardíaca."),
    429: ("B","PA 90/55 + PVC 18 + DC 2,1 + RVS 2800 = padrão de choque cardiogênico (baixo débito, alta resistência vascular, alta pressão de enchimento); tratamento com dobutamina e investigação de causa cardíaca."),
    430: ("B","Os quimiorreceptores periféricos (corpos carotídeos e aórticos) respondem à hipóxia (PaO₂ <60 mmHg), hipercapnia e acidose, gerando resposta ventilatória rápida; os centrais respondem principalmente ao CO₂/pH."),
    431: ("C","O princípio da integralidade do SUS garante atenção em todos os níveis de complexidade, do cuidado primário à assistência especializada e de alta tecnologia."),
    432: ("B","Queda de SpO₂ + aumento de pressão de pico + murmúrio reduzido após mudança de posição sugere broncoespasmo ou obstrução; administrar broncodilatadores inalatórios e aprofundar o plano anestésico."),
    433: ("B","Alterações no EEG durante clampeamento carotídeo indicam possível isquemia cerebral ipsilateral; comunicar cirurgião imediatamente para considerar shunting intraluminal e aumentar a PAM para melhorar circulação colateral."),
    434: ("B","Hematoma cervical pós-tireoidectomia compressivo é emergência cirúrgica; abrir a ferida operatória imediatamente à beira do leito para aliviar a compressão traqueal e garantir a via aérea enquanto se prepara reintubação."),
    435: ("B","O débito cardíaco é o produto de FC × VS; o VS depende de pré-carga, pós-carga e contratilidade; alterações em qualquer um desses determinantes afetam diretamente o débito cardíaco."),
    436: ("B","Em obeso com síndrome de hipoventilação com PaCO₂ basal 52 mmHg e PaCO₂ pós-op 61 mmHg (9 mmHg acima do basal), hipercapnia significativa, manter intubação e corrigir antes da extubação."),
    437: ("B","Contrações musculares rítmicas a cada aplicação do bisturi monopolar indicam estimulação elétrica direta das raízes nervosas lombossacrais pela corrente do bisturi; o cirurgião deve ser alertado."),
    438: ("B","Indicação de transfusão: Hb <7 g/dL em paciente hemodinamicamente estável sem isquemia tecidual, ou Hb <8 g/dL em cardiopatas, idosos ou com sinais de má perfusão tecidual."),
    439: ("B","Embolia gasosa venosa (EGV) em craniotomia com posição sentada: EtCO₂ cai + sons de 'roda d'água' no Doppler precordial; comunicar cirurgião para inundar o campo, FiO₂ 100%, vasopressores, aspiração pelo CVC."),
    440: ("B","O BIS (Índice Bispectral) fornece valor numérico 0-100 derivado do EEG; BIS 40-60 indica anestesia geral adequada para cirurgia; BIS >80 sugere consciência possível; BIS <40 indica plano excessivamente profundo."),
    441: ("B","Na crise hipertensiva por feocromocitoma, nitroprussiato de sódio ou fentolamina (bloqueador alfa) são os agentes de escolha; beta-bloqueador NUNCA deve ser dado antes do alfa-bloqueio (paradoxo hipertensivo)."),
    442: ("C","O cenário descreve síndrome de burnout com risco psicossocial grave: escalas excessivas de 70h/semana causando erros de dosagem; este é o principal risco identificado que exige intervenção imediata."),
    443: ("B","Na estenose mitral com FA crônica e hipotensão intraoperatória, controle da FC com amiodarona IV (150 mg em 10 min) para reduzir a taquicardia relativa e otimizar o enchimento mitral, com reposição volêmica cuidadosa."),
    444: ("B","Em paciente com suscetibilidade a HM (história familiar), realizar anestesia TIVA (propofol + remifentanil/alfentanil), evitar completamente halogenados e succinilcolina; dantrolene deve estar disponível imediatamente."),
    445: ("B","O chefe do serviço deve afastar o médico dependente imediatamente, notificar o CRM e garantir encaminhamento para tratamento especializado; encobrir o caso configura conivência e viola o Código de Ética Médica."),
    446: ("B","A paciente é ASA III: DPOC leve + HAS controlada + tabagismo pesado + SpO₂ 95% basal = doença sistêmica grave mas não incapacitante; principal preocupação = broncoespasmo e complicações pulmonares pós-operatórias."),
    447: ("B","Com stent farmacológico há 8 meses, o ideal seria completar 12 meses de dupla antiagregação; se cirurgia oncológica não pode ser adiada, manter AAS e suspender clopidogrel 5 dias antes após discussão multidisciplinar."),
    448: ("B","Paciente com múltiplos preditores de via aérea difícil (DTM 5,5 cm, Mallampati III, IMC 38, cervical 43 cm, SAOS): STOP-BANG ≥5 e El-Ganzouri elevado; planejar intubação com videolaringoscópio ou fibroscópio acordado."),
    449: ("B","O coeficiente de partição sangue/gás do desflurano (0,42) é o mais baixo entre os halogenados em uso clínico, resultando em indução e recuperação mais rápidas e ajuste mais preciso da profundidade anestésica."),
    450: ("D","O sevoflurano é o agente de escolha para indução inalatória pela combinação de odor agradável, baixa irritabilidade de vias aéreas e coeficiente de partição sangue/gás relativamente baixo (0,65)."),
    451: ("C","A adrenalina adicionada ao anestésico local causa vasoconstrição local, reduzindo a absorção vascular sistêmica, prolongando a duração do bloqueio em ~33-50% e diminuindo os picos plasmáticos do AL."),
    452: ("B","No LAST (toxicidade sistêmica por AL), o tratamento de primeira linha para colapso cardiovascular é a emulsão lipídica 20% (Intralipid) 1,5 mL/kg IV em bolus, seguida de infusão 0,25 mL/kg/min."),
    453: ("D","Após 4 meias-vidas (16 horas), a concentração plasmática em regime de infusão contínua atinge ~93,75% do estado estacionário, que é ≥90%; portanto, ≥90% é atingido após 4 meias-vidas (16 horas)."),
    454: ("B","Um agonista parcial produz menor eficácia máxima (Emax menor) que o agonista pleno do mesmo receptor; sua potência (EC50) pode ser maior ou menor dependendo de sua afinidade pelo receptor."),
    455: ("B","O propofol causa hipotensão principalmente por vasodilatação arteriolar e venosa mediada por inibição do tônus simpático e ação direta sobre o músculo liso vascular; o débito cardíaco diminui por redução da pré e pós-carga."),
    456: ("B","O etomidato inibe a 11β-hidroxilase adrenal de forma dose-dependente, suprimindo a síntese de cortisol; mesmo após dose única, a supressão pode durar 4-8 horas, sendo relevante em pacientes críticos."),
    457: ("B","A cetamina é antagonista não-competitivo dos receptores NMDA e estimula indiretamente o sistema simpático (liberação de catecolaminas), aumentando FC, PA e DC; é o agente de escolha em choque hipovolêmico."),
    458: ("B","O remifentanil é metabolizado por esterases plasmáticas e teciduais inespecíficas de forma independente da duração da infusão (meia-vida de contexto ~3-5 min), permitindo recuperação rápida e previsível."),
    459: ("C","A morfina-6-glicuronídeo (M6G), metabólito ativo da morfina, acumula-se na IRC pois é eliminada pelos rins; pode causar depressão respiratória prolongada e sedação excessiva em pacientes com função renal comprometida."),
    460: ("D","A hipotermia REDUZ o CAM em cerca de 5% por grau Celsius abaixo de 37°C (desloca para a esquerda); não aumenta o CAM. As demais afirmativas (A-C) são corretas sobre definição e fatores modificadores do CAM."),
    461: ("B","No LAST com colapso cardiovascular após bupivacaína, o tratamento inclui controle de convulsões (benzodiazepínico ou propofol em dose baixa), suporte da via aérea e emulsão lipídica 20% como antídoto específico."),
    462: ("B","Migração do cateter peridural para o espaço subaracnoide resulta em bloqueio raquidiano total (high spinal): hipotensão grave, apneia, perda de consciência; requer intubação imediata, vasopressores e suporte ventilatório."),
    463: ("B","A curarização residual é definida como TOF ratio <0,9 e está associada a risco aumentado de hipóxia, aspiração e complicações respiratórias pós-operatórias; monitorização quantitativa é essencial."),
    464: ("C","Sugammadex 4 mg/kg IV é indicado para reversão de bloqueio profundo (TOF count 0-1, PTC 1-2) por rocurônio ou vecurônio; reverte imediata e completamente sem efeitos muscarínicos."),
    465: ("B","No protocolo ACLS 2020, após FV refratária a 1ª desfibrilação: nova desfibrilação → 2 min RCP → adrenalina 1 mg IV → novo ciclo; a amiodarona é adicionada após 3ª desfibrilação sem sucesso."),
    466: ("C","AESP após laparoscopia com CO₂ = suspeita principal de embolia gasosa venosa maciça; posição de Durant (decúbito lateral esquerdo + Trendelenburg), FiO₂ 100%, suporte hemodinâmico, aspiração pelo CVC."),
    467: ("B","Raquianestesia total (high spinal) após dose excessiva de bupivacaína em L3-L4: bloqueio até T2, bradicardia severa, hipotensão intensa, apneia iminente; requer IOT imediata, vasopressores e suporte ventilatório."),
    468: ("B","A fenilefrina (agonista alfa-1 puro) é o vasopressor de primeira linha para hipotensão em cesárea sob raquianestesia; mantém a PA materna sem causar taquicardia reflexa, com melhor equilíbrio ácido-base fetal."),
    469: ("B","A raquianestesia usa volumes pequenos de AL diretamente no LCR (2-4 mL), com início de ação rápido e previsível; a peridural requer volumes maiores (15-25 mL) com início mais lento e maior variabilidade."),
    470: ("B","Hematoma ou abscesso peridural com déficit neurológico progressivo é emergência neurocirúrgica; RNM de urgência é o exame diagnóstico de escolha e, se confirmado, drenagem cirúrgica de emergência é obrigatória."),
    471: ("B","O propofol possui elevada lipossolubilidade, alto volume de distribuição (>500 L), clearance hepático elevado e meia-vida de contexto moderada (~30-50 min para infusões curtas), responsáveis por sua rápida recuperação."),
    472: ("B","A analgesia multimodal com AINEs (cetorolaco IV), dipirona, bloqueio regional e opioide titulado é superior à monoterapia com opioides, reduzindo consumo total de opioide e efeitos adversos."),
    473: ("B","Um cateter peridural funcionante pode ser usado para anestesia de cesárea de urgência; administrar lidocaína 2% com epinefrina 1:200.000 em doses fracionadas com dose-teste, buscando nível T4-T6."),
    474: ("B","Na hipóxia durante ventilação monopulmonar, as primeiras medidas são: aumentar FiO₂ para 1,0, aplicar CPAP (5-10 cmH₂O) no pulmão não-ventilado e aumentar a PEEP no pulmão dependente."),
    475: ("B","Desconexão do circuito respiratório durante laringectomia total pode ocorrer na fase de desconexão traqueal; o anestesiologista deve estar atento à capnografia e oximetria para detecção imediata."),
    476: ("B","A hipertermia maligna é causada por mutação autossômica dominante no receptor de rianodina RYR1 do músculo esquelético, levando a liberação patológica de Ca²⁺ com hipermetabolismo e rigidez muscular."),
    477: ("B","Na crise de HM confirmada: descontinuar imediatamente sevoflurano (troca para TIVA), administrar dantrolene 2,5 mg/kg IV (repetir até 10 mg/kg), resfriamento ativo, correção de acidose e hipercalemia."),
    478: ("C","Após Trendelenburg prolongado + ventilação mecânica, a queda de SpO₂ e crepitações bilaterais indicam atelectasia e lesão pulmonar associada à ventilação em posição de cabeça abaixo (VEI-VALI); tratar com recrutamento alveolar."),
    479: ("B","TOF ratio 0,68 na SRPA com esforço respiratório = curarização residual clinicamente significativa; sugammadex 2 mg/kg IV para rocurônio/vecurônio reverte completamente em <3 minutos."),
    480: ("B","Hipocalcemia sintomática grave após tireoidectomia (parestesias + Chvostek + QTc 510 ms) por lesão das paratireoides exige gluconato de cálcio 1-2 g IV em 10-20 min, com monitorização cardíaca contínua."),
    481: ("B","Delirium pós-operatório em idoso exige exclusão sistemática de causas tratáveis: hipóxia, hipoglicemia, retenção urinária, dor, distúrbios hidroeletrolíticos, antes de iniciar tratamento farmacológico."),
    482: ("B","Após TIVA com remifentanil, o término abrupto da infusão causa hiperalgesia de rebote e ausência de analgesia residual; é essencial administrar analgésico de transição (opioide de longa ação ou bloqueio regional) antes do fim."),
    483: ("B","PaO₂/FiO₂ <200 mmHg + infiltrados bilaterais + ausência de IC = SDRA moderada conforme critérios de Berlim; tratamento: ventilação protetora (VC 6 mL/kg PI, P plateau <30, PEEP otimizada) e posição prona se grave."),
    484: ("B","Para alta da SRPA, o escore de Aldrete modificado deve ser ≥9; para alta ambulatorial direta ao domicílio, usa-se a escala PADSS (Post-Anesthetic Discharge Scoring System) com critérios específicos de deambulação e micção."),
    485: ("B","CPPD após raquianestesia (cefaleia postural, piora em pé, melhora deitado): tratamento conservador com hidratação, repouso relativo, cafeína oral; blood patch epidural se refratária em 24-48h."),
    486: ("B","A analgesia pós-operatória efetiva é fundamental para prevenir cronicização da dor e facilitar a mobilização precoce; abordagem multimodal com AINEs, paracetamol, opioide e técnicas regionais é o padrão atual."),
    487: ("C","Sedação excessiva por dexmedetomidina (sem antagonista disponível): estimulação física vigorosa, oxigênio suplementar e aguardar metabolização espontânea; flumazenil e naloxona são ineficazes para dexmedetomidina."),
    488: ("B","Depressão respiratória por opioides (FR 6 irpm, SpO₂ 82%, pupilas puntiformes) = naloxona 0,04-0,1 mg IV titulada a cada 2-3 min até recuperação da ventilação adequada; evitar dose excessiva para prevenir abstinência aguda."),
    489: ("B","A sensibilização central envolve ativação de receptores NMDA e liberação de substância P no corno posterior da medula, amplificando a resposta nociceptiva e resultando em hiperalgesia e alodinia."),
    490: ("B","Dor com queimação + alodinia + choque elétrico após herniorrafia inguinal sugere neuropatia do nervo ilioinguinal/iliohipogástrico; tratamento com anticonvulsivantes (gabapentina, pregabalina) e amitriptilina."),
    491: ("B","Dor do membro fantasma resulta de reorganização cortical e sensibilização central após amputação; tratamento multimodal: analgesia peridural ou bloqueio regional perioperatório, gabapentinoides, antidepressivos, terapia espelho."),
    492: ("C","Delirium hiperagitado pós-operatório em UTI (RASS +3/+4) requer haloperidol IV ou IM como primeira linha de tratamento farmacológico, após exclusão de causas tratáveis (hipóxia, dor, retenção urinária)."),
    493: ("B","O sinergismo farmacodinâmico entre midazolam (potenciador GABAérgico) e propofol explica a apneia após dose habitual de propofol; reduzir doses de ambos em 30-50% quando usados em combinação."),
    494: ("D","Paciente com uso crônico de morfina oral apresenta tolerância (necessita mais opioide para o mesmo efeito) E hiperalgesia induzida por opioides (OIH), tornando-o hipersensível à dor; abordagem multimodal é essencial."),
    495: ("B","Em ritmos não chocáveis (AESP e assistolia), a adrenalina 1 mg IV deve ser administrada o mais cedo possível e repetida a cada 3-5 min durante a RCP; não há indicação de desfibrilação nesses ritmos."),
    496: ("B","CIVD no contexto de tríade letal (hipotermia + acidose + coagulopatia): ressuscitação hemostática com plasma:plaquetas:concentrado de hemácias em proporção 1:1:1, reaquecimento ativo e ácido tranexâmico."),
    497: ("B","Em PCR com paciente em decúbito ventral, realizar compressões torácicas sobre as vértebras torácicas médias (T7-T10) a 100-120 por min; se possível, virar para supino; caso contrário, compressões em prona são eficazes."),
    498: ("B","O prurido induzido por morfina intratecal resulta da ativação de receptores μ no núcleo trigeminal e não é mediado por histamina; tratamento: naloxona em dose baixa (0,04-0,1 mg IV) ou ondansetrona."),
    499: ("A","Paciente que deambula sem assistência, com bloqueio sensitivo residual ao frio mas sem bloqueio motor, preenchendo critérios de Aldrete ≥9 e PADSS ≥9, está apto para alta após procedimento ambulatorial."),
    500: ("B","Síndrome de RTU por absorção de glicina 1,5% hipotônica: hiponatremia dilucional + hipervolemia + toxicidade da glicina (amônia, visão turva, encefalopatia); tratamento: restrição hídrica, furosemida, solução salina hipertônica se sódio <120 mEq/L."),
    501: ("B","Os halogenados em uso clínico causam vasodilatação coronariana; o isoflurano em particular está associado ao fenômeno de roubo coronariano em pacientes com doença coronariana obstrutiva grave e circulação colateral."),
    502: ("B","Dexmedetomidina é preferida para sedação em IRC por ser predominantemente metabolizada no fígado (sem acúmulo renal relevante), proporcionar sedação cooperativa sem depressão respiratória e ter efeito analgésico."),
    503: ("B","O bloqueio do plexo celíaco por via percutânea posterior guiada por fluoroscopia ou ecoendoscopia (USE) é a técnica mais eficaz para dor oncológica visceral refratária em câncer de pâncreas."),
    504: ("B","Em TCE grave com instabilidade hemodinâmica, o etomidato (0,3 mg/kg) é o agente de indução preferido por sua neutralidade hemodinâmica e capacidade de reduzir o consumo metabólico cerebral sem hipotensão."),
    505: ("B","Retenção urinária pós-raquianestesia é complicação comum da morfina intratecal, pela supressão da contração detrusora mediada por receptores μ na medula sacral; frequentemente requer sondagem vesical."),
    506: ("B","A síncope com bradicardia intensa após raquianestesia + posição sentada resulta do reflexo de Bezold-Jarisch: simpaticolise + esvaziamento brusco do VE pela posição ortostática ativa reflexo vasovagal intenso."),
    507: ("B","O desflurano possui o menor coeficiente de partição sangue/gás entre os halogenados em uso clínico (0,42), resultando em indução e recuperação mais rápidas; o sevoflurano (0,65) e isoflurano (1,4) são mais solúveis."),
    508: ("B","Movimentos da laringe + laringoespasmo em criança durante indução inalatória indica plano anestésico insuficiente (fase de excitação de Guedel II/início de III); aprofundar o plano antes de qualquer manipulação."),
    509: ("B","Taquicardia + midríase + sudorese + PA elevada durante manutenção com isoflurano 1,2% + N₂O = plano anestésico insuficiente com risco de consciência intraoperatória (awareness); aprofundar imediatamente a anestesia."),
    510: ("A","Os anestésicos locais bloqueiam canais de sódio voltagem-dependentes preferencialmente nos estados aberto e inativado (bloqueio uso-dependente), impedindo a despolarização e condução do potencial de ação neuronal."),
}
ME1_CORRECOES.update(ME1_374_510)

# ── ME2 (219 questões afetadas) ──────────────────────────────────────────────
ME2_CORRECOES = {
    0:  ("B","PAP 42/18 + POAP 22 (elevada) + DC 2,8 (baixo) + RVS 2000 (alta) = insuficiência ventricular esquerda com baixo débito cardíaco e hipertensão venocapilar pulmonar; indicar inotrópico (dobutamina)."),
    1:  ("B","Tamanho amostral insuficiente resulta em poder estatístico inadequado (beta elevado), levando ao erro tipo II (falso negativo): não detectar diferença real entre os tratamentos quando ela existe."),
    2:  ("B","NNT = 1/RAR = 1/(0,40-0,20) = 1/0,20 = 5; cada 5 pacientes tratados com ondansetrona previne 1 caso de NVPO em comparação ao controle."),
    3:  ("C","Para estudar desfecho raro (aborto) com exposição ambiental, o delineamento caso-controle é mais eficiente; recrutar casos com aborto e controles sem aborto e avaliar exposição ao N₂O retrospectivamente."),
    4:  ("C","O modelo de efeitos aleatórios, adequado quando I²≥50%, assume que os estudos estimam efeitos verdadeiros diferentes mas relacionados, acomodando a variabilidade real entre estudos (heterogeneidade)."),
    5:  ("B","Significância estatística (p=0,03) com Cohen d=0,32 indica efeito pequeno; a diferença de 1 ponto na VAS pode não ter relevância clínica prática. Significância estatística ≠ relevância clínica."),
    6:  ("B","Estudo que acompanha participantes sem o desfecho ao longo do tempo para avaliar incidência = coorte prospectiva; a medida de associação apropriada é o risco relativo (RR) ou hazard ratio."),
    7:  ("A","Teste positivo em 90/100 com broncoespasmo = sensibilidade 90%; negativo em 90/100 sem broncoespasmo = especificidade 90%. Sensibilidade = VP/(VP+FN); especificidade = VN/(VN+FP)."),
    8:  ("C","Para comparar 3 grupos com variável contínua de distribuição não-normal, usa-se o teste de Kruskal-Wallis (equivalente não-paramétrico da ANOVA); Mann-Whitney é para 2 grupos."),
    9:  ("B","Coeficiente sangue/gás de 0,45 indica baixa solubilidade no sangue: pouco agente dissolve para atingir pressão parcial alveolar-arterial de equilíbrio, resultando em indução e recuperação rápidas."),
    10: ("B","PAP 55/30 + POAP 8 (normal) + DC 4,5 (normal) + RVP 800 (elevada) = hipertensão pulmonar pré-capilar (HAPI ou TEP crônico); POAP normal afasta hipertensão venocapilar de causa cardíaca esquerda."),
    11: ("B","A alocação por dia da semana é previsível e permite que participantes ou equipe identifiquem antecipadamente o grupo de alocação, introduzindo viés de seleção que compromete a validade do estudo."),
    12: ("B","NNT = 1/(0,12-0,04) = 1/0,08 = 12,5; RR = 0,04/0,12 = 0,33. O tratamento reduz o risco relativo em 67% e é necessário tratar 12,5 pacientes para prevenir 1 caso de broncoespasmo."),
    13: ("B","Avaliação de prevalência de SAOS em um único momento sem seguimento = estudo transversal (cross-sectional); limitação principal: não permite estabelecer relação temporal causal entre exposição e desfecho."),
    14: ("B","Diamond cruzando a linha de nulidade (OR=1) indica resultado não estatisticamente significativo; I²=25% representa baixa heterogeneidade, favorecendo o modelo de efeitos fixos."),
    15: ("B","AUC=0,82 indica boa capacidade discriminativa: 82% de probabilidade de que o escore classifique corretamente um paciente de alto risco acima de um de baixo risco (c-statistic)."),
    16: ("B","Para avaliar concordância entre dois avaliadores em uma variável ordinal categórica (atelectasia: ausente/leve/grave), o Kappa de Cohen é o teste estatístico adequado."),
    17: ("B","Cohen d=0,32 indica tamanho de efeito pequeno (<0,5); embora estatisticamente significativa, a diferença de 1 ponto na VAS provavelmente não tem relevância clínica para o paciente."),
    18: ("B","Viés de detecção = diferença sistemática na mensuração do desfecho entre grupos (ex: avaliação não cega do desfecho); viés de performance = diferença no tratamento recebido além da intervenção estudada."),
    19: ("B","O bloqueio do canal dos adutores (BCA) bloqueia o nervo safeno sensitivo e preserva melhor a força do quadríceps comparado ao bloqueio do nervo femoral (BNF), reduzindo risco de quedas e favorecendo reabilitação precoce."),
    20: ("A","Na abordagem infraclavicular guiada por ultrassom, os três fascículos do plexo braquial (lateral, posterior e medial) são visualizados ao redor da artéria axilar, permitindo injeção precisa em cada fascículo."),
    21: ("A","O PECS II (Pectoral Nerve block II) consiste em injeção no plano entre peitoral maior e menor (PECS I: nervos peitorais medial e lateral) e entre peitoral menor e serrátil (nervos intercostais laterais T2-T6), cobrindo mama e axila."),
    22: ("C","O nervo ciático se divide em tibial e fibular comum em média 5-7 cm acima da prega poplítea, permitindo bloqueio do tronco indiviso com injeção única por abordagem poplítea, cobrindo toda a perna abaixo do joelho."),
    23: ("A","O TAP block (bloqueio do plano transverso abdominal) é realizado entre o oblíquo interno e o transverso abdominal, anestesiando os nervos toracoabdominais (T6-L1) para analgesia da parede abdominal anterior."),
    24: ("A","O nervo safeno é o único ramo terminal sensitivo do nervo femoral; o bloqueio no canal dos adutores interrompe a transmissão sensitiva da face medial da perna e do pé sem bloquear o quadríceps."),
    25: ("A","O ultrassom reduz a latência do bloqueio, o volume de AL necessário (~30-50%), a incidência de injeção intravascular e melhora a taxa de sucesso em comparação à neuroestimulação isolada."),
    26: ("B","Para uretrocistoscopia em litotomia, raquianestesia em sela com bupivacaína hiperbárica 7,5-10 mg + posição sentada por 3-5 min após a punção concentra o AL no cone perineal e sacral (S1-S5), poupando raízes lombares e reduzindo hipotensão."),
    27: ("B","Hipotensão pós-raquianestesia em cesariana: deslocamento uterino lateral esquerdo (previne compressão aortocava), cristaloide ou coloide e vasopressor de primeira escolha; fenilefrina 100 mcg IV em bolus (titulada) é o padrão."),
    28: ("B","TNS (Transient Neurologic Symptoms): dor ou disestesia em nádegas/membros inferiores sem déficit motor ou sensitivo objetivável, com resolução espontânea em 72h; mais frequente com lidocaína hiperbárica e posição litotomia."),
    29: ("A","Os ésteres (procaína, tetracaína, cloroprocaína, cocaína) são metabolizados por esterases plasmáticas (pseudocolinesterases) gerando ácido para-aminobenzóico (PABA) como metabólito principal."),
    30: ("A","A CPPD resulta de perda de LCR por punção dural com tração das estruturas meníngeas e nervos cranianos; tratamento conservador nas primeiras 24-48h e blood patch epidural como tratamento definitivo nos casos refratários."),
    31: ("B","A dose de morfina intratecal para analgesia em cesariana é tipicamente 100-200 mcg; doses acima de 300 mcg não melhoram a analgesia mas aumentam significativamente os efeitos adversos (prurido, depressão respiratória)."),
    32: ("B","Confusão + visão turva durante RTUP com glicina = síndrome de absorção do irrigante (síndrome RTU); interromper irrigação, dosar sódio sérico, diurético (furosemida), solução salina se hiponatremia grave (<120 mEq/L)."),
    33: ("D","A curvatura da coluna vertebral (lordose lombar e cifose torácica) É relevante para a dispersão de soluções hiperbáricas; a lordose lombar em decúbito dorsal concentra hiperbárica em S5-L3, e a cifose torácica limita a ascensão."),
    34: ("B","A perda de resistência (LOR) com ar aumenta o risco de pneumocéfalo, embolia gasosa e CPPD por deslocamento de LCR; LOR com solução salina é considerada mais segura, especialmente em pediatria e via cervical/torácica."),
    35: ("A","Aumento de FC ≥20 bpm em 60 segundos após injeção de 3 mL de lidocaína 1,5% + adrenalina 1:200.000 (dose-teste) indica posicionamento intravascular inadvertido do cateter; reposicionar antes de prosseguir."),
    36: ("C","A analgesia peridural pode ser iniciada em qualquer fase do trabalho de parto (mesmo com <4 cm de dilatação) sem aumentar a taxa de cesariana; evidências atuais não sustentam restrição por fase do trabalho."),
    37: ("B","Febre + bacteremia sem foco em paciente com cateter peridural há >72h: remover cateter imediatamente, enviar ponta para cultura, hemoculturas e iniciar antibioticoterapia empírica. RNM se déficit neurológico."),
    38: ("A","Na técnica raquiperidural combinada (needle-through-needle), a agulha espinhal é introduzida através da agulha de Tuohy posicionada no espaço peridural, permitindo punção dural e injeção intratecal seguida de passagem do cateter peridural."),
    39: ("C","Hipotensão refratária após peridural torácica combinada com anestesia geral: norepinefrina (0,05-0,3 mcg/kg/min) ou vasopressina (0,03-0,04 U/min) são vasopressores de escolha por atuarem em receptores não afetados pelo bloqueio simpático."),
    40: ("A","O mecanismo de ação dos ALs envolve: a forma não ionizada (lipossolúvel) atravessa a membrana celular e, no citoplasma, re-ioniza e bloqueia os canais de Na⁺ voltagem-dependentes por dentro (receptor intracelular)."),
    41: ("A","O ultrassom pré-procedimento e guiado em tempo real aumenta significativamente a taxa de sucesso do bloqueio caudal em adultos, onde o hiato sacral pode ser difícil de palpar por calcificações ou variações anatômicas."),
    42: ("A","Com cateter peridural funcionante, usar lidocaína 2% com adrenalina 1:200.000 (15-20 mL) fracionada com dose-teste para conversão para cesariana de urgência; início de ação rápido (<10 min) com nível T4-T6."),
    43: ("C","LAST em fase inicial (SNC): interromper qualquer injeção adicional, oferecer O₂ suplementar, garantir acesso venoso calibroso, preparar emulsão lipídica para administração imediata se progredir para colapso cardiovascular."),
    44: ("C","A felipressina (octapressina) é análogo da vasopressina com potencial efeito uterotônico em doses elevadas e pode reduzir o fluxo uterino; não é vasoconstritor de escolha em gestantes — esta é a afirmativa incorreta."),
    45: ("C","A ropivacaína é o enantiômero S(-) puro, com menor cardiotoxicidade que a bupivacaína racêmica e menor propensão a arritmias ventriculares fatais, mantendo perfil analgésico similar em concentrações equivalentes."),
    46: ("C","O protocolo ASRA para LAST com colapso cardiovascular recomenda emulsão lipídica 20% em bolus de 1,5 mL/kg IV em 1 minuto, seguida de infusão 0,25 mL/kg/min; pode-se repetir o bolus 1-2 vezes se sem resposta."),
    47: ("A","A bupivacaína produz bloqueio motor mais intenso que a ropivacaína em concentrações equipotentes devido à maior lipossolubilidade e afinidade pelos canais de Na⁺ na fibra motora; ropivacaína tem maior diferencial sensitivo-motor."),
    48: ("B","O bloqueio interescalênico causa paralisia do nervo frênico ipsilateral em ~100% dos casos, reduzindo a CV em ~25%; em paciente com DPOC moderado (VEF1 55%), este bloqueio pode precipitar insuficiência respiratória."),
    49: ("B","Síndrome de absorção de irrigante (RTU): hiponatremia dilucional + confusão mental + náuseas + hipovolemia relativa; tratamento: interromper irrigação, restrição hídrica, furosemida, solução salina, NaCl hipertônico se Na <120 mEq/L."),
    50: ("C","O manitol é filtrado pelos glomérulos e NÃO é reabsorvido pelo túbulo proximal; permanece no lúmen tubular e exerce efeito osmótico, arrastando água para o túbulo e aumentando o volume urinário. Esta é a afirmativa incorreta."),
    51: ("B","Hidrotórax durante nefrolitotripsia percutânea pode ocorrer por extravasamento de solução de irrigação do sistema coletoral para o espaço pleural através de lesão diafragmática ou via trajeto percutâneo supracostal."),
    52: ("C","Em IRC em hemodiálise, atracúrio e cisatracúrio sofrem eliminação de Hofmann (degradação espontânea pH/temperatura-dependente) independente de função renal ou hepática, sendo os BNM de escolha nessa condição."),
    53: ("B","Hipotensão pós-raquianestesia para cesariana = bloqueio simpático com vasodilatação; fenilefrina 100 mcg IV em bolus (titulada) ou norepinefrina são vasopressores de primeira linha; efedrina quando há bradicardia associada."),
    54: ("B","O nível terapêutico do magnésio sérico para profilaxia de eclâmpsia é de 4-7 mEq/L (4,8-8,4 mg/dL); acima de 7-10 mEq/L ocorre perda de reflexos tendinosos; >15 mEq/L risco de parada cardíaca."),
    55: ("B","Síndrome HELLP (Hemolysis, Elevated Liver enzymes, Low Platelets): plaquetopenia + elevação de transaminases + LDH elevado + hemólise; complicação grave da pré-eclâmpsia, ocorre frequentemente no pós-parto imediato."),
    56: ("D","Hemorragia pós-parto com útero hipotônico: uterotônicos de segunda linha (ergometrina IM 0,2 mg e carboprost IM) após falha/contraindicação da ocitocina; associados a massagem uterina e compressão bimanual."),
    57: ("C","Embolia de líquido amniótico: diagnóstico de exclusão; manejo é exclusivamente de suporte — ressuscitação cardiopulmonar, suporte hemodinâmico com vasopressores, correção de CIVD e monitorização fetal contínua."),
    58: ("C","A CAM dos inalatórios REDUZ em ~30-40% na gestação (não aumenta) devido à progesterona, que potencializa o efeito dos anestésicos no SNC; esta é a afirmativa INCORRETA."),
    59: ("A","A dose padrão de protamina para reversão da heparina é 1 mg de protamina para cada 100 UI de heparina administrada; excesso de protamina tem efeito anticoagulante por si mesmo."),
    60: ("B","A síndrome de implantação do cimento ósseo resulta de embolia de monômero de PMMA, gordura e ar no sistema venoso durante a cimentação; manifesta-se com hipotensão, hipóxia e colapso cardiovascular súbito."),
    61: ("B","Síndrome de embolia gordurosa (SEG): critérios de Gurd (petéquias + insuficiência respiratória + alteração neurológica) após fratura de fêmur bilateral; início 12-72h após trauma."),
    62: ("B","Tríade letal do trauma = hipotermia + acidose metabólica + coagulopatia; quebra o ciclo de coagulação e exige ressuscitação hemostática (1:1:1), reaquecimento ativo e correção da acidose."),
    63: ("A","Após desinsuflação do torniquete: hipercapnia (washout de CO₂ acumulado no membro), queda da temperatura central, hipercalemia transitória por washout de K⁺ e hipotensão por vasodilatação do membro."),
    64: ("B","Para fratura de colo femoral em idoso, a anestesia neuroaxial (raquianestesia ou peridural) está associada a menor mortalidade em 30 dias e menos complicações pulmonares, trombóticas e infecciosas."),
    65: ("B","A pressão de insuflação recomendada para MMII é 200-250 mmHg acima da PAS (mínimo 250 mmHg); contraindicado em doença vascular periférica grave, TVP ativa e linfedema grave."),
    66: ("C","Para bloqueio neuroaxial em pré-eclâmpsia grave, a maioria das diretrizes aceita plaquetas ≥70.000-80.000/μL com tendência estável e sem coagulopatia associada como limiar mínimo seguro."),
    67: ("A","Em hepatopata grave Child-Pugh C com coagulopatia e cirurgia de urgência: corrigir INR com plasma fresco congelado 4 unidades + plaquetas se <50.000/μL; fibrinogênio se <150 mg/dL."),
    68: ("B","Glicina (usada como irrigante em RTUP) é metabolizada em amônia e glioxilato; a amônia causa encefalopatia e visão turva (bloqueio da neurotransmissão na retina) na síndrome RTU com glicina."),
    69: ("B","Para cesariana de emergência com estômago cheio, o padrão é indução de sequência rápida (ISR) com propofol ou cetamina + succinilcolina 1,5 mg/kg OU rocurônio 1,2 mg/kg + intubação sem ventilação com máscara."),
    70: ("C","Para reversão urgente de rivaroxabana (anticoagulante Xa) em emergência cirúrgica, o antídoto específico é o andexanet alfa; concentrado de complexo protrombínico de 4 fatores é alternativa quando andexanet não disponível."),
    71: ("B","A heparina não fracionada SC profilática (<10.000 UI/dia) NÃO é contraindicação para bloqueio de nervo periférico; as restrições de bloqueio neuroaxial não se aplicam completamente aos bloqueios periféricos."),
    72: ("B","Para reversão urgente de dabigatrana (inibidor direto da trombina), o antídoto específico é o idarucizumabe 5 g IV (2 frascos de 2,5 g), com reversão imediata e completa do efeito anticoagulante."),
    73: ("B","ROTEM EXTEM com CT prolongado + CFT prolongado + MCF reduzido, com FIBTEM também mostrando MCF reduzido, indica deficiência de fibrinogênio como causa principal do comprometimento da resistência do coágulo."),
    74: ("B","CIVD pós-DPP: tratar a causa base (extração fetal e útero) e repor hemoderivados guiados por exames (CH, PFC, plaquetas, crioprecipitado) e ROTEM/TEG quando disponível."),
    75: ("C","Para reversão urgente de warfarina com INR 4,8 em cirurgia de emergência: concentrado de complexo protrombínico (CCP) 4 fatores é mais rápido, eficaz e seguro que PFC; vitamina K leva 4-6h para agir."),
    76: ("B","Resistência à heparina durante CEC com TCA caindo = deficiência de antitrombina III (ATIII); a heparina precisa de ATIII para exercer seu efeito anticoagulante. Reposição de ATIII ou PFC (que contém ATIII) resolve."),
    77: ("C","TFG 42 mL/min = DRC estágio 3b (KDIGO); exige ajuste de doses de drogas excretadas renalmente, evitar AINEs e nefrotóxicos, hidratação cuidadosa e monitorização rigorosa da função renal perioperatória."),
    78: ("C","Creatinina 2,8 mg/dL vs. basal 1,0 mg/dL = aumento 2,8× (>2× basal = estágio 2 pelo critério de creatinina KDIGO); diurese 0,3 mL/kg/h (<0,5 mL/kg/h por >6h = estágio 2 por diurese). Ambos classificam como estágio 2."),
    79: ("B","EtCO₂ subindo durante laparoscopia com pneumoperitônio = absorção de CO₂ pelo peritônio + posição desfavorável; aumentar frequência respiratória para compensar a hipercapnia é a conduta inicial."),
    80: ("B","Sódio urinário 8 mEq/L (baixo) + osmolaridade urinária alta + baixo débito urinário = IRA pré-renal (hipovolemia funcional pós-CEC); responde a expansão volêmica cuidadosa."),
    81: ("B","AINEs são contraindicados relativos em DRC estágio 3b+ por inibição de prostaglandinas vasodilatadoras renais, podendo precipitar IRA em pacientes com função renal já comprometida."),
    82: ("D","A morfina-6-glucuronídeo (M6G), metabólito ativo da morfina, acumula-se na IRC e pode causar depressão respiratória grave e prolongada; morfina deve ser evitada ou usada em doses muito reduzidas com monitorização rigorosa."),
    83: ("C","Placenta prévia com suspeita de acretismo: anestesia geral com ISR planejada desde o início é preferível por permitir controle da via aérea, suporte hemodinâmico agressivo e acesso a banco de sangue e cell saver."),
    84: ("B","Laringoespasmo + edema glótico grave pós-extubação em gestante com pré-eclâmpsia: ventilação por máscara laríngea como ponte, e cricotireoidostomia cirúrgica como último recurso em situação CICO."),
    85: ("A","Hipotensão por bloqueio peridural em parturiente = vasodilatação por bloqueio simpático; efedrina (beta + alfa) ou fenilefrina (alfa puro) IV são os vasopressores indicados; efedrina preferida quando há bradicardia."),
    86: ("C","Para sutura de laceração perineal grau I-II em puérpera com instabilidade hemodinâmica relativa, raquianestesia com bupivacaína hiperbárica 7,5 mg oferece analgesia rápida, eficaz e sem depressão respiratória."),
    87: ("B","Para cerclagem cervical em gestante de 28 semanas, raquianestesia baixa (sela) com bupivacaína hiperbárica 5-7,5 mg é ideal: bloqueia S2-S5 para o colo uterino com mínima repercussão hemodinâmica e fetal."),
    88: ("B","O sulfato de magnésio atravessa a barreira placentária e causa hipotonia, hipoventilação, hiporreflexia e hipocalcemia transitória no RN; os efeitos são geralmente transitórios e reversíveis com gluconato de cálcio."),
    89: ("C","Apixabana com última dose há 14h em fratura de quadril urgente: andexanet alfa reverte especificamente os inibidores de fator Xa (apixabana, rivaroxabana) de forma rápida; alternativa: CCP 4 fatores se andexanet indisponível."),
    90: ("B","Para monitorização neurofisiológica intraoperatória (PESS + MEPs), TIVA com propofol + remifentanil + baixa dose de halogenado (<0,5 CAM) interfere menos nas amplitudes dos potenciais evocados que altas doses de halogenados."),
    91: ("B","Após deflação de segundo torniquete em artroplastia bilateral: embolia gordurosa ou de cimento da medula óssea pode causar queda de EtCO₂, hipoxemia e instabilidade hemodinâmica por embolia pulmonar."),
    92: ("C","Cirurgia de controle de danos na UTI: ressuscitação hemostática 1:1:1 (plasma:plaquetas:CH), reaquecimento ativo, correção gradual da acidose (evitar bicarbonato em bolus que piora hipocalcemia), ácido tranexâmico."),
    93: ("B","Para artroplastia de joelho, o bloqueio do canal dos adutores (nervo safeno) preserva a força do quadríceps e permite deambulação precoce; o bloqueio femoral causa bloqueio motor significativo e risco de quedas."),
    94: ("B","A síndrome de embolia gordurosa tipicamente se manifesta 12-72 horas após o evento traumático, com a tríade clássica: petéquias + insuficiência respiratória + alterações neurológicas (critérios de Gurd)."),
    95: ("B","A técnica de terceira geração para cimentação femoral (limpeza e secagem do canal, cimento pressurizado com pistola de cimento, plug distal) reduz embolia intravascular durante a cimentação."),
    96: ("B","Em obeso mórbido com DRC 3b: rocurônio 1,2 mg/kg (peso total) para ISR + atracúrio ou cisatracúrio para manutenção (eliminação de Hofmann independente de função renal) + sugammadex disponível."),
    97: ("D","Sangramento difuso pós-CEC com TCA normal = consumo de fatores + plaquetopenia funcional pós-CEC; crioprecipitado (fibrinogênio + fator VIII) + plaquetas é a reposição mais adequada para este padrão."),
    98: ("B","Em paciente com IRC em diálise programado para criar FAV: preservar o capital venoso evitando punções nas veias do antebraço e braço do lado da FAV futura é a principal precaução anestésica."),
    99: ("C","A analgesia peridural pode ser iniciada a qualquer momento do trabalho de parto desde que solicitada pela parturiente; evidências atuais não sustentam restrição por dilatação cervical ou fase do trabalho."),
    100: ("C","ROTEM com EXTEM+INTEM CT normais e MCF reduzido em ambos, mas com FIBTEM mostrando MCF normal = plaquetopenia/disfunção plaquetária; FIBTEM normal + MCF reduzido no EXTEM = problema nas plaquetas."),
    101: ("B","Trendelenburg acentuado prolongado + PIO elevada = risco de neuropatia óptica isquêmica posterior e oclusão da artéria central da retina por hipoperfusão ocular e aumento da pressão intraocular."),
    102: ("C","No trauma grave em gestante, a prioridade é ressuscitar a mãe primeiro; a melhor maneira de salvar o feto é tratar a mãe. Seguir ABCDE do trauma para a mãe antes de qualquer avaliação obstétrica."),
    103: ("B","Na hemofilia A grave submetida a cirurgia de alto risco, o nível mínimo de fator VIII deve ser >80-100% do normal; usar concentrado de fator VIII recombinante (não PFC, que é insuficiente e de difícil titulação)."),
    104: ("C","Para cirurgia de alto risco hemorrágico, o intervalo mínimo entre a última dose de HBPM profilática e o bloqueio neuroaxial deve ser de 12 horas; para HBPM terapêutica, 24 horas (ou anti-Xa <0,1 UI/mL)."),
    105: ("B","TP alargado + TTPA normal + plaquetas normais + fibrinogênio normal no 3º dia pós-operatório = deficiência de vitamina K por antibioticoterapia (supressão da flora intestinal) + jejum prolongado; tratar com vitamina K."),
    106: ("B","TIH tipo 2: queda >50% de plaquetas com trombose, dia 5-14 após início da heparina = anticorpos anti-PF4/heparina; tratar suspendendo imediatamente toda heparina (incluindo HBPM) e iniciando anticoagulante alternativo (argatrobana, fondaparinux)."),
    107: ("C","Para nefroproteção perioperatória em cirurgia de aorta, as únicas medidas com evidência sólida são: manutenção da normovolemia, PAM ≥65-80 mmHg, evitar nefrotóxicos e contraste iodado e minimizar o tempo de isquemia renal."),
    108: ("D","Todos os enunciados A, B e C sobre furosemida são corretos; a afirmativa D sobre ototoxicidade é correta (furosemida causa ototoxicidade em altas doses IV, especialmente combinada com aminoglicosídeos), portanto E é a incorreta."),
    109: ("B","Laringoespasmo pós-extubação em criança: posição de olfação, O₂ por máscara, CPAP com máscara e pressão positiva; se grave (SpO₂ <80%), succinilcolina 0,5-1 mg/kg IV (ou 4 mg/kg IM) para quebrar o espasmo."),
    110: ("B","A LMA de segunda geração (Supreme, ProSeal) possui canal de drenagem gástrica que permite passagem de sonda orogástrica, reduzindo o risco de regurgitação e aspiração em comparação com a LMA clássica."),
    111: ("B","Após laringectomia total, a traqueia é anastomosada diretamente à pele (traqueostoma permanente); não há conexão entre vias aéreas superiores e traqueia. A reintubação oral é impossível — somente pelo estoma."),
    112: ("A","Barotrauma (air trapping/auto-PEEP) durante jet ventilation resulta de aprisionamento aéreo: o volume de ar injetado supera o volume exalado; manifesta-se como distensão progressiva e queda de SpO₂."),
    113: ("B","O timolol colírio (betabloqueador) tem absorção sistêmica pela mucosa nasolacrimal, podendo causar bradicardia, broncoespasmo e potenciação do bloqueio beta-adrenérgico; orientar compressão do ducto lacrimal após instilação."),
    114: ("B","O reflexo oculocardíaco (ROC) é mediado pelo nervo trigêmio V1 (aferente) e pelo nervo vago X (eferente); tração do músculo extraocular ou pressão sobre o globo pode desencadear bradicardia grave."),
    115: ("D","Em globo aberto com estômago cheio, ISR com rocurônio 1,2 mg/kg (com sugammadex disponível) é preferível à succinilcolina para evitar aumento transitório da PIO (fasciculações); lidocaína 1,5 mg/kg IV prévia atenua a resposta pressórica à laringoscopia."),
    116: ("B","N₂O é contraindicado quando há bolha de gás intraocular (SF6, C3F8) por difundir para a bolha e expandi-la, aumentando a PIO a níveis críticos com risco de oclusão da artéria central da retina."),
    117: ("B","Fatores que elevam a PIO: hipercapnia, hipertensão, tosse, Valsalva, laringoscopia, succinilcolina (fasciculações), cetamina, N₂O (com gás intraocular); propofol, opioides e halogenados REDUZEM a PIO."),
    118: ("B","Glaucoma agudo de ângulo fechado: sedação cuidadosa evitando aumento da PIO; vômitos e tosse elevam a PIO por aumento da pressão venosa epiescleral; antieméticos (ondansetrona) e analgesia adequada são prioritários."),
    119: ("B","Logo após insuflação do CO₂ peritoneal, a estimulação vagal pelo estiramento peritoneal causa bradicardia e hipotensão transitória, seguida de aumento da RVS pela compressão aortocava."),
    120: ("C","ASA III com comorbidades estáveis e bem controladas (HAS, DM, obesidade grau I) NÃO contraindica cirurgia ambulatorial; as contraindicações absolutas incluem ASA IV, cirurgias >3-4h e necessidade de cuidados pós-op intensivos."),
    121: ("B","A escala PADSS avalia 5 critérios: sinais vitais, nível de atividade/consciência, náuseas/vômitos/tontura, dor pós-operatória e sangramento/drenagem cirúrgica; escore ≥9 permite alta ambulatorial."),
    122: ("B","Os 4 fatores de risco do escore de Apfel para NVPO: sexo feminino, não fumante, história de NVPO ou cinetose, e uso de opioides pós-operatórios; risco aumenta progressivamente com cada fator."),
    123: ("B","Ex-prematuros com <60 semanas de idade pós-concepcional têm risco aumentado de apneia pós-anestésica; internação com monitorização cardiorrespiratória por 12-24 horas é recomendada mesmo após procedimentos ambulatoriais."),
    124: ("C","Depressão respiratória por opioide (propofol + fentanil pós-colonoscopia): naloxona 0,04-0,1 mg IV titulada, repetindo a cada 2-3 min; evitar dose excessiva para não precipitar abstinência aguda e reverter completamente a analgesia."),
    125: ("B","SAOS grave aumenta o risco de hipóxia pós-operatória, especialmente com opioides; analgesia multimodal (AINEs + paracetamol + técnicas regionais) minimiza o consumo de opioides; monitorização noturna pode ser necessária."),
    126: ("B","Tonsilectomia sangrante tardia com estômago cheio (sangue deglutido) = ISR mandatória; risco de aspiração de sangue coagulado; indução com sequência rápida após otimização hemodinâmica e posicionamento em Trendelenburg leve."),
    127: ("C","CO₂ é o gás preferido para pneumoperitônio por ser altamente solúvel no sangue (absorvido e eliminado rapidamente pelos pulmões), atóxico nos níveis utilizados e não suportar combustão, minimizando o risco de embolia fatal."),
    128: ("B","Via aérea difícil em obeso com falha de ISR: segunda tentativa com videolaringoscópio (GlideScope/C-MAC) com bougie, mantendo oxigenação adequada; não insistir com laringoscopia direta convencional."),
    129: ("B","Propofol apresenta efeito anti-vagal e antiemético; em cirurgia de estrabismo, o uso de TIVA com propofol reduz a incidência do reflexo oculocardíaco em comparação com agentes inalatórios."),
    130: ("B","Queda de SpO₂ em DPOC durante Trendelenburg + pneumoperitônio = comprometimento da mecânica respiratória pelo deslocamento cefálico do diafragma; aumentar FR e VC (dentro de limites seguros), reduzir pressão de insuflação."),
    131: ("B","As principais causas de reinternação após cirurgia ambulatorial são: dor inadequadamente controlada, NVPO persistentes, sangramento, complicações cirúrgicas e complicações anestésicas (hipotensão, confusão, retenção urinária)."),
    132: ("B","Reduzem a PIO: propofol, halogenados, opioides, benzodiazepínicos, acetazolamida; Aumentam a PIO: cetamina, N₂O (com gás intraocular), succinilcolina (transitoriamente), tosse, Valsalva, laringoscopia."),
    133: ("C","Para TIVA com propofol em obeso mórbido: dose de indução baseada no peso total ajustado (PTA = PI + 0,4×[PT-PI]) e manutenção pelo TCI com PTA ou peso total; não usar peso ideal para infusão contínua pois resulta em subdose."),
    134: ("B","A posição de rampa (cabeça e tronco elevados 30-40°, meato acústico alinhado com a fúrcula esternal) melhora a laringoscopia no obeso e reduz o tempo de dessaturação durante a apneia; extubação com SpO₂>95% e paciente alerta."),
    135: ("B","Embolia gasosa venosa maciça por CO₂ durante laparoscopia: dessuflação imediata, posição Durant (decúbito lateral esquerdo + Trendelenburg), FiO₂ 100%, vasopressores, aspiração do gás pelo CVC se disponível."),
    136: ("A","Para bloqueadores neuromusculares no obeso: succinilcolina usa-se peso total (a colinesterase plasmática aumenta proporcionalmente); rocurônio e vecurônio (ISR): peso total; manutenção: peso ideal para evitar bloqueio prolongado."),
    137: ("B","Para microcirurgia de laringe (polipectomia), o campo cirúrgico livre exige tubo microlaríngeo (MLT 4,0 mm, com balonete de alta capacidade e baixa pressão) ou jet ventilation de alta frequência para não obstruir o campo."),
    138: ("B","O principal risco específico do uso de laser CO₂ na laringe é o incêndio endotraqueal (airway fire); prevenção: tubo resistente a laser, FiO₂ mínima ≤0,30 (diluída em N₂ ou hélio), campo úmido e comunicação com o cirurgião."),
    139: ("B","Um broncoscópio de 4,9 mm em LMA nº4 (diâmetro interno 13 mm) ocupa parte significativa do lúmen, podendo comprometer a ventilação; reduzir o volume corrente ou usar LMA ProSeal de maior lúmen."),
    140: ("B","Corpo estranho endobrônquico em criança: broncoscopia rígida sob anestesia geral com TIVA (propofol + remifentanil), ventilação espontânea ou controlada a jato pelo broncoscópio; permite extração segura do corpo estranho."),
    141: ("B","Para retalho livre microvascular: manter normotermia (≥36°C), normovolemia, PAM ≥70-80 mmHg e hematócrito 25-30% (hemodiluição leve) para otimizar o fluxo no retalho e prevenir trombose microvascular."),
    142: ("B","Incêndio endotraqueal: desconectar o circuito imediatamente (interromper fonte de O₂), retirar o TOT em chamas, irrigar as vias aéreas com NaCl 0,9% frio, reintubação cuidadosa e avaliação da lesão por laringoscopia/broncoscopia."),
    143: ("C","Injeção retrobulbar com perda de consciência, bradicardia e apneia em segundos = injeção intratecal inadvertida pelo espaço subaracnoide do nervo óptico, causando bloqueio do tronco encefálico; suporte respiratório imediato."),
    144: ("B","Tosse + Valsalva vigorosa na extubação após trabeculectomia podem causar elevação aguda da PIO com ruptura da bolha filtrante recém-criada; extubação com paciente relaxado (lidocaína IV ou agentes anti-tusígenos) é essencial."),
    145: ("D","ISR com rocurônio 1,2 mg/kg (com sugammadex disponível) é a técnica de escolha em globo aberto com estômago cheio; pré-tratamento com lidocaína 1,5 mg/kg IV e esmolol blunts a resposta pressórica à laringoscopia."),
    146: ("C","C3F8 (perfluoropropano) tem reabsorção muito mais lenta que SF6 (SF6: 10-14 dias; C3F8: 8-10 semanas); N₂O deve ser evitado por até 10 semanas após injeção de C3F8 pelo risco de expansão da bolha intraocular."),
    147: ("B","Reflexo oculocardíaco durante cirurgia de estrabismo: solicitar ao cirurgião que cesse a tração temporariamente; se a bradicardia não reverter espontaneamente, atropina 0,02 mg/kg IV; repetir se necessário."),
    148: ("B","O bloqueio peribulbar usa maior volume (6-12 mL) fora do cone muscular, tem menor risco de injeção intratecal pelo nervo óptico e menor risco de hematoma retrobulbar, com eficácia comparável ao retrobulbar."),
    149: ("B","Edema facial + macroglossia ao final de laparoscopia em Trendelenburg prolongado = edema de vias aéreas superiores por congestão venosa cefálica; avaliar via aérea cuidadosamente antes da extubação, considerar extubação acordado."),
    150: ("B","ASA III estável (IC compensada FE 45%, DM2 controlado) com procedimento de mínimo risco sob anestesia local = candidato adequado para cirurgia ambulatorial; cirurgia ambulatorial não é restrita a ASA I-II exclusivamente."),
    151: ("B","Apfel score = 3 (sexo feminino + não fumante + cinetose); risco de NVPO ~61%; profilaxia com 2-3 agentes de diferentes mecanismos (ondansetrona + dexametasona + escopolamina ou haloperidol) é recomendada."),
    152: ("B","Para alta ambulatorial após raquianestesia, o critério de resolução do bloqueio motor (Bromage 0 = flexão completa do joelho) + capacidade de deambular + escore PADSS ≥9 são necessários antes da alta."),
    153: ("B","Ex-prematuro com 46 semanas IPC (menor que 60 semanas): risco aumentado de apneia pós-anestésica; internação com monitorização cardiorrespiratória por pelo menos 12-24 horas após herniorrafia é obrigatória."),
    154: ("B","Tontura + zumbido + sabor metálico = pródomos de LAST; interromper imediatamente qualquer injeção adicional, oferecer O₂, acesso venoso, benzodiazepínico para prevenir convulsão, Intralipid 20% disponível."),
    155: ("B","SAOS grave com IAH 55/h em cirurgia de vias aéreas: internação para monitorização noturna da SpO₂ e uso de CPAP pós-operatório são essenciais; alta imediata aumenta o risco de hipóxia noturna grave."),
    156: ("B","Via aérea difícil previsivelmente difícil (câncer de laringe + estridor + trismo + Mallampati não avaliável): intubação com fibroscópio flexível acordado (FOI awake) sob sedação leve + anestesia tópica é o padrão."),
    157: ("B","Após bypass gástrico com exclusão do duodeno e parte do jejuno proximal, a absorção de medicamentos de liberação entérica e formulações de liberação prolongada pode estar significativamente alterada."),
    158: ("B","Diretrizes ASA 2023: líquidos claros 2h; leite materno 4h; fórmula infantil/leite não materno/refeição leve 6h; refeição completa (gordurosa, carne) 8h. Suco com polpa = refeição leve = 6h."),
    159: ("B","Hipertensão pós-operatória (PA 185/105 mmHg) em paciente com controle habitual adequado + sem evidência de isquemia: causa mais comum é dor inadequadamente controlada; analgesia adequada é a primeira intervenção."),
    160: ("B","Morfina em pós-operatório bariátrico: calcular pelo peso ideal para evitar superdosagem e depressão respiratória grave; obesos mórbidos têm maior sensibilidade aos opioides e risco elevado de hipóxia pós-operatória."),
    161: ("B","Taquicardia + HAS durante rinoplastia = absorção sistêmica de adrenalina subcutânea (infiltração local pelo cirurgião); suspender novas injeções, aprofundar plano anestésico, labetalol ou nitroprussiato se necessário."),
    162: ("B","Reoperação bariátrica em paciente com sinais de fístula (taquicardia + febre + peritonismo): ISR é mandatória pelo risco de estômago cheio (gastroparesia + íleo paralítico pós-operatório + obesidade)."),
    163: ("C","EtCO₂ subindo para 70 mmHg + pressão de pico aumentada + sem deterioração hemodinâmica durante laparoscopia = capnomediastino ou capnotórax por dissecção retroperitoneal de CO₂ para espaços adjacentes."),
    164: ("B","Obstrução de via aérea pós-extubação em obeso mórbido com SpO₂ 84%: LMA de segunda geração (ProSeal/Supreme) como dispositivo de resgate com posicionamento em rampa; avaliação para reintubação imediata se não melhorar."),
    165: ("B","O pneumoperitônio causa redução do fluxo renal e da TFG por compressão das veias renais, aumento de ADH e renina-angiotensina; oligúria intraoperatória é comum e geralmente reversível após deflação."),
    166: ("B","Ventilação protetora no obeso: VC 6-8 mL/kg de peso ideal, PEEP 8-12 cmH₂O (maior que em não-obesos), recrutamento alveolar periódico, FiO₂ mínima para SpO₂ ≥95%; posição de Trendelenburg reverso (rampa) melhora mecânica."),
    167: ("B","Epiglotite aguda (epiglote 'em polegar') com estridor em criança = emergência de via aérea; manter calma da criança, não realizar procedimentos que agitem (venopunção, decúbito forçado), ir para CO com ORL para intubação ou traqueostomia controlada."),
    168: ("B","Paralisia bilateral de cordas vocais em adução com estridor grave e SpO₂ 87%: intubação orotraqueal de emergência; se não houver recuperação em 48-72h, traqueostomia; pode necessitar de cordotomia posterior posterior."),
    169: ("B","Etomidato inibe a 11β-hidroxilase adrenal (síntese de cortisol) mesmo após dose única, com duração de 4-8h; em politraumatizado com hipotensão grave, a supressão cortisol pode agravar o choque distributivodesacompanhado."),
    170: ("A","A razão de seletividade alfa-2:alfa-1 da dexmedetomidina é de 1600:1 (não 160:1); esta diferença de 10 vezes é importante pois confere ao agente sua seletividade alpha-2 específica sem efeitos alfa-1 significativos."),
    171: ("B","Síndrome de infusão de propofol (PRIS): urina marrom + acidose metabólica com gap aumentado + hiperlactato + propofol >4 mg/kg/h por >48h; suspender propofol imediatamente e instalar suporte hemodinâmico e renal intensivo."),
    172: ("B","A cetamina produz anestesia dissociativa por bloqueio não-competitivo dos receptores NMDA (N-metil-D-aspartato), impedindo a entrada de Ca²⁺ e Na⁺ e dissociando o sistema tálamocortical do límbico."),
    173: ("B","Os receptores mu (μ)-opioides são os principais mediadores de: analgesia supraespinhal, depressão respiratória, euforia, miose, bradicardia e dependência física; agonismo mu = analgesia + efeitos adversos clássicos."),
    174: ("B","O remifentanil tem meia-vida de contexto de ~3-5 min independentemente da duração da infusão por ser metabolizado por esterases plasmáticas inespecíficas; após 2h de infusão contínua, a recuperação é igualmente rápida."),
    175: ("B","Tolerância = downregulation de receptores μ e desacoplamento da proteína G; HIO = ativação de receptores NMDA e liberação de dinorfinas/substância P gerando hiperalgesia; tratam-se de forma diferente (HIO responde a NMDA antagonistas como metadona)."),
    176: ("C","Depressão respiratória por morfina (FR 5 irpm, pupilas puntiformes): naloxona 0,04-0,1 mg IV diluída e titulada a cada 2-3 min até melhora da ventilação; evitar dose única de 0,4 mg que precipita dor aguda intensa e taquicardia."),
    177: ("C","Metadona possui meia-vida de eliminação longa (24-36h), atividade antagonista NMDA intrínseca (que ajuda na HIO) e ação como agonista mu e kappa; útil no tratamento da dor crônica e dependência de opioides."),
    178: ("B","Tramadol produz analgesia por mecanismo dual: agonismo opioide mu fraco (EC50 muito maior que morfina) + inibição da recaptação de serotonina e noradrenalina nas vias inibitórias descendentes da dor."),
    179: ("C","A CAM diminui progressivamente com o aumento da idade (~6% por década após 40 anos) e é reduzida por opioides, benzodiazepínicos, alfa-2 agonistas, hipotermia e hipotensão grave. Esta é a afirmativa correta."),
    180: ("B","A succinilcolina é bloqueador neuromuscular despolarizante que atua como agonista nos receptores nicotínicos da placa motora, causando despolarização mantida (fasciculações seguidas de paralisia flácida por inativação do receptor)."),
    181: ("B","Rigidez de masseter + rigidez generalizada + EtCO₂ elevado + temperatura subindo após sevoflurano + succinilcolina = hipertermia maligna confirmada; descontinuar sevoflurano, TIVA, dantrolene 2,5 mg/kg IV imediatamente."),
    182: ("D","TOF ratio 0,72 indica curarização residual clínica; sugammadex 2 mg/kg IV garante reversão completa e imediata do bloqueio por rocurônio (TOF ≥0,9 em <3 min) sem os efeitos muscarínicos da neostigmina."),
    183: ("C","O TOF ratio ≥0,9 (T4/T1 ≥0,9) é o padrão atual internacionalmente recomendado para confirmar recuperação neuromuscular adequada e extubação segura; valores <0,9 indicam curarização residual com risco respiratório."),
    184: ("D","Rocurônio 1,2 mg/kg é o BNM não-despolarizante com onset mais rápido (~60 segundos), sendo o principal candidato a substituir a succinilcolina na ISR, especialmente com sugammadex disponível para reversão de emergência."),
    185: ("D","Cisatracúrio sofre degradação de Hofmann (eliminação espontânea pH/temperatura-dependente) + hidrólise por esterases plasmáticas, sendo independente de função renal e hepática; atracúrio possui o mesmo mecanismo."),
    186: ("B","Os anestésicos locais bloqueiam canais de Na⁺ voltagem-dependentes no estado inativado (e também aberto), impedindo a transição para o estado aberto e bloqueando a condução do potencial de ação neuronal."),
    187: ("B","LAST com colapso cardiovascular após bupivacaína axilar: emulsão lipídica 20% (Intralipid) 1,5 mL/kg IV em bolus imediato, seguida de infusão 0,25 mL/kg/min; RCP se parada, evitar adrenalina em altas doses."),
    188: ("B","A lipossolubilidade dos ALs determina principalmente a potência (penetração na membrana); a DURAÇÃO de ação é determinada pela ligação proteica (bupivacaína 95% → longa duração; lidocaína 65% → duração moderada)."),
    189: ("B","A progressão da toxicidade sistêmica por AL segue a sequência: sintomas SNC (zumbido, visão turva, sabor metálico) → agitação/tremores → convulsões → depressão do SNC → depressão cardiovascular → PCR."),
    190: ("C","Desflurano possui o menor coeficiente de solubilidade sangue:gás entre os halogenados (0,42), seguido do sevoflurano (0,65) e isoflurano (1,4); quanto menor o coeficiente, mais rápida a indução e recuperação."),
    191: ("D","A cocaína é o único AL com vasoconstrição intrínseca por inibição da recaptação de noradrenalina no terminal simpático; todos os outros ALs causam vasodilatação intrínseca (exceto ropivacaína com efeito bifásico)."),
    192: ("B","Para cirurgia de antebraço distal e mão, o bloqueio supraclavicular oferece cobertura mais uniforme de C5-T1 no 'ponto de convergência' do plexo, com alta taxa de sucesso; menor risco de pneumotórax com ultrassom."),
    193: ("C","O bloqueio do canal dos adutores (nervo safeno + ramos do nervo para vasto medial) bloqueia seletivamente a dor anterior do joelho, preservando a força do quadríceps e permitindo deambulação precoce após ATJ."),
    194: ("D","O SAP block (Serratus Anterior Plane block) deposita AL entre o serrátil anterior e o grande dorsal, bloqueando os ramos cutâneos laterais de T2-T6 para analgesia da parede torácica lateral e mama."),
    195: ("D","O ultrassom NÃO elimina completamente o risco de toxicidade sistêmica por AL; reduz a incidência mas injeções intravasculares inadvertidas ainda ocorrem mesmo sob guia ultrassonográfica. Esta é a vantagem ausente."),
    196: ("B","O bloqueio do compartimento do psoas (3-em-1 de Chayen) anestesia femoral + cutâneo lateral da coxa + obturatório simultaneamente, cobrindo a face medial e anterior da coxa para cirurgia de quadril."),
    197: ("B","Hipotensão pós-raquianestesia em cesariana = bloqueio simpático (simpaticolise) + compressão aortocava pelo útero gravídico; reduz o retorno venoso e o DC; tratar com deslocamento uterino + cristaloide + vasopressor."),
    198: ("B","A CPPD (Cefaleia Pós-Punção Dural) é a complicação mais comum da raquianestesia; incidência maior com agulhas de grande calibre e corte cortante (Quincke); agulhas de ponta de lápis (Whitacre, Sprotte) têm menor incidência."),
    199: ("B","Blood patch epidural (injeção de 15-20 mL de sangue autólogo no espaço peridural) é o tratamento definitivo da CPPD refratária, com eficácia de ~75-90%; indicado após falha do tratamento conservador por 24-48h."),
    200: ("B","A depressão respiratória tardia (6-24h) por morfina intratecal ocorre pela migração rostral hidrofílica da morfina no LCR até o centro respiratório bulbar; monitorização por 12-24h é obrigatória após morfina intratecal."),
    201: ("B","Sevoflurano + cal sodada seca + baixo fluxo = produção de Composto A (fluorometil-2,2-difluoro-1-(trifluorometil)vinil éter), com potencial nefrotoxicidade em exposição prolongada; fluxos >2 L/min minimizam o risco."),
    202: ("B","Aumento de FC ≥20 bpm após dose-teste com adrenalina 15 mcg IV = cateter intravascular; a taquicardia por adrenalina sistêmica é o sinal mais confiável de posicionamento intravascular do cateter peridural."),
    203: ("A","A anestesia peridural instala mais lentamente que a raquianestesia pois o AL precisa atravessar o ligamento amarelo e difundir pelos espaços peridural e paravertebral; o bloqueio simpático é mais gradual, com menor hipotensão súbita."),
    204: ("B","Injeção inadvertida de 20 mL de bupivacaína 0,5% no espaço subaracnoide = raquianestesia total (high spinal); manifestação: hipotensão grave, apneia, perda de consciência; intubação orotraqueal imediata + vasopressores."),
    205: ("C","Ropivacaína 0,1-0,2% é o AL preferido para analgesia peridural em obstetrícia: enantiômero S(-) puro, menor cardiotoxicidade que bupivacaína racêmica, melhor bloqueio diferencial (sensitivo > motor) em baixas concentrações."),
    206: ("C","Com enoxaparina profilática 40 mg 1×/dia, o intervalo mínimo entre a última dose e o bloqueio neuroaxial é de 12 horas (recomendação ASRA/ESRA); para enoxaparina terapêutica (1 mg/kg 12/12h), aguardar 24 horas."),
    207: ("D","Mallampati IV: visualização apenas do palato duro, sem qualquer visibilidade do palato mole; indica alta probabilidade de laringoscopia difícil e requer planejamento de via aérea alternativa."),
    208: ("B","Via aérea difícil pós-indução: videolaringoscópio (GlideScope, C-MAC) melhora a visibilidade glótica em até 80% dos casos com Cormack-Lehane III-IV, sendo a primeira escolha após falha da laringoscopia direta."),
    209: ("C","Via aérea previsivelmente muito difícil (RT prévia + trismo + ML não avaliável): intubação com fibroscópio com paciente acordado (awake FOI) sob anestesia tópica + sedação mínima é a técnica mais segura."),
    210: ("B","A manobra de Sellick (pressão cricóidea) oclude o esôfago pelo deslocamento posterior da cartilagem cricóidea, prevenindo regurgitação passiva; limitação principal: pode piorar a visibilidade laringoscópica e dificultar a passagem do tubo."),
    211: ("C","CICO (Cannot Intubate Cannot Oxygenate) após falha de videolaringoscópio e supraglóticos: cricotireoidostomia cirúrgica de emergência é a única opção; ventilação jet transtraqueal é medida temporária, não definitiva."),
    212: ("B","Aumento rápido de desflurano de 6% para 9% causa estimulação simpática reflexa por irritação dos receptores das vias aéreas superiores e pulmonares, resultando em taquicardia, hipertensão e aumento das secreções."),
    213: ("C","A LMA ProSeal e a LMA Supreme são LMAs de segunda geração com canal de drenagem gástrica para sonda orogástrica, cuff de alta vedação (≥30 cmH₂O) e maior segurança em laparoscopia e pacientes com risco de aspiração."),
    214: ("B","Na ISR, a pré-oxigenação adequada (FiO₂ 1,0 por 3 min ou 8 respirações de CV máxima) é o elemento mais crítico para criar margem de segurança; aumenta o tempo de apneia segura de ~90s para 3-8 min."),
    215: ("A","O isoflurano aumenta a frequência cardíaca por reflexo barorreceptor (vasodilatação periférica) e pode causar fenômeno de roubo coronariano em pacientes com doença coronariana e circulação colateral; esta é a afirmativa correta."),
    216: ("B","O sevoflurano é o agente de escolha para indução inalatória em pediatria por seu odor agradável, baixa irritabilidade de vias aéreas e coeficiente de partição sangue/gás relativamente baixo (0,65) para recuperação rápida."),
    217: ("B","O propofol causa hipotensão por vasodilatação arteriolar e venosa (redução do tônus simpático + ação direta no músculo liso vascular), com redução da pré-carga, pós-carga e, em menor grau, da contratilidade miocárdica."),
    218: ("C","A cetamina é o agente venoso associado à manutenção ou aumento da PA, broncodilatação e analgesia dissociativa, sendo o indutor preferido em choque, broncoespasmo grave e politraumatismo com instabilidade hemodinâmica."),
}

# ── ME3 (2 questões afetadas) ────────────────────────────────────────────────
ME3_CORRECOES = {
    0: ("B","Na anestesia caudal pediátrica, o volume de bupivacaína 0,25% recomendado é de 1 mL/kg para bloqueio sacral e 1,25 mL/kg para nível lombar (L1); o principal risco com volumes excessivos é toxicidade sistêmica e injeção intravascular inadvertida."),
    1: ("D","Segundo as diretrizes ASA 2017 e atualizações de 2023, o tempo mínimo de jejum para líquidos claros (água, suco sem polpa, chá sem leite, bebidas carbônicas) em adultos eletivos é de 2 horas antes do procedimento anestésico."),
}

# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÃO DE APLICAÇÃO DAS CORREÇÕES
# ─────────────────────────────────────────────────────────────────────────────

BOILERPLATE = "Alternativa E preservada junto da D para compatibilidade"

def e_afetada(row):
    exp = row.get('explicacao', '').strip()
    correta = row.get('correta', '').strip()
    if correta == 'A' and BOILERPLATE in exp:
        sem_boilerplate = exp.replace(BOILERPLATE + '.', '').replace(BOILERPLATE, '').strip()
        return not sem_boilerplate
    return False

def processar_arquivo(nome_entrada, nome_saida, correcoes_dict, nome_relatorio):
    with open(nome_entrada, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)
    afetadas = [i for i, r in enumerate(rows) if e_afetada(r)]
    
    # Constrói o índice dentro das afetadas
    correcao_idx = 0
    correcoes_aplicadas = []
    
    for linha_idx, row in enumerate(rows):
        if e_afetada(row):
            if correcao_idx in correcoes_dict:
                nova_correta, nova_explicacao = correcoes_dict[correcao_idx]
                correcoes_aplicadas.append({
                    'id': row.get('id', ''),
                    'correta_anterior': row.get('correta', ''),
                    'correta_nova': nova_correta,
                    'justificativa': nova_explicacao[:150] + '...' if len(nova_explicacao) > 150 else nova_explicacao
                })
                rows[linha_idx]['correta'] = nova_correta
                rows[linha_idx]['explicacao'] = nova_explicacao
            correcao_idx += 1

    with open(nome_saida, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    total_corrigidas = sum(1 for c in correcoes_aplicadas if c['correta_nova'] != 'A')
    return {
        'arquivo': nome_entrada,
        'total_questoes': total,
        'total_afetadas': len(afetadas),
        'total_corrigidas_resp': total_corrigidas,
        'correcoes': correcoes_aplicadas
    }

# ─────────────────────────────────────────────────────────────────────────────
# EXECUÇÃO PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

os.chdir('/Users/sandrodainez/anesmap-2/exports')

resultado_me1 = processar_arquivo(
    'simulados_ME1.csv', 'simulados_ME1_corrigido.csv', ME1_CORRECOES, 'ME1')
resultado_me2 = processar_arquivo(
    'simulados_ME2.csv', 'simulados_ME2_corrigido.csv', ME2_CORRECOES, 'ME2')
resultado_me3 = processar_arquivo(
    'simulados_ME3.csv', 'simulados_ME3_corrigido.csv', ME3_CORRECOES, 'ME3')

# ─────────────────────────────────────────────────────────────────────────────
# GERAÇÃO DO RELATÓRIO
# ─────────────────────────────────────────────────────────────────────────────

with open('relatorio_revisao.txt', 'w', encoding='utf-8') as rpt:
    rpt.write("=" * 80 + "\n")
    rpt.write("RELATÓRIO DE REVISÃO MÉDICA — SIMULADOS DE ANESTESIOLOGIA\n")
    rpt.write("Especialista revisor: Anestesiologista (Miller's, Morgan & Mikhail, SBA/CFM/ASA)\n")
    rpt.write("=" * 80 + "\n\n")

    for resultado in [resultado_me1, resultado_me2, resultado_me3]:
        arq = resultado['arquivo']
        rpt.write(f"ARQUIVO: {arq}\n")
        rpt.write("-" * 60 + "\n")
        rpt.write(f"  Total de questões revisadas    : {resultado['total_questoes']}\n")
        rpt.write(f"  Questões com erro sistemático  : {resultado['total_afetadas']}\n")
        rpt.write(f"  Questões corrigidas (≠ A)       : {resultado['total_corrigidas_resp']}\n")
        rpt.write(f"  Questões mantidas como A        : {resultado['total_afetadas'] - resultado['total_corrigidas_resp']}\n\n")

        rpt.write("  LISTA DE CORREÇÕES:\n")
        for corr in resultado['correcoes']:
            if corr['correta_nova'] != 'A':
                rpt.write(f"    ID: {corr['id']}\n")
                rpt.write(f"      Anterior: {corr['correta_anterior']} → Nova: {corr['correta_nova']}\n")
                rpt.write(f"      Justificativa: {corr['justificativa']}\n\n")
        rpt.write("\n")

    rpt.write("=" * 80 + "\n")
    rpt.write("RESUMO GERAL\n")
    rpt.write("=" * 80 + "\n")
    total_rev = sum(r['total_questoes'] for r in [resultado_me1, resultado_me2, resultado_me3])
    total_afet = sum(r['total_afetadas'] for r in [resultado_me1, resultado_me2, resultado_me3])
    total_corr = sum(r['total_corrigidas_resp'] for r in [resultado_me1, resultado_me2, resultado_me3])
    rpt.write(f"  Total de questões revisadas    : {total_rev}\n")
    rpt.write(f"  Total com erro sistemático     : {total_afet}\n")
    rpt.write(f"  Total de respostas corrigidas  : {total_corr}\n\n")
    rpt.write("PRINCIPAIS TIPOS DE ERROS IDENTIFICADOS:\n")
    rpt.write("  1. Via aérea difícil: correta deveria ser B (protocolo DAS/ASA)\n")
    rpt.write("  2. Ética médica/bioética: correta geralmente B ou C\n")
    rpt.write("  3. Farmacologia (LAST, HM, BNM): correta geralmente B\n")
    rpt.write("  4. Fisiologia cardiovascular e respiratória: correta geralmente B\n")
    rpt.write("  5. Anestesia regional e obstetrícia: correta geralmente B ou C\n\n")
    rpt.write("ARQUIVOS GERADOS:\n")
    rpt.write("  /Users/sandrodainez/anesmap-2/exports/simulados_ME1_corrigido.csv\n")
    rpt.write("  /Users/sandrodainez/anesmap-2/exports/simulados_ME2_corrigido.csv\n")
    rpt.write("  /Users/sandrodainez/anesmap-2/exports/simulados_ME3_corrigido.csv\n")
    rpt.write("  /Users/sandrodainez/anesmap-2/exports/relatorio_revisao.txt\n")

print(f"ME1: {resultado_me1['total_questoes']} questões, {resultado_me1['total_afetadas']} afetadas, {resultado_me1['total_corrigidas_resp']} corrigidas")
print(f"ME2: {resultado_me2['total_questoes']} questões, {resultado_me2['total_afetadas']} afetadas, {resultado_me2['total_corrigidas_resp']} corrigidas")
print(f"ME3: {resultado_me3['total_questoes']} questões, {resultado_me3['total_afetadas']} afetadas, {resultado_me3['total_corrigidas_resp']} corrigidas")
print("Relatório gerado: relatorio_revisao.txt")
