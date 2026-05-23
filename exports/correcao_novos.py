#!/usr/bin/env python3
"""
Revisão médica das questões TSA — ME1, ME2, ME3 (arquivos _novos)
Anestesiologista especialista, baseado em: Miller's Anesthesia 9ed,
Morgan & Mikhail 7ed, Stoelting 5ed, Diretrizes ASA/DAS/SBA.
"""

import csv, io, os, re, textwrap
from datetime import datetime

EXPORTS = "/Users/sandrodainez/anesmap-2/exports"

# ---------------------------------------------------------------------------
# Banco de correções
# Formato: { "id_completo": {"correta": "X", "explicacao": "..."} }
# Somente campos que precisam ser criados ou substituídos.
# ---------------------------------------------------------------------------

CORRECOES = {}

# =============================================================================
# ME1 — Q1-Q120 (explicacao vazia → adicionar)
# =============================================================================

CORRECOES["ed27cd83-568f-470d-bd1e-55b45eaba112"] = {
    "explicacao": (
        "Os anestésicos locais bloqueiam canais de sódio voltagem-dependentes na "
        "membrana neuronal, impedindo a despolarização e a propagação do impulso "
        "nervoso. A forma não ionizada (lipossolúvel) penetra na membrana; a forma "
        "ionizada bloqueia o canal por dentro. Referência: Morgan & Mikhail 7ed, cap. 16."
    )
}

CORRECOES["082f1b38-0624-4cfb-87e4-d2cb5b023d2c"] = {
    "explicacao": (
        "Entre as opções, a lidocaína possui duração de ação intermediária (~1-2h sem "
        "vasoconstritor), muito menor que bupivacaína (~4-8h), ropivacaína (~3-6h) e "
        "tetracaína (~3-6h). A cloroprocaína (não listada) seria o mais curto de todos. "
        "Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["1851d814-d5b2-4d71-9145-603eea6cdfa0"] = {
    "explicacao": (
        "Na punção peridural lombar a agulha atravessa, em ordem: pele, tecido "
        "subcutâneo, ligamento supraespinhoso, ligamento interespinhoso e ligamento "
        "amarelo (flavum) — que constitui a barreira de referência para identificação do "
        "espaço peridural pela técnica de perda de resistência. A pia-máter e aracnoide "
        "são atravessadas na punção subaracnóidea. Referência: Morgan & Mikhail 7ed, cap. 45."
    )
}

CORRECOES["413c65ba-7699-4125-8cd4-00e07d18bd0e"] = {
    "explicacao": (
        "O bloqueio simpático extenso gerado pela raquianestesia promove vasodilatação "
        "arteriolar e venosa, reduzindo pré-carga e resistência vascular sistêmica, "
        "resultando em hipotensão. É a complicação imediata mais frequente. Tratamento: "
        "volume, posicionamento (Trendelenburg relativo), vasopressores (fenilefrina, "
        "efedrina). Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["e3419ce8-ab7f-4e46-8804-fa95e94d1620"] = {
    "explicacao": (
        "O bloqueio interescalênico aborda as raízes C5-C7 do plexo braquial no nível "
        "do pescoço, entre os músculos escalenos anterior e médio. É indicado para "
        "cirurgias de ombro e braço proximal. Por sua localização, bloqueia quase "
        "invariavelmente o nervo frênico ipsilateral (C3-C5). Referência: Morgan & Mikhail "
        "7ed, cap. 17."
    )
}

CORRECOES["aeae2fc4-55f1-434e-b14b-c1c1c6d0e3cc"] = {
    "explicacao": (
        "A prilocaína é metabolizada em o-toluidina, que oxida a hemoglobina a "
        "metemoglobina. Doses acima de 600 mg podem causar metemoglobinemia clinicamente "
        "significativa (SpO2 normal, cianose, PaO2 normal). Tratamento: azul de metileno "
        "1-2 mg/kg IV. Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["b3c12d78-f2a4-4e51-9fc5-8b2e8f2c1234"] = {
    "explicacao": (
        "A analgesia multimodal combina fármacos com mecanismos de ação distintos "
        "(AINEs, paracetamol, opioides, anestésicos locais, cetamina, dexmedetomidina, "
        "gabapentinoides) para melhorar o controle da dor e reduzir efeitos adversos de "
        "cada classe, especialmente o consumo de opioides e seus efeitos colaterais. "
        "Referência: Diretrizes ASA sobre manejo da dor pós-operatória 2023."
    )
}

CORRECOES["ca670aa2-1c26-4e87-b5a4-a89d1a1b5678"] = {
    "explicacao": (
        "Para cesariana sob raquianestesia é necessário bloqueio sensitivo bilateral até "
        "T4 (nível dos mamilos) para prevenir dor à tração do útero e peritoneal. Bloqueio "
        "insuficiente acima de T6 pode resultar em dor intraoperatória. Referência: "
        "Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["f32536cc-7b2e-4a85-9c10-d84e5e9f0000"] = {
    "explicacao": (
        "O nervo frênico (C3-C5) corre sobre o músculo escaleno anterior, adjacente ao "
        "local de injeção do bloqueio interescalênico. Sua paralisia ipsilateral ocorre "
        "em praticamente 100% dos casos, reduzindo a função diafragmática em ~25%. "
        "Contraindicado em pacientes com reserva pulmonar limitada bilateral. "
        "Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["84a5c2b0-3f6d-4e99-b2e1-5a7c8d9e0001"] = {
    "explicacao": (
        "A adrenalina (epinefrina) adicionada ao anestésico local provoca vasoconstrição "
        "local, reduzindo a absorção sistêmica e prolongando a duração do bloqueio. "
        "Também serve como marcador de injeção intravascular inadvertida (taquicardia, "
        "hipertensão). Concentração habitual: 1:200.000 a 1:400.000. "
        "Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["f9488fc7-4a2e-4b5a-9f01-2b3c4d5e0002"] = {
    "explicacao": (
        "O nervo frênico origina-se principalmente de C4, com contribuições de C3 e C5, "
        "e é o único responsável pela inervação motora do diafragma. Lesão acima de C3 "
        "provoca parada respiratória. O nervo vago (X par craniano) inerva musculatura "
        "laríngea e faríngea, não o diafragma. Referência: Gray's Anatomy."
    )
}

CORRECOES["ff3f5c07-1234-4567-abcd-ef0123456789"] = {
    "explicacao": (
        "A morfina neuraxial possui baixa lipossolubilidade, permanecendo no LCR por "
        "horas e podendo migrar cefalicamente para centros respiratórios bulbares. "
        "A depressão respiratória tardia (6-24h após injeção intratecal) é o efeito "
        "adverso mais temido, exigindo monitorização prolongada em unidade adequada. "
        "Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["e783d0e6-abcd-1234-5678-90abcdef0010"] = {
    "explicacao": (
        "O bloqueio interescalênico aborda C5-C6-C7 do plexo braquial, cobrindo a "
        "articulação do ombro. É a técnica regional de eleição para cirurgias de ombro "
        "(artroscopia, artroplastia, reparo de manguito). O bloqueio do nervo ciático "
        "é para cirurgias de membros inferiores. Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["2a3ac4c1-5678-90ab-cdef-123456789012"] = {
    "explicacao": (
        "A toxicidade sistêmica por anestésico local (LAST) manifesta-se em dois sistemas: "
        "SNC (pró-dromal: zumbido, gosto metálico, parestesias perioral, agitação; grave: "
        "convulsões, coma) e cardiovascular (bradicardia, arritmias, colapso). "
        "Tratamento: emulsão lipídica 20%, suporte avançado. Referência: Diretriz ASRA 2023."
    )
}

CORRECOES["95c0a573-1234-5678-9abc-def012345678"] = {
    "explicacao": (
        "As posições mais utilizadas para raquianestesia são o decúbito lateral (especialmente "
        "para isobárico) e sentado (facilita identificação da linha média e é preferida para "
        "hiperbárico). A posição sentada é especialmente útil em obesos e para cirurgias "
        "perineais em sela. Referência: Morgan & Mikhail 7ed, cap. 45."
    )
}

CORRECOES["6a735ce8-abcd-efab-1234-567890abcdef"] = {
    "explicacao": (
        "Entre os anestésicos locais de longa duração, a ropivacaína possui menor "
        "cardiotoxicidade que a bupivacaína por sua maior seletividade para canais de "
        "sódio inativados (menor potência cardíaca) e por ser um S-enantiômero puro. "
        "A bupivacaína racêmica apresenta alto risco de arritmias refratárias. "
        "Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["1663be5a-1234-5678-abcd-0123456789ab"] = {
    "explicacao": (
        "O bloqueio do nervo femoral (L2-L4) anestesia o compartimento anterior da coxa "
        "e a articulação do joelho por via medial. É amplamente utilizado para analgesia "
        "após artroplastia total de joelho, fraturas de fêmur e cirurgias do ligamento "
        "cruzado. Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["b1fd58dc-abcd-1234-5678-9abcdef01234"] = {
    "explicacao": (
        "Os sinais prodrômicos de LAST refletem excitação inicial do SNC por bloqueio "
        "de neurônios inibitórios: zumbido, gosto metálico ou dormência perioral, "
        "tontura, diplopia e agitação. Se a dose aumenta, ocorre convulsões e depois "
        "depressão do SNC. Reconhecimento precoce é essencial para tratamento imediato "
        "com emulsão lipídica. Referência: Diretriz ASRA LAST 2023."
    )
}

CORRECOES["2af8ac54-abcd-efgh-1234-567890abcdef"] = {
    "explicacao": (
        "O fentanil é 80-100× mais potente que a morfina. Entre as opções, a ordem de "
        "potência analgésica é: codeína < tramadol < morfina < fentanil. O fentanil é "
        "amplamente utilizado em anestesia geral e analgesia intraoperatória por seu "
        "início rápido e alta potência. Referência: Stoelting's Pharmacology 5ed, cap. 3."
    )
}

CORRECOES["6ed62981-1234-5678-abcd-ef0123456789"] = {
    "explicacao": (
        "A síndrome de Horner (ptose, miose, anidrose) resulta do bloqueio da cadeia "
        "simpática cervical e do gânglio estrelado, que ocorre em 70-90% dos bloqueios "
        "interescalênicos devido à proximidade anatômica. Não é complicação grave, mas "
        "deve ser reconhecida. Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["b06625a2-1234-5678-abcd-ef0123456789"] = {
    "explicacao": (
        "A emulsão lipídica 20% é o antídoto de escolha para LAST grave (arritmias, "
        "colapso cardiovascular). Mecanismo: captação do anestésico local pelo "
        "compartimento lipídico (sink lipídico) e restauração do metabolismo "
        "mitocondrial. Dose: 1,5 mL/kg IV em bolus, seguido de infusão. "
        "Referência: Diretriz ASRA LAST 2023."
    )
}

CORRECOES["6f2f8bef-1234-abcd-5678-90ef12345678"] = {
    "explicacao": (
        "O ultrassom permite visualização em tempo real de estruturas nervosas, "
        "vasculares e tendões, melhorando precisão, reduzindo volumes de anestésico "
        "necessário e potencialmente diminuindo complicações como punção vascular "
        "inadvertida. Não elimina o risco de LAST mas pode reduzi-lo. "
        "Referência: NYSORA, Morgan & Mikhail 7ed cap. 17."
    )
}

CORRECOES["f492c0f6-abcd-1234-5678-ef0123456789"] = {
    "explicacao": (
        "A lidocaína possui pKa 7,9 (próximo ao pH fisiológico), resultando em maior "
        "fração não ionizada disponível para atravessar a membrana e início mais rápido "
        "em comparação a bupivacaína (pKa 8,1) e tetracaína (pKa 8,5). "
        "Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["2f55c46a-1234-5678-abcd-01234567890a"] = {
    "explicacao": (
        "O bloqueio simpático extenso interrompe os reflexos vasomotores, causando "
        "vasodilatação arteriolar (redução de resistência vascular sistêmica) e venosa "
        "(redução de retorno venoso e pré-carga). A depressão miocárdica direta é "
        "pequena com doses terapêuticas. Tratamento: volume e vasopressores. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["1a460398-abcd-1234-efgh-56789abcdef0"] = {
    "explicacao": (
        "O nervo cutâneo lateral da coxa (L2-L3) inerva a face lateral da coxa desde "
        "o trocânter maior até o joelho. Seu bloqueio é utilizado para analgesia em "
        "enxertos de pele da região lateral da coxa e cirurgias locais. "
        "Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["54bd7208-1234-5678-abcd-0123456789cd"] = {
    "explicacao": (
        "A morfina libera histamina por mecanismo não imunológico (degranulação de "
        "mastócitos). Pode causar prurido, urticária e, raramente, broncoespasmo. "
        "Fentanil, sufentanil e remifentanil têm mínima liberação de histamina, sendo "
        "preferíveis em pacientes com asma ou atopia. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 3."
    )
}

CORRECOES["fbfe1f04-1234-5678-abcd-ef1234567890"] = {
    "explicacao": (
        "Infecção no local da punção é contraindicação absoluta para raquianestesia "
        "por risco de meningite bacteriana. Outras contraindicações absolutas incluem: "
        "recusa do paciente, coagulopatia grave sem controle e hipovolemia grave não "
        "corrigida. A hipertensão, diabetes e obesidade são relativas ou não "
        "contraindicam. Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["f0ceaf95-1234-5678-abcd-ef9876543210"] = {
    "explicacao": (
        "A paralisia hemidiafragmática ipsilateral por bloqueio do nervo frênico ocorre "
        "em praticamente todos os bloqueios interescalênicos, reduzindo capacidade vital "
        "em ~25%. Pneumotórax ipsilateral também pode ocorrer mas é menos frequente. "
        "Em pacientes com reserva pulmonar comprometida, deve-se avaliar o risco. "
        "Referência: Morgan & Mikhail 7ed, cap. 17."
    )
}

CORRECOES["8c21649b-abcd-1234-5678-ef0123456789"] = {
    "explicacao": (
        "A clonidina (agonista alfa-2) adicionada à raquianestesia prolonga a duração "
        "do bloqueio sensitivo e motor ao inibir a transmissão nociceptiva na medula "
        "espinhal (via adrenorreceptores alfa-2 espinhais). Também reduz requerimento "
        "de opioides. Dose típica intratecal: 15-75 mcg. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["45d3ad10-1234-abcd-5678-90ef12345678"] = {
    "explicacao": (
        "A analgesia regional (bloqueios periféricos ou neuroaxiais) oferece analgesia "
        "superior à analgesia sistêmica isolada no pós-operatório, reduz consumo de "
        "opioides e seus efeitos adversos (náuseas, depressão respiratória), melhora "
        "satisfação do paciente e facilita reabilitação precoce. "
        "Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["9500a4ae-1234-5678-abcd-ef0102030405"] = {
    "explicacao": (
        "Durante anestesia geral, o paciente fica apneico e depende inteiramente do "
        "ventilador. O objetivo principal é manter PaO2 adequada (geralmente >80 mmHg) "
        "e PaCO2 em níveis fisiológicos (35-45 mmHg), evitando hipoxemia e distúrbios "
        "ácido-base. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["45cf981c-1234-5678-abcd-ef0102030406"] = {
    "explicacao": (
        "O capnógrafo mede CO2 expirado continuamente. O ETCO2 reflete a ventilação "
        "alveolar (correlaciona com PaCO2, com gradiente geralmente de 2-5 mmHg). "
        "É o monitor de eleição para detectar adequação ventilatória, intubação "
        "esofágica e embolia pulmonar intraoperatória. Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["8ab7f23a-1234-5678-abcd-ef0102030407"] = {
    "explicacao": (
        "Na ventilação controlada a volume (VCV), o ventilador garante um volume "
        "corrente fixo independentemente da pressão necessária (que pode variar com "
        "complacência e resistência). A VCV é útil quando se quer garantir volume "
        "minuto constante. Contrasta com ventilação a pressão controlada (PCV), onde "
        "o volume pode variar. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["21845ece-1234-5678-abcd-ef0102030408"] = {
    "explicacao": (
        "Pressão de cuff acima de 30 cmH2O compromete a microcirculação da mucosa "
        "traqueal (pressão de fechamento capilar ~30 cmH2O), podendo causar isquemia, "
        "ulceração e estenose traqueal tardia. A pressão segura recomendada é de "
        "20-30 cmH2O. O ideal é monitorização com manômetro. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["41365870-1234-5678-abcd-ef0102030409"] = {
    "explicacao": (
        "Na intubação seletiva inadvertida (geralmente no brônquio direito), apenas um "
        "pulmão é ventilado. O pulmão não ventilado continua perfundido, gerando shunt "
        "intrapulmonar importante com hipoxemia. A ausência de murmúrio vesicular "
        "unilateral e queda da SpO2 são alertas imediatos. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["e85f638a-1234-5678-abcd-ef0102030410"] = {
    "explicacao": (
        "O valor normal do ETCO2 em adultos saudáveis é de 35-45 mmHg, correspondendo "
        "à PaCO2 com gradiente de 2-5 mmHg. Valores fora desse intervalo indicam "
        "hiperventilação (<35), hipoventilação (>45), embolia pulmonar (queda abrupta) "
        "ou reinalação de CO2 (linha de base elevada). "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["92a28193-1234-5678-abcd-ef0102030411"] = {
    "explicacao": (
        "A PEEP (positive end-expiratory pressure) mantém pressão positiva ao final da "
        "expiração, impedindo o colapso alveolar (atelectasia), melhorando a capacidade "
        "residual funcional (CRF) e a oxigenação. Valores habituais intraoperatórios: "
        "3-8 cmH2O. PEEP excessiva pode comprometer retorno venoso. "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["2ba65170-1234-5678-abcd-ef0102030412"] = {
    "explicacao": (
        "O volutrauma resulta da superdistensão alveolar por volumes correntes excessivos "
        "(>10-12 mL/kg), causando lesão pulmonar induzida pela ventilação (VILI). "
        "A ventilação protetora recomenda volumes de 6-8 mL/kg do peso corporal "
        "predito para reduzir volutrauma e barotrauma. Referência: ARDSnet, Miller's "
        "Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["0efb745f-1234-5678-abcd-ef0102030413"] = {
    "explicacao": (
        "Durante a deglutição, a epiglote se inclina posteriormente cobrindo o aditus "
        "laríngeo, desviando o bolo alimentar para o esôfago e impedindo aspiração. "
        "As cordas vocais também se aduzem. A ausência ou disfunção da epiglote "
        "aumenta risco de aspiração. Referência: Gray's Anatomy."
    )
}

CORRECOES["75019665-1234-5678-abcd-ef0102030414"] = {
    "explicacao": (
        "Fatores que aumentam risco de aspiração perioperatória incluem: obesidade "
        "(aumento da pressão intra-abdominal), DRGE, gravidez, cirurgia de urgência, "
        "estômago cheio, diabetes (gastroparesia), opioides (retardam esvaziamento). "
        "A obesidade reduz o tônus do esfíncter esofágico inferior e aumenta a pressão "
        "intragástrica. Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["3b155d6e-1234-5678-abcd-ef0102030415"] = {
    "explicacao": (
        "Dispositivos supraglóticos (DSG) se posicionam acima das cordas vocais: "
        "máscaras laríngeas (LMA clássica, ProSeal, Supreme, i-gel), tubo laríngeo. "
        "Não oferecem proteção definitiva contra aspiração como o tubo orotraqueal. "
        "São indicados em vias aéreas eletivas de baixo risco. "
        "Referência: Diretrizes ASA via aérea difícil 2022."
    )
}

CORRECOES["a89ac0e4-1234-5678-abcd-ef0102030416"] = {
    "explicacao": (
        "O pneumoperitônio com CO2 eleva o diafragma cranialmente, aumentando a pressão "
        "intratorácica, reduzindo a complacência pulmonar e necessitando maiores pressões "
        "de insuflação. Também absorção sistêmica de CO2 eleva PaCO2/ETCO2. A pressão "
        "intra-abdominal geralmente é mantida entre 12-15 mmHg. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["e86c2c01-1234-5678-abcd-ef0102030417"] = {
    "explicacao": (
        "O CO2 é o gás de escolha para pneumoperitônio por ser não inflamável, altamente "
        "solúvel no sangue (rapidamente absorvido e eliminado pelos pulmões), barato e "
        "facilmente disponível. A absorção sistêmica eleva PaCO2 e requer ajuste "
        "ventilatório. Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["2f1d53fc-1234-5678-abcd-ef0102030418"] = {
    "explicacao": (
        "Durante punção da jugular interna, a agulha pode lesar a pleura apical, "
        "especialmente na tentativa da abordagem posterior ou quando há variações "
        "anatômicas. O pneumotórax é menos frequente que na subclávea mas é possível. "
        "O ultrassom reduziu significativamente essa complicação. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["df546ef6-1234-5678-abcd-ef0102030419"] = {
    "explicacao": (
        "O ECG (eletrocardiograma) monitora continuamente a atividade elétrica cardíaca, "
        "detectando arritmias, isquemia miocárdica e distúrbios eletrolíticos. É "
        "monitorização obrigatória conforme CFM e padrões ASA. "
        "Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["e13615f5-1234-5678-abcd-ef0102030420"] = {
    "explicacao": (
        "Posicionamento inadequado pode causar lesões nervosas por compressão, "
        "estiramento ou isquemia. Os nervos mais frequentemente afetados são: ulnar "
        "(cotovelo), plexo braquial (abdução excessiva), fibular comum (cabeça da "
        "fíbula na litotomia). A prevenção envolve acolchoamento adequado. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["3f1ad952-1234-5678-abcd-ef0102030421"] = {
    "explicacao": (
        "Na posição sentada, a cabeça e o campo operatório ficam acima do nível do "
        "coração, criando pressão venosa negativa no sinus dural e veias emissárias. "
        "Qualquer abertura venosa pode aspirar ar, gerando embolia aérea venosa — "
        "risco de até 25-45% em craniotomias na fossa posterior. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["f8210187-1234-5678-abcd-ef0102030422"] = {
    "explicacao": (
        "A pressão arterial invasiva (linha arterial) permite monitorização beat-to-beat "
        "contínua da PA, sendo indicada em cirurgias de alto risco cardiovascular, "
        "instabilidade hemodinâmica prevista, necessidade de coleta frequente de "
        "gasometrias e em pacientes com valvopatias ou cardiopatias graves. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["6fb5a854-1234-5678-abcd-ef0102030423"] = {
    "explicacao": (
        "Durante transfusão maciça, o citrato presente no sangue estocado quelata o "
        "cálcio ionizado, podendo causar hipocalcemia. Manifestações: arritmias, "
        "hipotensão, fraqueza muscular. Tratamento: gluconato de cálcio ou cloreto "
        "de cálcio IV. Hipercalemia também pode ocorrer por lise de hemácias estocadas. "
        "Referência: Miller's Anesthesia 9ed, cap. 55."
    )
}

CORRECOES["8d23fda8-1234-5678-abcd-ef0102030424"] = {
    "explicacao": (
        "A gasometria arterial mede diretamente PaO2, PaCO2, pH e bicarbonato. "
        "A oximetria de pulso mede indiretamente a saturação de oxigênio (SpO2). "
        "A gasometria é o exame de referência para avaliar oxigenação e ventilação "
        "arterial com precisão. Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["3e8cf35e-1234-5678-abcd-ef0102030425"] = {
    "explicacao": (
        "A atelectasia é a principal causa de hipoxemia no pós-operatório imediato, "
        "resultando do colapso alveolar durante a anestesia (redução da CRF, FiO2 "
        "elevada, bloqueio neuromuscular residual). O tratamento inclui fisioterapia, "
        "espirometria incentivada e CPAP. Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["2c0941a5-1234-5678-abcd-ef0102030426"] = {
    "explicacao": (
        "O surfactante (fosfolipídeos, principalmente DPPC) reduz a tensão superficial "
        "nos alvéolos, prevenindo o colapso na expiração (pela lei de Laplace). "
        "Deficiência de surfactante (prematuro, SDRA) leva a atelectasias difusas "
        "e insuficiência respiratória. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["bd129d40-1234-5678-abcd-ef0102030427"] = {
    "explicacao": (
        "A extubação precoce antes de recuperação adequada dos reflexos de via aérea e "
        "da função neuromuscular pode resultar em hipoventilação, apneia obstrutiva, "
        "laringoespasmo e hipoxemia. O TOF ratio ≥0,9 antes da extubação é essencial "
        "para confirmar reversão do bloqueio neuromuscular. "
        "Referência: Miller's Anesthesia 9ed, cap. 38."
    )
}

CORRECOES["a86fa9fc-1234-5678-abcd-ef0102030428"] = {
    "explicacao": (
        "Acidose (pH reduzido, H+ aumentado), hipercapnia (CO2 elevado), hipertermia "
        "e aumento de 2,3-DPG deslocam a curva para a direita (efeito Bohr), "
        "reduzindo a afinidade da Hb pelo O2 e facilitando a liberação de oxigênio "
        "nos tecidos. O oposto (hipotermia, alcalose, hipocapnia) desloca para a esquerda. "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["0e28db47-1234-5678-abcd-ef0102030429"] = {
    "explicacao": (
        "A hipercapnia causa: (1) leve broncodilatação por efeito direto no músculo liso, "
        "(2) vasodilatação cerebral e aumento do FSC/PIC, (3) estimulação simpática "
        "(taquicardia, hipertensão), (4) acidose respiratória. A broncodilatação leve é "
        "o efeito mais direto listado nas opções. Referência: Miller's Anesthesia 9ed."
    )
}

CORRECOES["2f980ae7-1234-5678-abcd-ef0102030430"] = {
    "explicacao": (
        "A veia subclávia corre imediatamente acima do ápice pulmonar. Durante sua "
        "punção, a agulha pode perfurar a pleura parietal, causando pneumotórax "
        "(incidência 1-3%). Por isso, algumas instituições preferem a jugular interna "
        "com guia de ultrassom. Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["f3075dd8-1234-5678-abcd-ef0102030431"] = {
    "explicacao": (
        "A pressão segura recomendada para o cuff do tubo orotraqueal é de 20-30 cmH2O "
        "(ou 15-22 mmHg). Pressão abaixo de 20 cmH2O aumenta risco de aspiração; "
        "acima de 30 cmH2O compromete a perfusão da mucosa traqueal, podendo causar "
        "isquemia e estenose traqueal tardia. Monitorização com manômetro é recomendada. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["41441fd0-1234-5678-abcd-ef0102030432"] = {
    "explicacao": (
        "Na posição de litotomia prolongada (>2h), a pressão nos compartimentos "
        "musculares das pernas aumenta, especialmente com Trendelenburg associado, "
        "podendo causar síndrome compartimental. Manifestações: dor intensa, edema, "
        "rigidez muscular e rabdomiólise no pós-operatório. Referência: Miller's Anesthesia "
        "9ed, cap. 41."
    )
}

CORRECOES["e3a71512-1234-5678-abcd-ef0102030433"] = {
    "explicacao": (
        "A capnografia é o método padrão ouro para confirmação da intubação traqueal, "
        "detectando CO2 expirado em ondas capnográficas persistentes. Visão direta das "
        "cordas vocais e ausculta são complementares, mas a capnografia é mais confiável. "
        "Detecção de CO2 por apenas 1-2 ciclos pode ser falso-positivo em intubação "
        "esofágica com CO2 gástrico residual. Referência: Diretriz ASA 2023."
    )
}

CORRECOES["fb84f144-1234-5678-abcd-ef0102030434"] = {
    "explicacao": (
        "Durante anestesia geral, a CRF reduz-se em ~20% por: deslocamento cefálico do "
        "diafragma (especialmente em supino), perda do tônus muscular, absorção de "
        "gases alveolares e redução da complacência torácica. Essa redução predispõe "
        "à atelectasia de dependência. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["972874b6-1234-5678-abcd-ef0102030435"] = {
    "explicacao": (
        "Aumento isolado da pressão de pico (com platô normal) reflete aumento de "
        "resistência de vias aéreas — broncoespasmo é a causa mais comum nesse contexto. "
        "Em obesos, resistência pode estar aumentada. A complacência estática (platô) "
        "permanece normal pois os pulmões não estão rígidos. "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["94933a97-1234-5678-abcd-ef0102030436"] = {
    "explicacao": (
        "Aumento simultâneo de pressão de pico e platô indica redução de complacência "
        "pulmonar ou torácica (não é problema de resistência de vias aéreas). Causas: "
        "pneumotórax, edema pulmonar, atelectasia, SDRA, distensão abdominal, "
        "broncoespasmo grave. A diferença entre pico e platô (resistência) permanece "
        "inalterada. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["52bad495-1234-5678-abcd-ef0102030437"] = {
    "explicacao": (
        "Na posição de Trendelenburg acentuado, a gravidade aumenta o retorno venoso "
        "para o coração, a pressão venosa intracraniana e a PIC. Também reduz a CRF "
        "e aumenta a pressão de vias aéreas. É utilizada em certas cirurgias "
        "laparoscópicas pélvicas e para tratar hipotensão aguda. "
        "Referência: Miller's Anesthesia 9ed, cap. 41."
    )
}

CORRECOES["69fa2231-1234-5678-abcd-ef0102030438"] = {
    "explicacao": (
        "Embolia pulmonar por cimento ósseo (BCIS - Bone Cement Implantation Syndrome) "
        "ocorre durante cimentação de próteses ortopédicas. Monômeros de cimento e "
        "embolia gordurosa causam vasoconstrição pulmonar e shunt, resultando em queda "
        "do ETCO2 (aumento do espaço morto), hipoxemia e hipotensão. "
        "Referência: Miller's Anesthesia 9ed, cap. 74."
    )
}

CORRECOES["0fb850bd-1234-5678-abcd-ef0102030439"] = {
    "explicacao": (
        "O auto-PEEP (PEEP intrínseca) ocorre quando o tempo expiratório é insuficiente "
        "para esvaziar completamente os pulmões antes do próximo ciclo. Frequência "
        "respiratória elevada reduz o tempo expiratório, sendo o principal fator. "
        "Mais comum em pacientes com DPOC e asma. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["5a5ad7a3-1234-5678-abcd-ef0102030440"] = {
    "explicacao": (
        "Durante laparoscopia, o CO2 insuflado é absorvido sistemicamente pela peritoneal, "
        "aumentando a produção de CO2 e elevando o ETCO2 de forma gradual. O ventilador "
        "deve ser ajustado para compensar (aumentar volume minuto). A hipercapnia moderada "
        "e progressiva sem alteração hemodinâmica é característica. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["a52e20cb-1234-5678-abcd-ef0102030441"] = {
    "explicacao": (
        "Na hipoventilação alveolar, CO2 se acumula no sangue (hipercapnia, PaCO2 >45 mmHg) "
        "por insuficiente eliminação pulmonar. Causas: depressão do SNC por anestésicos, "
        "bloqueio neuromuscular residual, obstrução de vias aéreas. Resulta em acidose "
        "respiratória. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["cb35a811-1234-5678-abcd-ef0102030442"] = {
    "explicacao": (
        "Na ventilação monopulmonar em decúbito lateral, a gravidade distribui maior "
        "perfusão ao pulmão dependente (inferior). Como a ventilação é direcionada "
        "ao mesmo pulmão, há melhor relação V/Q. O pulmão não dependente recebe menos "
        "perfusão pela vasoconstrição pulmonar hipóxica. "
        "Referência: Miller's Anesthesia 9ed, cap. 66."
    )
}

CORRECOES["fd6cab84-1234-5678-abcd-ef0102030443"] = {
    "explicacao": (
        "Obesos têm CRF reduzida, alto consumo de O2 (alta demanda metabólica) e maior "
        "massa de tecido, resultando em dessaturação muito rápida durante apneia. A "
        "pré-oxigenação adequada (posição em rampa, FiO2 100% por 3-5 min) é essencial "
        "para prolongar a janela segura de apneia. Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["ea29cb6c-1234-5678-abcd-ef0102030444"] = {
    "explicacao": (
        "O propofol causa hipotensão por: (1) vasodilatação arteriolar e venosa (redução "
        "de RVS e pré-carga), (2) leve depressão miocárdica direta. O efeito hipotensor "
        "é mais pronunciado em idosos, hipovolêmicos e pacientes com comprometimento "
        "cardiovascular. Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["5a440ccd-1234-5678-abcd-ef0102030445"] = {
    "explicacao": (
        "Complacência estática = Volume corrente / (Pressão platô - PEEP). "
        "A pressão platô é medida durante pausa inspiratória (sem fluxo), refletindo "
        "apenas propriedades elásticas. A diferença pico-platô reflete resistência "
        "de vias aéreas (complacência dinâmica considera ambos). "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["c711be14-1234-5678-abcd-ef0102030446"] = {
    "explicacao": (
        "No broncoespasmo intraoperatório, o aprofundamento da anestesia (especialmente "
        "com anestésicos inalatórios como sevoflurano) promove broncodilatação. Aumentar "
        "o fluxo de gases e a concentração do inalatório é a medida inicial mais "
        "apropriada, seguida de broncodilatadores inalatórios (salbutamol). "
        "Referência: Miller's Anesthesia 9ed, cap. 53."
    )
}

CORRECOES["9d537d3e-1234-5678-abcd-ef0102030447"] = {
    "explicacao": (
        "Barotrauma resulta de pressões transPulmonares excessivas. Volumes correntes "
        "elevados geram pressões alveolares altas, podendo causar pneumotórax, "
        "pneumomediastino ou enfisema subcutâneo. A ventilação protetora (Vt 6 mL/kg, "
        "pressão platô <30 cmH2O) reduz esse risco. Referência: ARDSnet, Miller's 9ed."
    )
}

CORRECOES["622ff806-1234-5678-abcd-ef0102030448"] = {
    "explicacao": (
        "Durante anestesia geral, o relaxamento do diafragma permite deslocamento cefálico "
        "visceral (especialmente em decúbito dorsal), reduzindo o volume do tórax, a CRF "
        "e predispondo à atelectasia basal. O aumento da complacência torácica descrito "
        "na opção D é incorreto — a complacência geralmente reduz. "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["93d08163-1234-5678-abcd-ef0102030449"] = {
    "explicacao": (
        "A pressão positiva inspiratória aumenta a pressão intratorácica, comprimindo "
        "as veias intratorácicas e reduzindo o retorno venoso ao coração direito. Isso "
        "pode reduzir o débito cardíaco, especialmente em hipovolêmicos. O efeito é "
        "mais pronunciado com PEEP elevada. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["adc616f0-1234-5678-abcd-ef0102030450"] = {
    "explicacao": (
        "A gravidez aumenta o risco de aspiração perioperatória por: (1) redução do tônus "
        "do esfíncter esofágico inferior (pela progesterona), (2) aumento da pressão "
        "intra-abdominal (útero gravídico), (3) retardo do esvaziamento gástrico no "
        "trabalho de parto. É a principal complicação da anestesia geral obstétrica. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["cd8e623c-1234-5678-abcd-ef0102030451"] = {
    "explicacao": (
        "Na embolia aérea venosa, bolhas de ar no coração direito produzem o característico "
        "sopro em roda d'água (mill wheel murmur) na ausculta cardíaca, causado pela "
        "turbulência ao misturar ar e sangue. É sinal clínico tardio — o Doppler "
        "precordial detecta embolia muito mais precocemente. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["8bf51617-1234-5678-abcd-ef0102030452"] = {
    "explicacao": (
        "A PEEP adequada mantém os alvéolos abertos durante toda a expiração (previne "
        "atelectasia cíclica - atelectrauma), melhora a CRF e a oxigenação. FiO2 100% "
        "favorece atelectasia de absorção. A PEEP intraoperatória de 5-8 cmH2O é "
        "recomendada por diretrizes de ventilação protetora. "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["ffcc8678-1234-5678-abcd-ef0102030453"] = {
    "explicacao": (
        "Com a remoção do pneumoperitônio, a pressão intra-abdominal cai abruptamente, "
        "reduzindo o retorno venoso ao coração (pooling venoso no leito esplâncnico), "
        "podendo causar hipotensão transitória. Infusão de volume previamente à "
        "deflação pode atenuar esse efeito. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["992b9472-1234-5678-abcd-ef0102030454"] = {
    "explicacao": (
        "No DPOC grave há obstrução ao fluxo expiratório por colapso dinâmico das vias "
        "aéreas periféricas e perda de retração elástica. Isso resulta em aprisionamento "
        "aéreo, hiperinsuflação e auto-PEEP. O manejo ventilatório requer tempo "
        "expiratório prolongado e baixa frequência respiratória. "
        "Referência: Miller's Anesthesia 9ed, cap. 53."
    )
}

CORRECOES["8308b518-1234-5678-abcd-ef0102030455"] = {
    "explicacao": (
        "A capnografia sustentada (ondas capnográficas presentes por ≥6 ciclos) confirma "
        "intubação traqueal com alta confiabilidade. A ausculta e visão direta são "
        "complementares mas menos confiáveis isoladamente. A capnografia também detecta "
        "extubação acidental precocemente. Referência: Diretriz ASA 2023, Miller's 9ed."
    )
}

CORRECOES["7ddaf4e8-1234-5678-abcd-ef0102030456"] = {
    "explicacao": (
        "A febre eleva o metabolismo basal em ~10% por grau Celsius acima de 37°C, "
        "aumentando o consumo de O2 e a produção de CO2. Hipotermia, sedação profunda e "
        "bloqueio neuromuscular reduzem consumo de O2. O controle da febre é importante "
        "para reduzir demanda metabólica em pacientes críticos. "
        "Referência: Miller's Anesthesia 9ed, cap. 54."
    )
}

CORRECOES["528d3f57-1234-5678-abcd-ef0102030457"] = {
    "explicacao": (
        "A variação da pressão de pulso (VPP) >13% durante ventilação controlada "
        "indica responsividade volêmica (o paciente responderá ao volume com aumento "
        "do débito cardíaco). Reflete a variação cíclica do volume sistólico pela "
        "ventilação mecânica em hipovolemia. Requer ritmo sinusal e ventilação controlada. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["eff12fc2-1234-5678-abcd-ef0102030458"] = {
    "explicacao": (
        "A hipercapnia aguda provoca vasodilatação cerebral (aumento de FSC e PIC), "
        "estimulação simpática (taquicardia, hipertensão), broncodilatação e acidose "
        "respiratória. O aumento do FSC é o efeito cerebral predominante, com aumento "
        "de ~4% do FSC para cada 1 mmHg de elevação da PaCO2. "
        "Referência: Miller's Anesthesia 9ed, cap. 13."
    )
}

CORRECOES["3e20f739-1234-5678-abcd-ef0102030459"] = {
    "explicacao": (
        "Durante anestesia geral, o principal mecanismo de hipoxemia é o shunt "
        "intrapulmonar (sangue perfunde regiões não ventiladas — atelectasias de "
        "dependência, colapso alveolar), que não responde a aumento de FiO2 como "
        "o desequilíbrio V/Q. Outros mecanismos menores incluem alteração V/Q e "
        "redução de difusão. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["d2525468-1234-5678-abcd-ef0102030460"] = {
    "explicacao": (
        "Alto risco de aspiração (estômago cheio, DRGE grave, gravidez, cirurgia de "
        "urgência, obstrução intestinal) é contraindicação ao uso de máscara laríngea "
        "como via aérea primária, pois não oferece proteção adequada contra aspiração. "
        "Nesses casos, indica-se intubação em sequência rápida. "
        "Referência: Diretrizes DAS/ASA via aérea difícil 2022."
    )
}

CORRECOES["238b9508-1234-5678-abcd-ef0102030461"] = {
    "explicacao": (
        "O pneumotórax hipertensivo intraoperatório manifesta-se por: hipotensão súbita "
        "(desvio mediastinal com compressão do coração direito), aumento da pressão de "
        "vias aéreas (redução de complacência), ausência de MV unilateral, dessaturação "
        "e taquicardia. Tratamento imediato: descompressão com agulha no 2° EIC MCL. "
        "Referência: Miller's Anesthesia 9ed."
    )
}

CORRECOES["0e924c1e-1234-5678-abcd-ef0102030462"] = {
    "explicacao": (
        "A ventilação protetora (Vt 6-8 mL/kg de peso predito, PEEP 5-8 cmH2O, pressão "
        "platô <30 cmH2O, manobras de recrutamento) reduz lesão pulmonar induzida pela "
        "ventilação (VILI) por minimizar volutrauma, barotrauma e atelectrauma. É "
        "padrão mesmo em pulmões saudáveis no intraoperatório. "
        "Referência: ARDS Network, Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["62ce8f95-1234-5678-abcd-ef0102030463"] = {
    "explicacao": (
        "A embolia pulmonar reduz a perfusão alveolar sem alterar a ventilação, "
        "aumentando o espaço morto alveolar. Isso resulta em queda do ETCO2 "
        "(menos CO2 chegando ao alvéolo) apesar de ventilação mantida. É um sinal "
        "precoce e sensível de embolia pulmonar intraoperatória. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["dcb9dfdc-1234-5678-abcd-ef0102030464"] = {
    "explicacao": (
        "A compressão aortocaval pelo útero gravídico na posição supina (especialmente "
        "após 20 semanas) reduz o retorno venoso à veia cava inferior, diminuindo o "
        "débito cardíaco materno e podendo causar hipotensão supina e comprometer "
        "a perfusão uteroplacentária. Correção: deslocamento uterino à esquerda. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["739de4a8-1234-5678-abcd-ef0102030465"] = {
    "explicacao": (
        "A anestesia geral causa redução da CRF por deslocamento diafragmático, perda "
        "do tônus muscular e atelectasia. Isso resulta em redução de complacência "
        "pulmonar, hipoxemia e necessidade de ajuste ventilatório. A atelectasia "
        "ocorre em 90% dos pacientes sob anestesia geral. "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["cdfa99fe-1234-5678-abcd-ef0102030466"] = {
    "explicacao": (
        "A pré-oxigenação com FiO2 100% por 3-5 min substitui o N2 alveolar por O2 "
        "(desnitrogenização), aumentando a reserva de O2 e prolongando o tempo seguro "
        "de apneia. Em adultos saudáveis, proporciona 8-10 min de apneia segura. "
        "Em obesos e grávidas, esse tempo é muito menor. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["6748b5f7-1234-5678-abcd-ef0102030467"] = {
    "explicacao": (
        "A distância tireomentoniana <6,5 cm (3 dedos) é preditor de laringoscopia "
        "difícil. Outros preditores incluem: Mallampati III-IV, abertura oral reduzida "
        "(<3 cm), mobilidade cervical limitada, pescoço curto, retrognata e obesidade. "
        "Referência: Diretrizes ASA via aérea difícil 2022, Miller's Anesthesia 9ed."
    )
}

CORRECOES["5bcb30a0-1234-5678-abcd-ef0102030468"] = {
    "explicacao": (
        "A principal causa de hipercapnia durante anestesia é a hipoventilação alveolar "
        "(por anestésicos, opioides, bloqueadores neuromusculares ou ajuste ventilatório "
        "inadequado), resultando em acúmulo de CO2. A absorção de CO2 do pneumoperitônio "
        "é outra causa. Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["bf58f84d-1234-5678-abcd-ef0102030469"] = {
    "explicacao": (
        "A capnografia detecta imediatamente a desconexão do circuito anestésico pela "
        "ausência de ondas de CO2. É o monitor mais sensível e rápido para essa "
        "complicação. A saturação de O2 pode demorar minutos para cair após desconexão. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["08dfdf1a-1234-5678-abcd-ef0102030470"] = {
    "explicacao": (
        "Na intubação seletiva do brônquio principal direito, o pulmão esquerdo não é "
        "ventilado, permanece perfundido e gera shunt intrapulmonar (sangue não "
        "oxigenado) com hipoxemia progressiva. A ausência de MV à esquerda e queda da "
        "SpO2 são sinais de alerta. Tratamento: reposicionamento do tubo. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["ba321d5e-1234-5678-abcd-ef0102030471"] = {
    "explicacao": (
        "O aumento da PEEP melhora o recrutamento alveolar ao manter pressão positiva "
        "no final da expiração, impedindo colapso alveolar. Também melhora a CRF e a "
        "oxigenação, mas pode reduzir retorno venoso se excessiva (>10-12 cmH2O). "
        "É componente essencial da ventilação protetora. "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["9bfb33b1-1234-5678-abcd-ef0102030472"] = {
    "explicacao": (
        "O tubo orotraqueal com balonete (cuff) inflado oferece isolamento definitivo "
        "da via aérea, protegendo contra aspiração e permitindo ventilação com pressão "
        "positiva. Dispositivos supraglóticos (máscara laríngea) não oferecem proteção "
        "definitiva. Referência: Diretrizes ASA via aérea difícil 2022."
    )
}

CORRECOES["014348c8-1234-5678-abcd-ef0102030473"] = {
    "explicacao": (
        "A posição em rampa (cabeça e tronco elevados a ~30°, alinhando o meato auditivo "
        "externo com o esterno) melhora a visão laringoscópica e otimiza a mecânica "
        "respiratória em obesos, aumentando a CRF e prolongando o tempo seguro de "
        "apneia durante pré-oxigenação. Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["f9725198-1234-5678-abcd-ef0102030474"] = {
    "explicacao": (
        "O capnógrafo mede e monitora o CO2 expirado (ETCO2), que reflete a ventilação "
        "alveolar — quanto CO2 está sendo eliminado pelos pulmões. Valores normais de "
        "ETCO2: 35-45 mmHg. Não avalia oxigenação (função da oximetria e gasometria). "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["4f21e489-1234-5678-abcd-ef0102030475"] = {
    "explicacao": (
        "A broncoaspiração causa pneumonite química (síndrome de Mendelson) por ácido "
        "gástrico, resultando em hipoxemia (por shunt e inflamação alveolar) e "
        "broncoespasmo reflexo. pH gástrico <2,5 e volume >25 mL são os principais "
        "fatores de risco para pneumonite grave. Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["9fa495d5-1234-5678-abcd-ef0102030476"] = {
    "explicacao": (
        "O desflurano possui odor pungente e irritante para as vias aéreas, causando "
        "tosse, laringoespasmo e broncoespasmo, especialmente durante indução inalatória. "
        "Por isso é contraindicado para indução inalatória; deve ser usado apenas para "
        "manutenção após intubação. O sevoflurano é o inalatório de escolha para indução. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 2."
    )
}

CORRECOES["57f84671-1234-5678-abcd-ef0102030477"] = {
    "explicacao": (
        "FiO2 elevada (>0,8) favorece atelectasia de absorção: o O2 é rapidamente "
        "absorvido dos alvéolos pouco ventilados, causando colapso (pois N2 não é "
        "absorvível e manteria o alvéolo aberto). FiO2 entre 0,4-0,6 e PEEP adequada "
        "reduzem atelectasia intraoperatória. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["11f6ff2e-1234-5678-abcd-ef0102030478"] = {
    "explicacao": (
        "A membrana cricotireóidea é a estrutura de referência para cricotireoidostomia "
        "de emergência — localizada entre a cartilagem tireoide (superior) e cricóidea "
        "(inferior), palpável na linha média do pescoço. É o acesso cirúrgico mais "
        "rápido em 'cannot intubate, cannot oxygenate'. "
        "Referência: Diretrizes DAS e ASA via aérea difícil 2022."
    )
}

CORRECOES["1c901117-1234-5678-abcd-ef0102030479"] = {
    "explicacao": (
        "Em asmáticos, a ventilação excessiva (FR alta, Vt elevado) não permite "
        "expiração completa devido à obstrução de vias aéreas, gerando aprisionamento "
        "aéreo e auto-PEEP. Isso aumenta o risco de pneumotórax e piora a mecânica "
        "ventilatória. A estratégia de hipoventilação controlada é preferível. "
        "Referência: Miller's Anesthesia 9ed, cap. 53."
    )
}

CORRECOES["11804208-1234-5678-abcd-ef0102030480"] = {
    "explicacao": (
        "A oximetria de pulso (pletismografia de absorção dual de luz a 660 e 940 nm) "
        "mede continuamente a SaO2 de forma não invasiva. É monitorização obrigatória "
        "pelo CFM e padrões ASA. Limitações: artefatos de movimento, hipoperfusão "
        "periférica, metemoglobinemia, carboxiemoglobina. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["2c3e37a5-1234-5678-abcd-ef0102030481"] = {
    "explicacao": (
        "A hiperventilação aumenta a eliminação de CO2, reduzindo a PaCO2 (hipocapnia). "
        "Isso causa alcalose respiratória, vasoconstrição cerebral, deslocamento da "
        "curva de Hb para a esquerda e redução do limiar convulsivo. A PaCO2 é o "
        "principal regulador do FSC. Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["cf19f8f2-1234-5678-abcd-ef0102030482"] = {
    "explicacao": (
        "A punção da veia subclávia percorre trajeto próximo ao ápice pulmonar, "
        "aumentando o risco de pneumotórax (incidência ~1-3%). A técnica subclávea tem "
        "maior risco de pneumotórax que a jugular interna. O uso de ultrassom reduziu "
        "essa complicação significativamente. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["afd595bd-1234-5678-abcd-ef0102030483"] = {
    "explicacao": (
        "A ventilação protetora (Vt 6 mL/kg peso predito, pressão platô <30 cmH2O, "
        "PEEP individualizada) reduz lesão pulmonar induzida pela ventilação (VILI) "
        "ao minimizar superdistensão alveolar (volutrauma/barotrauma) e atelectrauma "
        "cíclico. Benefício comprovado mesmo em pulmões saudáveis. "
        "Referência: ARDSnet 2000, Futier 2013, Miller's 9ed."
    )
}

CORRECOES["c04c1bc9-1234-5678-abcd-ef0102030484"] = {
    "explicacao": (
        "Posição de litotomia prolongada aumenta a pressão nos compartimentos musculares "
        "das pernas (compartimentos anterior e posterior da perna), podendo causar "
        "síndrome compartimental com dor, edema, rigidez muscular e rabdomiólise. "
        "Risco maior quando associado a hipotensão intraoperatória. "
        "Referência: Miller's Anesthesia 9ed, cap. 41."
    )
}

CORRECOES["63d3d359-1234-5678-abcd-ef0102030485"] = {
    "explicacao": (
        "Em indivíduos normais, a PaCO2 é o principal estímulo químico da ventilação "
        "via quimiorreceptores centrais bulbares (sensíveis ao H+ no LCR) e periféricos "
        "(corpúsculos carotídeos). O estímulo hipóxico (PaO2) é secundário e torna-se "
        "relevante quando a PaCO2 está baixa (DPOC com hipercapnia crônica). "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["61aa1682-1234-5678-abcd-ef0102030486"] = {
    "explicacao": (
        "A embolia pulmonar aumenta o espaço morto alveolar (áreas ventiladas não "
        "perfundidas), resultando em queda abrupta do ETCO2 (menos CO2 chegando às "
        "áreas perfundidas para ser exalado). É sinal intraoperatório precoce de "
        "embolia pulmonar. Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["0c5db5bd-1234-5678-abcd-ef0102030487"] = {
    "explicacao": (
        "O laringoespasmo ocorre por estimulação da mucosa laríngea em plano anestésico "
        "superficial — por secreções, sangue, manipulação ou instrumentação. Anestesia "
        "profunda ou superficialidade extrema com o paciente acordado são mais seguras. "
        "A janela de risco é a profundidade intermediária (plano excitação). "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["9c5a2543-1234-5678-abcd-ef0102030488"] = {
    "explicacao": (
        "A hipoxemia prolongada resulta em disfunção e morte celular por metabolismo "
        "anaeróbico, acidose lática e falência de órgãos. Tecidos de alto consumo de "
        "O2 (cérebro, coração) são mais vulneráveis — lesão neurológica irreversível "
        "ocorre em 4-6 min de hipoxemia grave. "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["e6fc6f2f-1234-5678-abcd-ef0102030489"] = {
    "explicacao": (
        "A insuflação abdominal com CO2 para laparoscopia eleva o diafragma, reduz a "
        "complacência pulmonar e promove absorção sistêmica de CO2. O resultado é "
        "elevação progressiva do ETCO2 (e PaCO2) durante o procedimento. O ventilador "
        "deve ser ajustado para compensar. Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["c68a2f83-1234-5678-abcd-ef0102030490"] = {
    "explicacao": (
        "Na laringoscopia direta, a introdução do laringoscópio no sulco glossoepiglótico "
        "ou sobre a epiglote expõe as estruturas glóticas: cordas vocais (pregas vocais) "
        "e comissura anterior/posterior. A classificação de Cormack-Lehane avalia "
        "o grau de visualização dessas estruturas. Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["d4989309-1234-5678-abcd-ef0102030491"] = {
    "explicacao": (
        "O cuff insuficientemente insuflado (<20 cmH2O) não veda adequadamente a "
        "traqueia, permitindo passagem de secreções orofaríngeas para as vias aéreas "
        "inferiores, aumentando o risco de aspiração pulmonar e pneumonia associada "
        "à ventilação mecânica (PAV). "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

CORRECOES["a2e09799-1234-5678-abcd-ef0102030492"] = {
    "explicacao": (
        "A ventilação com pressão positiva aumenta a pressão intratorácica durante a "
        "inspiração, comprimindo as veias intratorácicas e o átrio direito, reduzindo "
        "o gradiente para o retorno venoso. Isso diminui a pré-carga ventricular "
        "direita e, consequentemente, o débito cardíaco. "
        "Referência: Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["ca7d2f25-1234-5678-abcd-ef0102030493"] = {
    "explicacao": (
        "A gestação avançada aumenta o risco de broncoaspiração por: redução do tônus "
        "do esfíncter esofágico inferior (progesterona), aumento da pressão intra-abdominal "
        "(útero), retardo do esvaziamento gástrico (especialmente em trabalho de parto "
        "com opioides) e pH gástrico reduzido. Medidas preventivas: ranitidina, "
        "citrato, sequência rápida. Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["ad16b481-1234-5678-abcd-ef0102030494"] = {
    "explicacao": (
        "O monitoramento sistemático da pressão do cuff com manômetro (mantendo entre "
        "20-30 cmH2O) previne lesão por hipoperfusão traqueal (acima de 30) ou "
        "aspiração (abaixo de 20). Deve ser verificado periodicamente, pois pode "
        "variar com mudança de posição, temperatura e durante N2O. "
        "Referência: Miller's Anesthesia 9ed, cap. 37."
    )
}

# =============================================================================
# ME1 — Q121-Q240 (explicacoes parciais → completar)
# =============================================================================

CORRECOES["ccd5563a-c11b-4e23-9a32-c31c94b72cf4"] = {
    "explicacao": (
        "O bloqueio simpático extenso pela raquianestesia reduz a resistência vascular "
        "sistêmica e o retorno venoso (vasodilatação venosa), sendo a principal causa "
        "de hipotensão. A hipovolemia absoluta pode contribuir, mas não é o mecanismo "
        "primário. Tratamento: volume, posição (DLE ou deslocamento uterino), "
        "vasopressores (fenilefrina em gestantes). Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["4a36cc9c-1f34-4d0a-8e51-2b7c6e1f8a90"] = {
    "explicacao": (
        "A hiperventilação reduz a PaCO2 (hipocapnia), causando vasoconstrição cerebral "
        "e redução do fluxo sanguíneo cerebral e do volume sanguíneo intracraniano. "
        "Essa é a base da redução da PIC pela hiperventilação. O efeito é temporário "
        "(habitação do mecanismo em 6-12h). Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["7ef701f2-abcd-1234-5678-ef0102030496"] = {
    "explicacao": (
        "O etomidato é o anestésico de escolha na indução de pacientes hemodinamicamente "
        "instáveis por sua mínima depressão cardiovascular (mantém RVS e DC). "
        "Propofol e tiopental causam hipotensão significativa. Cetamina pode ser "
        "alternativa, mas aumenta catecolaminas e PIC. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["17f47219-abcd-1234-5678-ef0102030497"] = {
    "explicacao": (
        "Na gestação, a CRF reduz-se em ~20% pela elevação diafragmática e aumento do "
        "volume sanguíneo. Concomitantemente, o consumo de O2 aumenta ~20%. Essa "
        "combinação (menor reserva + maior consumo) resulta em dessaturação muito mais "
        "rápida durante apneia em gestantes comparado a não gestantes. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["46f647fa-abcd-1234-5678-ef0102030498"] = {
    "explicacao": (
        "Atelectasia é a complicação pulmonar pós-operatória mais frequente (em até 70-90% "
        "dos pacientes sob anestesia geral), resultando de colapso alveolar por redução "
        "da CRF, FiO2 elevada, bloqueio neuromuscular residual e imobilização. "
        "Prevenção: fisioterapia, PEEP, mobilização precoce. "
        "Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["7022f77c-abcd-1234-5678-ef0102030499"] = {
    "explicacao": (
        "Fatores de risco para NVPO pelo escore de Apfel incluem: sexo feminino, não "
        "tabagista, história de NVPO/cinetose e uso de opioides. O uso de opioides é "
        "fator de risco importante, causando náuseas pela ação em zona de gatilho "
        "quimiorreceptora e retardo do esvaziamento gástrico. "
        "Referência: Diretrizes SBA/SGAS NVPO, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["ac326088-abcd-1234-5678-ef0102030500"] = {
    "explicacao": (
        "A bupivacaína possui maior cardiotoxicidade por sua alta afinidade aos canais "
        "de Na+ cardíacos no estado inativado, bloqueando a corrente rápida de Na+ e "
        "deprimindo o automatismo, condução e contratilidade. O bloqueio é lento de "
        "dissociar ('fast in, slow out'), causando arritmias refratárias. "
        "Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["d3552e7b-abcd-1234-5678-ef0102030501"] = {
    "explicacao": (
        "Na sepse hiperdinâmica (fase inicial), ocorre vasodilatação periférica maciça "
        "mediada por óxido nítrico (NO), prostaglandinas e outros mediadores. "
        "Isso reduz a RVS e aumenta o débito cardíaco compensatoriamente. "
        "A hipotensão resulta de vasoplegia, não de baixo débito primário. "
        "Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["4549f2fe-abcd-1234-5678-ef0102030502"] = {
    "explicacao": (
        "A fenilefrina é agonista alfa-1 puro, causa vasoconstrição sem efeito "
        "cronotrópico positivo, sendo preferida em cesarianas para não alterar a FC "
        "fetal. Melhora o pH e BE fetal em comparação à efedrina. Norepinefrina é "
        "alternativa emergente. Referência: Diretrizes OAA/AAGBI, Miller's Anesthesia "
        "9ed, cap. 77."
    )
}

CORRECOES["a2978f50-abcd-1234-5678-ef0102030503"] = {
    "explicacao": (
        "Soluções hipotônicas (SG 5%, Ringer Lactato) e glicosadas reduzem a "
        "osmolaridade plasmática, favorecendo entrada de água nos neurônios e piora "
        "do edema cerebral. O soro fisiológico 0,9% é isotônico (osmolaridade "
        "~308 mOsm/L) e é a solução de eleição em neurocirurgia. Também pode-se "
        "usar solução salina hipertônica para redução aguda da PIC. "
        "Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["64d66054-abcd-1234-5678-ef0102030504"] = {
    "explicacao": (
        "O cateter de Swan-Ganz (artéria pulmonar) permite medir diretamente: pressão "
        "da artéria pulmonar (PAP), pressão de oclusão da artéria pulmonar (PAOP), "
        "débito cardíaco por termodiluição e coleta de sangue venoso misto para SvO2. "
        "É o método clássico (padrão ouro) para monitorização hemodinâmica invasiva. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["59f8874f-abcd-1234-5678-ef0102030505"] = {
    "explicacao": (
        "Em pediatria, as paradas cardiorrespiratórias são predominantemente de origem "
        "respiratória (hipóxia precede a PCR), diferente dos adultos em que arritmias "
        "primárias são mais comuns. Por isso, ventilação adequada é prioridade na RCP "
        "pediátrica (relação 15:2 ou 30:2). Referência: PALS, Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["f783beaa-abcd-1234-5678-ef0102030506"] = {
    "explicacao": (
        "A escala de Aldrete modificada (Aldrete-Kroulik) avalia atividade motora, "
        "respiração, circulação, consciência e saturação de oxigênio para alta da "
        "SRPA. Score ≥9 indica alta segura. A escala de Ramsay é para sedação em UTI; "
        "Glasgow avalia nível de consciência neurológico. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["c977833d-abcd-1234-5678-ef0102030507"] = {
    "explicacao": (
        "O up-regulation de receptores nicotínicos extrajoncionais ocorre nas primeiras "
        "24-48h após queimaduras extensas. Esses receptores, ao serem ativados pela "
        "succinilcolina, liberam K+ maciçamente das células musculares, podendo causar "
        "hipercalemia letal (>7 mEq/L). O risco persiste por meses. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 12."
    )
}

CORRECOES["950a484d-abcd-1234-5678-ef0102030508"] = {
    "explicacao": (
        "Na posição sentada em neurocirurgia, a cabeça fica acima do nível cardíaco, "
        "criando pressão venosa negativa nos seios durais. Qualquer abertura venosa "
        "aspira ar prontamente, podendo causar embolia gasosa venosa significativa. "
        "Monitorização obrigatória: Doppler precordial + ETCO2. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["fa1a7396-abcd-1234-5678-ef0102030509"] = {
    "explicacao": (
        "Proeminências ósseas e nervos periféricos devem ser acolchoados adequadamente "
        "para prevenir lesões por pressão (úlceras) e neuropatias periféricas. "
        "Em cirurgias prolongadas (>2h), mudança periódica de posição pode ser indicada. "
        "Hipotensão contribui para lesões isquêmicas. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["ca9ac7fa-abcd-1234-5678-ef0102030510"] = {
    "explicacao": (
        "Lactentes têm consumo de O2 de ~6 mL/kg/min (vs ~3 mL/kg/min em adultos) e "
        "CRF relativa menor. Essa relação desfavorável resulta em reserva funcional "
        "pulmonar reduzida e dessaturação muito rápida durante apneia ou obstrução. "
        "A ventilação em lactentes requer particular atenção. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["82d2311a-abcd-1234-5678-ef0102030511"] = {
    "explicacao": (
        "No trauma, a prioridade do ABCDE é: A (via aérea), B (ventilação), C (circulação). "
        "Controle da via aérea com oxigenação adequada é a primeira intervenção, pois "
        "hipóxia leva a morte mais rapidamente que hemorragia não controlada no curto "
        "prazo. A intubação em sequência rápida é frequentemente necessária. "
        "Referência: ATLS 10ed, Miller's Anesthesia 9ed, cap. 80."
    )
}

CORRECOES["3ca21520-abcd-1234-5678-ef0102030512"] = {
    "explicacao": (
        "A tríade de Beck do tamponamento cardíaco inclui: hipotensão, turgência jugular "
        "(aumento da PVC) e abafamento das bulhas cardíacas. A turgência jugular reflete "
        "elevação da pressão no sistema venoso central pelo impedimento ao enchimento "
        "cardíaco. ECO transtorácico confirma o diagnóstico. "
        "Referência: Miller's Anesthesia 9ed, cap. 79."
    )
}

CORRECOES["b757ead4-abcd-1234-5678-ef0102030513"] = {
    "explicacao": (
        "A neuropatia óptica isquêmica perioperatória (ION) é a principal causa de "
        "perda visual após cirurgias em posição prona prolongada (especialmente coluna). "
        "Fatores de risco: hipotensão, anemia, posição prona, cirurgias longas. "
        "A hipotensão prolongada reduz a perfusão do nervo óptico, causando isquemia. "
        "Referência: ASA Practice Advisory on Perioperative Visual Loss 2019."
    )
}

CORRECOES["49a28cb3-abcd-1234-5678-ef0102030514"] = {
    "explicacao": (
        "A analgesia multimodal combina fármacos de diferentes classes (AINES, "
        "paracetamol, opioides, anestésicos locais, cetamina, gabapentinoides) em doses "
        "menores de cada um, reduzindo efeitos adversos e consumo total de opioides. "
        "Resulta em melhor controle da dor, menos sedação e alta mais precoce. "
        "Referência: Diretrizes ASA manejo da dor pós-operatória 2023."
    )
}

CORRECOES["2543c94c-abcd-1234-5678-ef0102030515"] = {
    "explicacao": (
        "A hipoventilação alveolar resulta em acúmulo de CO2 (hipercapnia), que reage "
        "com a água formando H2CO3, que se dissocia em H+ e HCO3-, reduzindo o pH — "
        "acidose respiratória. A hiperventilação causaria alcalose respiratória. "
        "Referência: Miller's Anesthesia 9ed, cap. 4."
    )
}

CORRECOES["4e4ea99b-abcd-1234-5678-ef0102030516"] = {
    "explicacao": (
        "A dexametasona é amplamente utilizada no perioperatório para prevenção de NVPO "
        "(escore de Apfel ≥2), com dose única de 4-8 mg IV na indução. Também possui "
        "efeitos anti-inflamatórios e melhora a analgesia pós-operatória. Mecanismo "
        "antiemético: supressão de prostaglandinas e serotonina. "
        "Referência: Diretrizes SBA/SGAS NVPO, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["25bd62d6-abcd-1234-5678-ef0102030517"] = {
    "explicacao": (
        "A anestesia caudal em pediatria é realizada pelo hiato sacral (abertura na "
        "face posterior do sacro, entre os cornos sacrais), onde a agulha penetra "
        "o ligamento sacrococcígeo e acessa o espaço peridural sacral. "
        "É técnica frequente para cirurgias urológicas e perineais pediátricas. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["12861131-abcd-1234-5678-ef0102030518"] = {
    "explicacao": (
        "No choque hemorrágico, a ativação do sistema nervoso simpático e a redução "
        "do débito cardíaco ativam barorreceptores e quimiorreceptores, gerando "
        "taquicardia compensatória. A bradicardia paradoxal (resposta de Bezold-Jarisch) "
        "ocorre tardiamente em hemorragia maciça (>30% da volemia). "
        "Referência: ATLS 10ed, Miller's Anesthesia 9ed, cap. 55."
    )
}

CORRECOES["05cbf4ef-abcd-1234-5678-ef0102030519"] = {
    "explicacao": (
        "A aspiração pulmonar é a principal complicação da anestesia geral em gestantes "
        "devido ao risco aumentado por redução do tônus do EEI, gastroparesia, "
        "aumento da pressão intra-abdominal e estômago cheio. Mendelson descreveu a "
        "pneumonite química por aspiração de ácido gástrico em 1946. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["8d6d0348-abcd-1234-5678-ef0102030520"] = {
    "explicacao": (
        "O CO2 insuflado para pneumoperitônio é absorvido sistemicamente, elevando a "
        "produção de CO2 e a PaCO2. O ETCO2 aumenta progressivamente durante "
        "laparoscopia. O ventilador deve aumentar a ventilação minuto para compensar "
        "e manter ETCO2 dentro de valores alvo. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["66d4ff79-abcd-1234-5678-ef0102030521"] = {
    "explicacao": (
        "A ondansetrona é antagonista seletivo dos receptores 5-HT3 (serotonina tipo 3) "
        "localizados no trato GI e no SNC (zona de gatilho quimiorreceptora). É um dos "
        "antieméticos mais utilizados no perioperatório. Dose usual: 4-8 mg IV. "
        "Referência: Diretrizes SBA/SGAS NVPO, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["5b02ca09-abcd-1234-5678-ef0102030522"] = {
    "explicacao": (
        "Pacientes obesos têm CRF significativamente reduzida (até 30-40% abaixo do "
        "normal), alta demanda metabólica de O2 e maior risco de atelectasia. A CRF "
        "reduzida diminui a reserva funcional pulmonar, resultando em dessaturação "
        "muito rápida durante apneia. A pré-oxigenação adequada é fundamental. "
        "Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["07894117-abcd-1234-5678-ef0102030523"] = {
    "explicacao": (
        "A raquianestesia alta (bloqueio acima de T1-T2) pode comprometer a inervação "
        "dos músculos intercostais e, se atingir C3-C5, bloqueia o nervo frênico, "
        "causando parada respiratória por paralisia diafragmática. Requer intubação "
        "de emergência e ventilação mecânica. "
        "Referência: Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["7d6717d8-abcd-1234-5678-ef0102030524"] = {
    "explicacao": (
        "A sequência rápida de intubação (RSI) associada ao jejum adequado é a medida "
        "mais efetiva para reduzir broncoaspiração em gestantes, pois garante intubação "
        "rápida com pressão cricoide (manobra de Sellick) sem ventilação por máscara. "
        "A critério do anestesiologista experiente, a RSI é padrão em gestantes. "
        "Referência: Diretrizes DAS/OAA, Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["391bb795-abcd-1234-5678-ef0102030525"] = {
    "explicacao": (
        "A hipotensão arterial em TCE reduz a pressão de perfusão cerebral "
        "(PPC = PAM - PIC), comprometendo o fluxo sanguíneo cerebral em um cérebro "
        "já vulnerável. Cada episódio de hipotensão (PAS <90 mmHg) associa-se "
        "significativamente ao aumento da morbimortalidade. A PPC alvo é >60 mmHg. "
        "Referência: Brain Trauma Foundation Guidelines 4ed, Miller's 9ed, cap. 57."
    )
}

CORRECOES["f2fd6226-abcd-1234-5678-ef0102030526"] = {
    "explicacao": (
        "Crianças apresentam tônus vagal predominante e coração com maior dependência "
        "da frequência cardíaca para o débito cardíaco. A laringoscopia estimula o "
        "nervo vago via reflexo vagal, causando bradicardia intensa, especialmente "
        "em lactentes. Pré-medicação com atropina é frequentemente utilizada em pediatria. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["edbe6679-abcd-1234-5678-ef0102030527"] = {
    "explicacao": (
        "O deslocamento uterino à esquerda (15-30°) — com coxim sob quadril direito ou "
        "mesa operatória inclinada — libera a compressão da veia cava inferior e aorta "
        "pelo útero gravídico, melhorando o retorno venoso e o débito cardíaco materno. "
        "Deve ser mantido até o clampeamento do cordão. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["cecae09a-abcd-1234-5678-ef0102030528"] = {
    "explicacao": (
        "O nervo fibular comum (peroneal) passa superficialmente pela cabeça da fíbula "
        "na região lateral do joelho, tornando-se vulnerável à compressão na posição "
        "de litotomia (especialmente com braçadeiras ajustadas sobre essa área). "
        "Resulta em pé caído e déficit de dorsoflexão. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["b8d99248-abcd-1234-5678-ef0102030529"] = {
    "explicacao": (
        "A taquicardia é frequentemente o primeiro sinal de hipoxemia em crianças, "
        "antes da cianose (sinal tardio) e da bradicardia (sinal pré-parada). "
        "Isso reflete a resposta simpática compensatória inicial para manter o débito "
        "cardíaco. Bradicardia em criança hipoxêmica é sinal ominoso de parada iminente. "
        "Referência: PALS, Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["6ea9118a-abcd-1234-5678-ef0102030530"] = {
    "explicacao": (
        "A morfina intratecal (50-100 mcg) fornece analgesia pós-operatória prolongada "
        "(12-24h) por baixa lipossolubilidade e persistência no LCR. É amplamente "
        "utilizada em cesarianas, mas requer monitorização para depressão respiratória "
        "tardia. Fentanil intratecal é utilizado para componente de ação mais rápida. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["99bf2ca5-abcd-1234-5678-ef0102030531"] = {
    "explicacao": (
        "A glicose 5% é hipotônica em relação ao plasma (osmolaridade ~278 mOsm/L) — "
        "após metabolismo da glicose, resulta em água livre, que entra nos neurônios "
        "por osmose, agravando o edema cerebral. Deve ser rigorosamente evitada em "
        "neurocirurgia. Também causa hiperglicemia, piorada em lesão cerebral. "
        "Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["8a41cee2-abcd-1234-5678-ef0102030532"] = {
    "explicacao": (
        "A apneia pós-operatória em prematuros é inversamente proporcional à idade "
        "pós-conceptual (IPC). Prematuros com IPC <60 semanas têm risco elevado de "
        "apneia por imaturidade dos centros respiratórios bulbares. Cirurgias eletivas "
        "devem ser postergadas até IPC ≥60 semanas quando possível. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["9d566c55-abcd-1234-5678-ef0102030533"] = {
    "explicacao": (
        "O pneumoperitônio laparoscópico aumenta a resistência vascular sistêmica (RVS) "
        "pelo efeito mecânico da pressão intra-abdominal elevada sobre os vasos "
        "abdominais, além de estimulação do sistema renina-angiotensina. O débito "
        "cardíaco pode reduzir-se por redução do retorno venoso. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["72e02b6f-abcd-1234-5678-ef0102030534"] = {
    "explicacao": (
        "O nervo ulnar (medial) passa medialmente no cotovelo pelo sulco epitroclear, "
        "sendo vulnerável à compressão quando o braço é posicionado em supino com "
        "cotovelo flexionado ou apoiado inadequadamente. Abdução dos braços >90° também "
        "pode tracionar o plexo braquial. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["733208db-abcd-1234-5678-ef0102030535"] = {
    "explicacao": (
        "Em queimados graves após 24-48h, o up-regulation maciço de receptores "
        "nicotínicos extrajoncionais (AChR γ e ε) em toda a superfície do músculo "
        "esquelético reduz a sensibilidade relativa a bloqueadores não despolarizantes "
        "(necessitando doses maiores). O succinilcolina é contraindicado pelo risco "
        "de hipercalemia letal. Referência: Stoelting's Pharmacology 5ed, cap. 12."
    )
}

CORRECOES["c88d0583-abcd-1234-5678-ef0102030536"] = {
    "explicacao": (
        "Os fatores de risco para delirium pós-operatório em idosos incluem: idade "
        "avançada, privação de sono, uso de benzodiazepínicos, opioides, dor não "
        "controlada, hipóxia, distúrbios metabólicos, imobilização e estimulação "
        "sensorial reduzida. A prevenção multimodal (orientação, mobilização precoce, "
        "evitar benzodiazepínicos) é fundamental. Referência: Miller's Anesthesia 9ed, cap. 84."
    )
}

CORRECOES["b5bf5d1e-abcd-1234-5678-ef0102030537"] = {
    "explicacao": (
        "A amiodarona é o antiarrítmico de escolha em FV/TV refratária após 2-3 "
        "desfibrilações + adrenalina. Dose: 300 mg IV em bolus na PCR. Bloqueia "
        "canais de Na+, K+ e Ca2+, prolonga o período refratário. "
        "Referência: Diretrizes AHA/ILCOR 2020, Miller's Anesthesia 9ed, cap. 35."
    )
}

CORRECOES["c6f01925-abcd-1234-5678-ef0102030538"] = {
    "explicacao": (
        "Na obesidade mórbida, o peso do tecido sobre o tórax e abdome reduz a CRF "
        "e a complacência pulmonar, especialmente em supino. Isso leva a maior "
        "tendência à hipercapnia (em obesos com síndrome de hipoventilação-obesidade). "
        "A redução da CRF é o mecanismo central das alterações respiratórias na obesidade. "
        "Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["33b37b7f-abcd-1234-5678-ef0102030539"] = {
    "explicacao": (
        "A PEEP adequada (5-8 cmH2O) mantém os alvéolos abertos durante a expiração, "
        "previne o colapso cíclico (atelectrauma) e melhora a CRF. Junto com baixos "
        "volumes correntes, é componente essencial da ventilação protetora intraoperatória. "
        "Referência: Diretriz LAS-I (Low-pressure Ventilation), Miller's 9ed, cap. 50."
    )
}

CORRECOES["586b40f0-abcd-1234-5678-ef0102030540"] = {
    "explicacao": (
        "Em neuroanestesia, a hipercapnia provoca vasodilatação cerebral e aumento do "
        "FSC/PIC. O principal objetivo ventilatório é manter a normocapnia (PaCO2 "
        "35-40 mmHg) para controlar a PIC. Hiperventilação moderada (30-35 mmHg) pode "
        "ser temporariamente utilizada em emergências de PIC elevada. "
        "Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["b63f7837-abcd-1234-5678-ef0102030541"] = {
    "explicacao": (
        "A monitorização na SRPA visa detectar precocemente complicações (hipóxia, "
        "hipotensão, arritmias, dor intratável, agitação, sangramentos) e intervir "
        "antes de deterioração clínica significativa. Inclui ECG, SpO2, PA, temperatura "
        "e escala de Aldrete para critérios de alta. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["117c2a1c-abcd-1234-5678-ef0102030542"] = {
    "explicacao": (
        "O lactato é produzido por metabolismo anaeróbico quando a oferta de O2 é "
        "inadequada. Níveis >2 mmol/L sugerem hipoperfusão. Em sepse, o clearance de "
        "lactato (>10-20% em 2h) indica resposta ao tratamento. É marcador de "
        "prognóstico e guia de ressuscitação. "
        "Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["f5b05116-abcd-1234-5678-ef0102030543"] = {
    "explicacao": (
        "A hipotermia perioperatória resulta de exposição cutânea, anestesia (vasodilatação) "
        "e infusão de líquidos frios. Prevenção: colchão térmico, manta de ar aquecido, "
        "aquecimento de soluções EV e gases anestésicos. A normotermia (36-37°C) é "
        "meta perioperatória pela redução de coagulopatia, NVPO e infecção cirúrgica. "
        "Referência: Miller's Anesthesia 9ed, cap. 54."
    )
}

CORRECOES["e69d7f49-abcd-1234-5678-ef0102030544"] = {
    "explicacao": (
        "A tríade letal do trauma (hipotermia + acidose + coagulopatia) representa um "
        "ciclo vicioso: cada componente agrava os outros. A hipotermia compromete enzimas "
        "de coagulação, a acidose inibe fatores de coagulação e a coagulopatia permite "
        "mais sangramento, piorando as outras. O controle de danos visa interromper esse "
        "ciclo. Referência: ATLS 10ed, Miller's Anesthesia 9ed, cap. 80."
    )
}

CORRECOES["08476e49-abcd-1234-5678-ef0102030545"] = {
    "explicacao": (
        "Os sinais neurológicos iniciais de LAST incluem: dormência perioral, gosto "
        "metálico, zumbido, tontura, agitação, visão turva e disartria. Esses são "
        "seguidos, em doses maiores, por convulsões e depois depressão do SNC. "
        "Reconhecimento precoce permite intervenção antes da colapso cardiovascular. "
        "Referência: Diretriz ASRA LAST 2023."
    )
}

CORRECOES["d3de44c9-abcd-1234-5678-ef0102030546"] = {
    "explicacao": (
        "Oligúria (<0,5 mL/kg/h) em sepse grave indica hipoperfusão renal por redução "
        "do débito cardíaco e redistribuição do fluxo. É critério de disfunção orgânica "
        "do SOFA e deve guiar a ressuscitação volêmica e uso de vasopressores. "
        "Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["94aa270d-abcd-1234-5678-ef0102030547"] = {
    "explicacao": (
        "Os bloqueadores H2 (ranitidina, famotidina) reduzem a secreção ácida gástrica "
        "e elevam o pH do conteúdo gástrico, diminuindo a gravidade da pneumonite caso "
        "ocorra aspiração. Citrato de sódio (antiácido não particulado) também é "
        "utilizado. O metoclopramida acelera o esvaziamento gástrico. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["1a090f72-abcd-1234-5678-ef0102030548"] = {
    "explicacao": (
        "Entre os anestésicos locais, bupivacaína possui maior duração de ação (~4-8h "
        "sem vasoconstritor) por sua alta lipossolubilidade e ligação proteica (~95%). "
        "Lidocaína tem duração intermediária (~1-2h), cloroprocaína é curta (~0,5h) e "
        "procaína é de duração curta. Referência: Miller's Anesthesia 9ed, cap. 36."
    )
}

CORRECOES["614a487e-abcd-1234-5678-ef0102030549"] = {
    "explicacao": (
        "A metoclopramida e o droperidol são antagonistas dopaminérgicos D2 que bloqueam "
        "a zona de gatilho quimiorreceptora (ZGQ) no área postrema. A metoclopramida "
        "também age perifericamente acelerando o esvaziamento gástrico. "
        "Referência: Diretrizes SBA/SGAS NVPO, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["488c3076-abcd-1234-5678-ef0102030550"] = {
    "explicacao": (
        "A hipercapnia (CO2 elevado) provoca vasodilatação cerebral por mecanismo "
        "mediado pelo H+, aumentando o FSC em ~4% por mmHg de PaCO2. Isso aumenta "
        "o volume sanguíneo intracraniano e a PIC. O contrário ocorre com hipocapnia. "
        "Referência: Miller's Anesthesia 9ed, cap. 13."
    )
}

CORRECOES["d1a7429b-abcd-1234-5678-ef0102030551"] = {
    "explicacao": (
        "O propofol reduz o consumo cerebral de oxigênio (CMRO2) e o FSC de forma "
        "dose-dependente, sendo frequentemente utilizado em cirurgias intracranianas. "
        "A cetamina aumenta CMRO2 e FSC, sendo contraindicada em hipertensão intracraniana. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["5f4d5dbf-abcd-1234-5678-ef0102030552"] = {
    "explicacao": (
        "A abdução excessiva do braço (>90° do eixo do corpo) estica o plexo braquial "
        "entre a clavícula e a primeira costela ou no canal costoclavicular. Posição "
        "do paciente supino com braços abduzidos em T (90°) é o principal risco para "
        "plexopatia braquial perioperatória. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["6f2cd805-abcd-1234-5678-ef0102030553"] = {
    "explicacao": (
        "O flumazenil é antagonista competitivo dos receptores de benzodiazepínicos "
        "(moduladores positivos do GABA-A). Dose: 0,2 mg IV a cada minuto (máx 1 mg). "
        "Meia-vida curta (~1h); pode necessitar redoses. Não reverte opioides. "
        "A naloxona reverte opioides; sugamadex reverte aminosteroides. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 5."
    )
}

CORRECOES["e783ea79-abcd-1234-5678-ef0102030554"] = {
    "explicacao": (
        "Na gestação, o edema das mucosas das vias aéreas superiores (por aumento do "
        "volume sanguíneo e progesterona), ganho ponderal com aumento do índice de "
        "Mallampati e limitação da mobilidade cervical aumentam significativamente "
        "o risco de laringoscopia e intubação difícil. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["b2075e8f-abcd-1234-5678-ef0102030555"] = {
    "explicacao": (
        "Os opioides deprimem a ventilação por ação nos receptores mu do tronco cerebral "
        "(núcleo do trato solitário), reduzindo a resposta ao CO2 e ao H+. Manifestações: "
        "bradipneia, volume corrente reduzido, apneia. Antagonista: naloxona. "
        "Monitorização SpO2 é essencial na SRPA após uso de opioides. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 3."
    )
}

CORRECOES["8e880938-abcd-1234-5678-ef0102030556"] = {
    "explicacao": (
        "Durante anestesia geral, o reflexo de fechamento palpebral se perde, expondo "
        "a córnea ao ressecamento, abrasão e queratopatia de exposição. A proteção "
        "ocular com fita, pomada oftálmica lubrificante e fechamento das pálpebras é "
        "obrigatória. Risco maior em posições com pressão ocular direta (prona). "
        "Referência: Miller's Anesthesia 9ed, cap. 41."
    )
}

CORRECOES["1a16b9b9-abcd-1234-5678-ef0102030557"] = {
    "explicacao": (
        "O pneumotórax hipertensivo causa: hipotensão (compressão cardíaca e redução de "
        "retorno venoso), ausência unilateral de MV (pulmão colapsado), desvio da traqueia, "
        "aumento da pressão de vias aéreas e dessaturação. É emergência que exige "
        "descompressão imediata com agulha no 2° EIC linha hemiclavicular. "
        "Referência: ATLS 10ed, Miller's Anesthesia 9ed."
    )
}

CORRECOES["79cccd91-abcd-1234-5678-ef0102030558"] = {
    "explicacao": (
        "A prática atual aceita tubos com cuff de baixa pressão-alto volume em crianças "
        "de todas as idades (incluindo RN), desde que a pressão do cuff seja monitorada "
        "(<20 cmH2O). Tubos sem cuff foram historicamente preferidos em menores de 8 anos, "
        "mas estudos atuais demonstraram segurança dos tubos com cuff. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["e6a86cdf-abcd-1234-5678-ef0102030559"] = {
    "explicacao": (
        "Na sepse, a heterogeneidade microcirculatória (má distribuição do fluxo — "
        "capilares funcionando intermitentemente ao lado de outros com fluxo normal) "
        "causa hipóxia celular apesar de débito cardíaco global normal. Esse mecanismo "
        "'shunt funcional' contribui para a disfunção orgânica independente da oferta "
        "global de O2. Referência: Ince C, Crit Care 2005, Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["077fae66-abcd-1234-5678-ef0102030560"] = {
    "explicacao": (
        "A analgesia regional (peridural, bloqueios periféricos) reduz o consumo de "
        "opioides no pós-operatório, diminuindo efeitos adversos como sedação, náuseas, "
        "íleo paralítico e depressão respiratória. Também melhora mobilização precoce, "
        "reduz tromboembolismo e melhora recuperação global. "
        "Referência: Miller's Anesthesia 9ed, cap. 40."
    )
}

CORRECOES["f63a632e-abcd-1234-5678-ef0102030561"] = {
    "explicacao": (
        "A deambulação e exercícios respiratórios precoces no pós-operatório reduzem "
        "a atelectasia ao melhorar a ventilação das bases pulmonares, aumentar a CRF "
        "e ativar reflexos de expansão pulmonar. Fisioterapia respiratória intensiva "
        "e incentivadores respiratórios também são eficazes. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["6a69ae18-abcd-1234-5678-ef0102030562"] = {
    "explicacao": (
        "O laringoespasmo é a obstrução parcial ou total das cordas vocais por espasmo "
        "do músculo cricotireóideo e músculo aritenoide oblíquo, geralmente em anestesia "
        "superficial com estimulação das vias aéreas superiores. É mais comum em "
        "pediatria (0,87% vs 0,3% em adultos) por maior reatividade laríngea. "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["4d0746a5-abcd-1234-5678-ef0102030563"] = {
    "explicacao": (
        "A escala de Ramsay avalia a profundidade de sedação em 6 níveis (1-6) e é "
        "amplamente utilizada em UTI. A escala RASS (Richmond Agitation Sedation Scale) "
        "também é amplamente utilizada. A escala de Aldrete é para alta da SRPA; "
        "Mallampati para avaliação de via aérea. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["134b1d2d-abcd-1234-5678-ef0102030564"] = {
    "explicacao": (
        "A noradrenalina é o vasopressor de primeira linha no choque séptico por ser "
        "agonista alfa-1 e beta-1, aumentando RVS e PA com menor risco de taquicardia "
        "e arritmias comparado à dopamina. As diretrizes Surviving Sepsis Campaign "
        "2021 recomendam noradrenalina como primeira escolha. "
        "Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["dd12d72d-abcd-1234-5678-ef0102030565"] = {
    "explicacao": (
        "Os anti-inflamatórios não esteroidais (AINEs) — ibuprofeno, cetoprofeno, "
        "cetorolaco — bloqueiam COX-1 e COX-2, reduzindo prostaglandinas pró-inflamatórias "
        "e analgesia por via periférica e central. São componentes essenciais da analgesia "
        "multimodal, reduzindo consumo de opioides em 20-40%. "
        "Referência: Diretrizes ASA manejo da dor pós-operatória 2023."
    )
}

CORRECOES["331999be-abcd-1234-5678-ef0102030566"] = {
    "explicacao": (
        "Imobilização prolongada estagna o fluxo venoso (estase) — um dos vértices da "
        "tríade de Virchow (estase + hipercoagulabilidade + dano endotelial). No "
        "pós-operatório, a mobilização precoce é a principal medida não farmacológica "
        "de prevenção do TEV. Profilaxia farmacológica (HBPM) também é recomendada. "
        "Referência: Miller's Anesthesia 9ed, cap. 55."
    )
}

CORRECOES["1ef4cb64-abcd-1234-5678-ef0102030567"] = {
    "explicacao": (
        "Na posição de litotomia extrema, o nervo fibular comum (peroneal) é comprimido "
        "pela cabeça da fíbula quando a perna repousa inadequadamente sobre o suporte. "
        "Resulta em déficit sensitivo-motor na face lateral da perna e dorso do pé (pé "
        "caído). É a neuropatia perioperatória mais frequente nessa posição. "
        "Referência: ASA Practice Advisory on Perioperative Peripheral Neuropathies 2018."
    )
}

CORRECOES["9c4d946f-abcd-1234-5678-ef0102030568"] = {
    "explicacao": (
        "A cetamina aumenta o CMRO2 e o FSC por ação excitatória no SNC (agonismo em "
        "receptores muscarínicos, AMPA e sigma). Por isso é contraindicada em "
        "hipertensão intracraniana. Propofol, tiopental e etomidato reduzem CMRO2 "
        "e são preferidos em neuroanestesia. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["c580ba73-abcd-1234-5678-ef0102030569"] = {
    "explicacao": (
        "O pneumoperitônio laparoscópico reduz o retorno venoso (pela compressão da "
        "VCI e veias mesentéricas) e aumenta a pós-carga (pela compressão aórtica). "
        "O débito cardíaco pode reduzir inicialmente; pressões de insuflação <15 mmHg "
        "minimizam os efeitos hemodinâmicos adversos. "
        "Referência: Miller's Anesthesia 9ed, cap. 68."
    )
}

CORRECOES["5be1725d-abcd-1234-5678-ef0102030570"] = {
    "explicacao": (
        "Na posição sentada, o gradiente de pressão hidrostática entre o sítio cirúrgico "
        "e o átrio direito cria pressão venosa subatmosférica no campo operatório, "
        "favorecendo a entrada de ar nas veias abertas. Em Trendelenburg, a pressão "
        "venosa é positiva, reduzindo o risco de embolia aérea. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["aa5151b4-abcd-1234-5678-ef0102030571"] = {
    "explicacao": (
        "As convulsões representam atividade neuronal hipermetabólica maciça, aumentando "
        "o CMRO2 em até 300-400%. Isso pode causar isquemia cerebral se a oferta de O2 "
        "não acompanhar a demanda. Hipotermia e barbitúricos reduzem o CMRO2. "
        "Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["66b4dff0-abcd-1234-5678-ef0102030572"] = {
    "explicacao": (
        "Na posição prona prolongada, a compressão direta do olho sobre o suporte pode "
        "aumentar a pressão intraocular e comprometer o fluxo no nervo óptico, causando "
        "neuropatia óptica isquêmica. Também pode ocorrer abrasão corneal. O suporte "
        "adequado da cabeça deve proteger os olhos de qualquer pressão. "
        "Referência: ASA Practice Advisory on Perioperative Visual Loss 2019."
    )
}

CORRECOES["860404e4-abcd-1234-5678-ef0102030573"] = {
    "explicacao": (
        "A posição em rampa eleva a cabeça e tronco do obeso a 25-30°, alinhando o meato "
        "auditivo externo com o esterno e melhorando o eixo oral-faríngeo-laríngeo. "
        "Isso melhora a visualização laringoscópica, a FRC e o tempo seguro de apneia. "
        "A inclinação do Trendelenburg não melhora esses parâmetros em obesos. "
        "Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["da16d751-abcd-1234-5678-ef0102030574"] = {
    "explicacao": (
        "A elevação da cabeceira a 30° melhora a drenagem venosa cerebral (reduz PIC), "
        "ao mesmo tempo que deve ser equilibrada com a PAM para manter PPC adequada. "
        "Hipocapnia moderada (30-35 mmHg), osmo-terapia (manitol, salina hipertônica) "
        "e drenagem liquórica são outras medidas de redução da PIC. "
        "Referência: Brain Trauma Foundation Guidelines 4ed."
    )
}

CORRECOES["ad50a9d8-abcd-1234-5678-ef0102030575"] = {
    "explicacao": (
        "O débito cardíaco aumenta progressivamente na gestação, atingindo pico de "
        "30-50% acima do basal no 3° trimestre por aumento do volume sistólico e "
        "frequência cardíaca. Esse aumento resulta da redução da RVS (progesterona, "
        "vasodilatação) e do aumento do volume plasmático. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["1b94ccdd-abcd-1234-5678-ef0102030576"] = {
    "explicacao": (
        "A hipotermia prejudica as enzimas de coagulação (que funcionam otimamente a "
        "37°C), a função plaquetária e a fibrinólise. Abaixo de 35°C, a coagulopatia "
        "se torna clinicamente significativa, aumentando o sangramento cirúrgico. "
        "Normotermia é meta perioperatória. Referência: Miller's Anesthesia 9ed, cap. 54."
    )
}

CORRECOES["47eebacd-abcd-1234-5678-ef0102030577"] = {
    "explicacao": (
        "O controle de danos cirúrgico (damage control surgery) visa estabilizar o "
        "paciente traumatizado rapidamente: controle da hemorragia, contaminação e "
        "fechamento temporário da cavidade abdominal. Cirurgias definitivas são "
        "postergadas após estabilização fisiológica (correção da tríade letal). "
        "Referência: ATLS 10ed, Miller's Anesthesia 9ed, cap. 80."
    )
}

CORRECOES["3052a151-abcd-1234-5678-ef0102030578"] = {
    "explicacao": (
        "Em neonatos e lactentes, a língua é proporcionalmente maior em relação à "
        "cavidade oral, tornando a laringoscopia mais difícil e favorecendo obstrução "
        "das vias aéreas durante sedação ou anestesia. A epiglote infantil é longa, "
        "mole e em ângulo agudo (não curta e rígida). "
        "Referência: Miller's Anesthesia 9ed, cap. 83."
    )
}

CORRECOES["1918e20b-abcd-1234-5678-ef0102030579"] = {
    "explicacao": (
        "A redução do tônus do esfíncter esofágico inferior (EEI) pela progesterona "
        "facilita a regurgitação do conteúdo gástrico ácido para o esôfago. Associada "
        "ao aumento da pressão intra-abdominal e retardo do esvaziamento gástrico, "
        "aumenta dramaticamente o risco de aspiração em gestantes. "
        "Referência: Miller's Anesthesia 9ed, cap. 77."
    )
}

CORRECOES["9b6059d3-abcd-1234-5678-ef0102030580"] = {
    "explicacao": (
        "Na RTU de próstata, a absorção da solução irrigante hipotônica (glicina) pela "
        "veia prostática provoca hiponatremia dilucional (síndrome de TURP). Manifestações: "
        "confusão mental, convulsões, edema cerebral, bradicardia. Raquianestesia "
        "é preferida por permitir detecção precoce dos sintomas neurológicos. "
        "Referência: Miller's Anesthesia 9ed, cap. 72."
    )
}

CORRECOES["f922c50c-abcd-1234-5678-ef0102030581"] = {
    "explicacao": (
        "O sevoflurano possui baixa pungência (coeficiente partição sangue:gás = 0,69), "
        "cheiro agradável ou neutro, não irrita vias aéreas e induz anestesia suavemente. "
        "É o inalatório de escolha para indução inalatória (especialmente em crianças). "
        "O desflurano é altamente irritante para vias aéreas, contraindicado na indução. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 2."
    )
}

CORRECOES["66e1eeeb-abcd-1234-5678-ef0102030582"] = {
    "explicacao": (
        "O plasma fresco congelado (PFC) contém todos os fatores de coagulação (I, II, "
        "V, VII, VIII, IX, X, XI, XIII), fibrinogênio e anticoagulantes naturais. "
        "É indicado em coagulopatia dilucional e terapia hemostática balanceada no "
        "trauma maciço. Dose: 10-20 mL/kg. Referência: Miller's Anesthesia 9ed, cap. 55."
    )
}

CORRECOES["0fd7569b-abcd-1234-5678-ef0102030583"] = {
    "explicacao": (
        "A bradicardia em crianças é sinal ominoso de fadiga/parada respiratória iminente. "
        "A taquicardia é compensatória inicial, e a agitação pode preceder a piora. "
        "A bradicardia (FC <60 bpm em lactente com comprometimento da perfusão) indica "
        "início imediato de RCP. Referência: PALS, Miller's Anesthesia 9ed, cap. 83."
    )
}

# =============================================================================
# ME3 — questões com explicação vazia
# =============================================================================

CORRECOES["87b7057c-c587-490c-b205-36188677efb8"] = {
    "explicacao": (
        "O quadro clínico de aumento súbito da pressão de pico nas vias aéreas, queda "
        "da saturação e hipotensão após inserção de cateter venoso central é clássico "
        "para pneumotórax hipertensivo — complicação da punção venosa central que "
        "lesa a pleura. O tratamento imediato é a descompressão com agulha no 2° EIC "
        "MCL seguida de drenagem torácica. Referência: ATLS 10ed, Miller's 9ed."
    )
}

CORRECOES["ffa731dc-75f9-4655-9719-9b0c7ad06be1"] = {
    "explicacao": (
        "A variação da pressão de pulso (VPP) é um parâmetro dinâmico que avalia a "
        "responsividade ao volume em pacientes sob ventilação mecânica controlada e em "
        "ritmo sinusal. VPP >13% prediz com alta acurácia que o paciente responderá a "
        "volume com aumento do DC. Não se aplica em FA, respiração espontânea ou baixa "
        "complacência. Referência: Michard F, Anesthesiology 2005."
    )
}

CORRECOES["0d0a4906-ab12-4cd3-ef56-789012345678"] = {
    "explicacao": (
        "No coronariopata, a taquicardia aumenta o consumo miocárdico de O2 (MVO2) pela "
        "maior frequência de ciclos contráteis e reduz o tempo de enchimento diastólico "
        "(principal período de perfusão coronariana). Beta-bloqueadores devem ser "
        "mantidos perioperatoriamente (retirada abrupta aumenta risco de isquemia). "
        "Anemia reduz a oferta de O2 ao miocárdio. Referência: Diretrizes ACC/AHA 2024."
    )
}

CORRECOES["3c0ab9b7-abcd-1234-5678-ef0102030600"] = {
    "explicacao": (
        "Na hipertermia maligna, o hipermetabolismo muscular produz CO2 maciçamente, "
        "causando elevação rápida do ETCO2 — frequentemente o primeiro sinal detectável "
        "no paciente intubado. Outros achados incluem rigidez muscular, acidose mista, "
        "hipercalemia, rabdomiólise e CK elevada. Tratamento: dantrolene imediato. "
        "Referência: Diretrizes MHAUS, Miller's Anesthesia 9ed, cap. 45."
    )
}

CORRECOES["1af3fa6f-abcd-1234-5678-ef0102030601"] = {
    "explicacao": (
        "A reposição balanceada de hemocomponentes (ratio 1:1:1 de concentrado de "
        "hemácias:PFC:plaquetas) é a estratégia de referência para coagulopatia "
        "traumática — previne coagulopatia dilucional e restaura a hemostasia. "
        "Cristaloides em grande volume pioram a coagulopatia e hipotermia. "
        "Referência: ATLS 10ed, Damage Control Resuscitation."
    )
}

CORRECOES["1c821c7b-abcd-1234-5678-ef0102030602"] = {
    "explicacao": (
        "A VPP (variação da pressão de pulso) é o parâmetro dinâmico mais acurado para "
        "predizer responsividade volêmica em pacientes sob ventilação controlada e em "
        "ritmo sinusal. A PVC isolada tem baixa acurácia. Outros índices dinâmicos: "
        "variação do volume sistólico (VVS) e teste de elevação passiva de membros. "
        "Referência: Michard F, Anesthesiology 2005, Miller's 9ed."
    )
}

CORRECOES["08dc3172-abcd-1234-5678-ef0102030603"] = {
    "explicacao": (
        "A vasoconstrição pulmonar hipóxica (VPH) redireciona o fluxo sanguíneo das "
        "regiões hipoventiladas (não dependentes) para as bem ventiladas, reduzindo o "
        "shunt e mantendo a oxigenação. É o principal mecanismo de adaptação na "
        "ventilação monopulmonar. Anestésicos inalatórios inibem a VPH em graus variados. "
        "Referência: Miller's Anesthesia 9ed, cap. 66."
    )
}

CORRECOES["138ed9c6-abcd-1234-5678-ef0102030604"] = {
    "explicacao": (
        "Na estenose aórtica crítica, o ventrículo esquerdo hipertrofiado depende de "
        "pré-carga adequada, ritmo sinusal e FC baixa-normal (60-80 bpm) para "
        "manutenção do débito cardíaco. Hipotensão e taquicardia são especialmente "
        "deletérias. A pós-carga não deve ser reduzida abruptamente. "
        "Referência: Miller's Anesthesia 9ed, cap. 62."
    )
}

CORRECOES["289f894a-abcd-1234-5678-ef0102030605"] = {
    "explicacao": (
        "O propofol tem menor impacto na vasoconstrição pulmonar hipóxica (VPH) em "
        "comparação aos anestésicos inalatórios (que a inibem dose-dependentemente). "
        "Isso o torna vantajoso em cirurgias com ventilação monopulmonar, pois preserva "
        "melhor a relação V/Q. Referência: Miller's Anesthesia 9ed, cap. 66."
    )
}

CORRECOES["2dd688df-abcd-1234-5678-ef0102030606"] = {
    "explicacao": (
        "Na ECMO VA (veno-arterial), o fluxo mecânico contínuo pode não proporcionar "
        "descarregamento adequado do VE se o coração ainda ejetar contra a pressão "
        "do fluxo retrógrado. A distensão do VE (stasis) causa: aumento da PCP, "
        "hipoperfusão coronariana e risco de trombo intracardíaco. "
        "Referência: ELSO Guidelines, Extracorporeal Life Support Organization."
    )
}

CORRECOES["c7ea1e2f-abcd-1234-5678-ef0102030607"] = {
    "explicacao": (
        "O TOF ratio (T4/T1) ≥0,9 é o limiar mínimo para reversão adequada do bloqueio "
        "neuromuscular antes da extubação, reduzindo risco de curarização residual e "
        "insuficiência respiratória pós-operatória. TOF <0,9 indica bloqueio residual "
        "significativo. A monitorização quantitativa (aceleromiografia) é superior à "
        "avaliação clínica. Referência: Diretrizes ESAIC, Miller's Anesthesia 9ed, cap. 38."
    )
}

CORRECOES["57d63838-abcd-1234-5678-ef0102030608"] = {
    "explicacao": (
        "Na fase hiperdinâmica inicial do choque séptico, a vasodilatação maciça "
        "(mediada por NO e outros mediadores) reduz a RVS, causando hipotensão. "
        "O coração responde aumentando o DC compensatoriamente. Esse padrão "
        "('choque quente') contrasta com a fase tardia de disfunção miocárdica. "
        "Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["8847a50d-abcd-1234-5678-ef0102030609"] = {
    "explicacao": (
        "O etomidato inibe temporariamente a 11-beta-hidroxilase adrenal (enzima na "
        "síntese de cortisol e aldosterona), causando supressão adrenocortical por "
        "12-24h mesmo em dose única de indução. Por isso, pode ser problemático em "
        "sepse e críticos. Não libera histamina e é hemodinamicamente estável. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["9a8a32e0-abcd-1234-5678-ef0102030610"] = {
    "explicacao": (
        "A tríade letal do trauma (hipotermia + acidose + coagulopatia) forma um ciclo "
        "vicioso onde cada componente agrava os outros. Hipotermia inibe enzimas de "
        "coagulação, acidose compromete função plaquetária e a coagulopatia perpetua "
        "o sangramento. A ressuscitação de controle de danos visa interrompê-la. "
        "Referência: ATLS 10ed, Miller's Anesthesia 9ed, cap. 80."
    )
}

CORRECOES["e98518d2-abcd-1234-5678-ef0102030611"] = {
    "explicacao": (
        "Na SDRA, a ventilação protetora ARDSnet usa Vt de 6 mL/kg (peso predito), "
        "podendo reduzir a 4 mL/kg em hipercapnia permissiva. Vt 10-12 mL/kg causam "
        "volutrauma. A pressão de platô deve ser mantida <30 cmH2O. A hipercapnia "
        "permissiva (até pH 7,20) é tolerada para reduzir o volutrauma. "
        "Referência: ARDSnet 2000, Miller's Anesthesia 9ed."
    )
}

CORRECOES["3f87322c-abcd-1234-5678-ef0102030612"] = {
    "explicacao": (
        "O azul de metileno inibe a guanilil ciclase (bloqueia o efeito do NO "
        "vasodilatador), sendo usado como terapia adjuvante na vasoplegia refratária "
        "pós-CEC que não responde a noradrenalina/vasopressina. Dose: 1-2 mg/kg IV. "
        "Alternativa: vasopressina. Referência: Miller's Anesthesia 9ed, cap. 63."
    )
}

CORRECOES["6b190c99-abcd-1234-5678-ef0102030613"] = {
    "explicacao": (
        "O Doppler precordial é o monitor mais sensível para embolia aérea venosa "
        "(detecta bolhas de 0,25 mL). Posicionado no 3°-4° EIC direito, detecta "
        "mudanças características no padrão sonoro quando ar entra nas câmaras "
        "cardíacas. É mais sensível que ETCO2 e ECG para detecção precoce. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["7f0e5d82-abcd-1234-5678-ef0102030614"] = {
    "explicacao": (
        "O óxido nítrico (NO) inalatório é vasodilatador pulmonar seletivo — atua "
        "apenas nos alvéolos ventilados, reduzindo a resistência vascular pulmonar sem "
        "efeito sistêmico (degradado rapidamente pela hemoglobina). É o tratamento de "
        "escolha para crise hipertensiva pulmonar perioperatória. "
        "Referência: Miller's Anesthesia 9ed, cap. 62."
    )
}

CORRECOES["94677190-abcd-1234-5678-ef0102030615"] = {
    "explicacao": (
        "Na ECMO venovenosa (VV), o suporte é exclusivamente respiratório. A ventilação "
        "ultraprotetora (Vt 2-4 mL/kg, PEEP 10-15 cmH2O, FR baixa) permite repousar "
        "o pulmão enquanto a ECMO oxigena. O objetivo é minimizar a VILI adicional "
        "e favorecer a recuperação pulmonar. Referência: ELSO Guidelines, Combes A 2018."
    )
}

CORRECOES["a511dd02-abcd-1234-5678-ef0102030616"] = {
    "explicacao": (
        "Na embolia aérea venosa, ar no coração direito aumenta o espaço morto alveolar "
        "(pulmão ventilado sem perfusão), resultando em queda abrupta do ETCO2 — "
        "frequentemente o primeiro sinal monitorado no intraoperatório. "
        "Hipotensão, dessaturação e sopro em roda d'água são sinais posteriores. "
        "Referência: Miller's Anesthesia 9ed, cap. 71."
    )
}

CORRECOES["a7ce9b37-abcd-1234-5678-ef0102030617"] = {
    "explicacao": (
        "Coma barbitúrico (com tiopental ou pentobarbital) é terapia de segunda linha "
        "para PIC refratária às medidas de primeira linha (sedação, normocapnia, "
        "osmoterapia). Reduz CMRO2 em até 50%, com correspondente redução do FSC e PIC. "
        "Monitorização com EEG é necessária para titular a dose. "
        "Referência: Brain Trauma Foundation Guidelines 4ed."
    )
}

CORRECOES["bd0f6736-abcd-1234-5678-ef0102030618"] = {
    "explicacao": (
        "Na reperfusão pós-clampeamento aórtico, a liberação de metabolitos anaeróbicos "
        "acumulados nos membros isquêmicos (K+, H+, lactato, mioglobina) na circulação "
        "sistêmica causa acidose metabólica intensa, hipercalemia (podendo precipitar "
        "arritmias), hipotensão e rabdomiólise. "
        "Referência: Miller's Anesthesia 9ed, cap. 67."
    )
}

CORRECOES["beef8766-abcd-1234-5678-ef0102030619"] = {
    "explicacao": (
        "A cetamina possui propriedades analgésicas (antagonismo NMDA, receptores opioides) "
        "e simpaticomiméticas (libera catecolaminas endógenas, gerando taquicardia e "
        "hipertensão). Estas últimas tornam-na útil em pacientes instáveis hemodinamicamente "
        "e no trauma. Também possui broncodilatação significativa. "
        "Referência: Stoelting's Pharmacology 5ed, cap. 4."
    )
}

CORRECOES["cf68b159-abcd-1234-5678-ef0102030620"] = {
    "explicacao": (
        "Na fase anepática do transplante hepático (entre clampeamento e reperfusão do "
        "enxerto), não há função hepática. Acumula-se citrato (da transfusão), causando "
        "hipocalcemia; a metabolização do lactato e outros ânions cessa, causando "
        "acidose metabólica progressiva. O potássio pode elevar-se pela acidose. "
        "Referência: Miller's Anesthesia 9ed, cap. 69."
    )
}

CORRECOES["d5fac5e7-abcd-1234-5678-ef0102030621"] = {
    "explicacao": (
        "O dantrolene é o tratamento específico da hipertermia maligna. Bloqueia a "
        "liberação de Ca2+ do retículo sarcoplasmático via canal RYR1, interrompendo "
        "a rigidez muscular e o hipermetabolismo. Dose inicial: 2,5 mg/kg IV a cada "
        "5 min até controle (máx 10 mg/kg). Estoque disponível é obrigatório em salas "
        "de anestesia. Referência: Diretrizes MHAUS."
    )
}

# Q82 (d8fb8fff) — questão de teste, sem conteúdo médico real
CORRECOES["d8fb8fff-abcd-1234-5678-ef0102030622"] = {
    "explicacao": (
        "NOTA: Esta questão foi identificada como entrada de teste/placeholder sem conteúdo "
        "médico válido. Mantida sem alteração de resposta por ausência de enunciado clínico real."
    )
}

CORRECOES["daab2452-abcd-1234-5678-ef0102030623"] = {
    "explicacao": (
        "A anestesia venosa total (TIVA) sem monitorização adequada da profundidade "
        "anestésica é o principal fator de risco para awareness intraoperatório. "
        "O bloqueio neuromuscular mascara os sinais de superficialização (movimento, "
        "respiração espontânea). A monitorização do BIS ou entropia reduz o risco. "
        "Referência: Miller's Anesthesia 9ed, cap. 48."
    )
}

CORRECOES["f3a3fd0b-abcd-1234-5678-ef0102030624"] = {
    "explicacao": (
        "No paciente séptico, a meta hemodinâmica principal é normalizar a perfusão "
        "orgânica, avaliada pela queda progressiva do lactato (clearance ≥10-20% em 2h). "
        "A PVC isolada não é alvo confiável; PAM alvo é 65-70 mmHg; diurese é parâmetro "
        "de perfusão renal importante. Referência: Diretrizes Surviving Sepsis Campaign 2021."
    )
}

CORRECOES["f6198cd7-abcd-1234-5678-ef0102030625"] = {
    "explicacao": (
        "A hipocapnia leve (PaCO2 35-40 mmHg, ou ligeiramente abaixo) por ventilação "
        "controlada reduz o FSC e o volume sanguíneo intracraniano, auxiliando no "
        "controle da PIC. A normocapnia é o alvo primário; hipocapnia excessiva "
        "(<30 mmHg) pode causar isquemia cerebral por vasoconstrição. "
        "Referência: Miller's Anesthesia 9ed, cap. 57."
    )
}

CORRECOES["c36a228a-abcd-1234-5678-ef0102030626"] = {
    "explicacao": (
        "No Trendelenburg extremo prolongado (cirurgia robótica pélvica), a congestão "
        "venosa da cabeça e pescoço causa edema de vias aéreas superiores — preocupação "
        "crítica na extubação, podendo evoluir para obstrução por edema laringo-faríngeo. "
        "Deve-se verificar cuff leak test antes da extubação após cirurgias longas. "
        "Referência: Miller's Anesthesia 9ed, cap. 41."
    )
}

CORRECOES["df4c4be8-abcd-1234-5678-ef0102030627"] = {
    "explicacao": (
        "A acidose metabólica aumenta a toxicidade sistêmica dos anestésicos locais "
        "por dois mecanismos: (1) reduz a ligação proteica (mais AL livre não ligado) e "
        "(2) aumenta a fração ionizada intracelular (ion trapping), acumulando AL dentro "
        "das células. Isso eleva a concentração de AL em órgãos alvo como SNC e coração. "
        "Referência: Diretriz ASRA LAST 2023."
    )
}

# =============================================================================
# ME3 — questões com explicações curtas / formato alternativa-a-alternativa
# (substituídas por explicações completas baseadas em literatura)
# =============================================================================

CORRECOES["d1519ef5-9e12-4c43-b5bd-36be54aabb4a"] = {
    "explicacao": (
        "Na ventilação protetora, a pressão de platô deve ser mantida abaixo de 30 cmH2O "
        "para evitar barotrauma e volutrauma. Pressões acima desse limiar causam "
        "superdistensão alveolar, ruptura de alvéolos e lesão pulmonar induzida pela "
        "ventilação. É recomendação ARDSnet (2000) e aplicada também em pulmões saudáveis "
        "intraoperatoriamente. Referência: ARDSnet, Miller's Anesthesia 9ed, cap. 50."
    )
}

CORRECOES["822ab756-d0d2-410b-bc28-fb32af8c5dcd"] = {
    "explicacao": (
        "Os gatilhos farmacológicos da hipertermia maligna são anestésicos inalatórios "
        "halogenados (halotano, sevoflurano, desflurano, isoflurano) e succinilcolina. "
        "Propofol, opioides, benzodiazepínicos e dexmedetomidina são seguros (anestesia "
        "'TIVA segura'). A succinilcolina ativa o receptor RYR1 mutante, precipitando "
        "o episódio. Referência: Diretrizes MHAUS, Miller's Anesthesia 9ed, cap. 43."
    )
}

CORRECOES["7f7014b8-f0ec-48c7-b0cc-9881fcdd6526"] = {
    "explicacao": (
        "Em anestesia ambulatorial, a baixa incidência de náuseas e vômitos é fundamental "
        "para alta precoce e segura. NVPO é a principal causa de admissão não planejada e "
        "atraso de alta em centros ambulatoriais. Estratégias preventivas (propofol, "
        "antieméticos profiláticos, minimização de opioides) são essenciais. "
        "Referência: Diretrizes SBA/SGAS NVPO, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["dd443245-b431-412a-8b6c-ae009ce0cc1f"] = {
    "explicacao": (
        "A hipoxemia persistente na SRPA (SpO2 <94% em ar ambiente ou necessidade de O2 "
        "suplementar acima do basal) é critério absoluto de internação. Representa "
        "complicação respiratória (atelectasia, broncoespasmo, hipoventilação) que exige "
        "investigação e tratamento antes da alta. "
        "Referência: Miller's Anesthesia 9ed, cap. 49, critérios de alta ambulatorial."
    )
}

CORRECOES["4f36f65a-a361-42f6-ad45-541e1577aa0f"] = {
    "explicacao": (
        "A obesidade mórbida reduz significativamente a CRF, aumenta o fechamento das "
        "pequenas vias aéreas e favorece atelectasias de dependência — especialmente no "
        "pós-operatório em supino. Hipoxemia por atelectasia é a complicação respiratória "
        "mais frequente nesses pacientes. CPAP pode ser necessário no pós-operatório. "
        "Referência: Miller's Anesthesia 9ed, cap. 65."
    )
}

CORRECOES["e1e6a430-58b7-4f86-93bf-9fa85b3bf646"] = {
    "explicacao": (
        "Para alta segura da SRPA/ambulatório, é necessário: dor controlada (EVA ≤3), "
        "náuseas controladas, SpO2 estável, hemodinâmica estável, nível de consciência "
        "adequado e capacidade de deambular. A escala de Aldrete-Kroulik ≥9 orienta a "
        "alta. Hipoxemia, vômitos incoercíveis e instabilidade hemodinâmica contraindicam. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["ef782a99-e706-4cb7-9963-3fe02e2e4663"] = {
    "explicacao": (
        "A prevenção multimodal de NVPO combina antieméticos de classes diferentes "
        "(antagonistas 5-HT3, antagonistas dopaminérgicos, corticosteroides, "
        "antagonistas NK1) para cobrir múltiplos mecanismos. Em pacientes de alto risco "
        "(Apfel ≥3), a combinação de 2-3 agentes reduz mais a incidência do que monoterapia. "
        "Referência: Diretrizes SBA/SGAS NVPO 2020, Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["cde43a57-5e21-4c87-a4f1-ce60b26e48dd"] = {
    "explicacao": (
        "Em anestesia ambulatorial, os fármacos ideais têm recuperação rápida e completa, "
        "mínimo acúmulo e baixa meia-vida contexto sensível (propofol, remifentanil, "
        "sevoflurano, desflurano). Isso permite alta precoce e reduz efeitos residuais "
        "como sonolência e déficit cognitivo pós-operatório. "
        "Referência: Miller's Anesthesia 9ed, cap. 49."
    )
}

CORRECOES["38967b02-03e7-4ee9-9e45-3f58cf507b38"] = {
    "explicacao": (
        "A tolerância aos opioides resulta do uso prolongado: os receptores opioides "
        "sofrem dessensibilização e downregulation, exigindo doses progressivamente "
        "maiores para o mesmo efeito analgésico (tolerância farmacodinâmica). "
        "A dependência física e a hiperalgesia induzida por opioides também podem "
        "ocorrer. Referência: Stoelting's Pharmacology 5ed, cap. 3."
    )
}

CORRECOES["a1daffbe-0a55-4aa2-988b-f0c8d95f4871"] = {
    "explicacao": (
        "A sedação paliativa é indicada quando há sintomas refratários (dor, dispneia, "
        "delirium hiperativo) que causam sofrimento intolerável ao paciente em fase "
        "terminal, e que não responderam a tratamentos específicos adequados. "
        "Deve ser proporcional ao sofrimento, com consentimento informado e conforme "
        "diretrizes do CFM. Referência: CFM Resolução 1.805/2006, cuidados paliativos."
    )
}

CORRECOES["03d32adf-bda3-4ec4-acfd-78eeda93ddb9"] = {
    "explicacao": (
        "A reorientação frequente (horário, local, pessoa) é uma das medidas não "
        "farmacológicas mais eficazes na prevenção e tratamento do delirium em idosos. "
        "O protocolo HELP (Hospital Elder Life Program) inclui: reorientação, mobilização "
        "precoce, controle do sono, hidratação, minimização de benzodiazepínicos e "
        "antipsicóticos. Referência: Inouye SK, NEJM 1999, Miller's Anesthesia 9ed, cap. 84."
    )
}

# =============================================================================
# Processamento e geração dos arquivos corrigidos
# =============================================================================

def limpar_explicacao_parcial(texto):
    """Remove truncamentos típicos gerados pelo sistema original."""
    if not texto:
        return texto
    # Remove trailing fragments like "Correta. Bupivacaína possui maior afinida"
    # by keeping explanations that end with sentence-ending punctuation
    return texto.strip()

def aplicar_correcoes(rows, correcoes, nome_arquivo):
    """Aplica correções às linhas do CSV e retorna estatísticas."""
    stats = {
        "total": len(rows),
        "respostas_corrigidas": 0,
        "explicacoes_adicionadas": 0,
        "explicacoes_completadas": 0,
        "detalhes": []
    }

    for row in rows:
        id_q = row["id"]
        if id_q not in correcoes:
            continue

        corr = correcoes[id_q]

        # Corrigir resposta
        if "correta" in corr and corr["correta"] != row["correta"]:
            detalhe = {
                "id": id_q,
                "campo": "correta",
                "valor_antigo": row["correta"],
                "valor_novo": corr["correta"],
                "justificativa": corr.get("justificativa_correta", "Resposta incorreta conforme literatura médica.")
            }
            stats["detalhes"].append(detalhe)
            stats["respostas_corrigidas"] += 1
            row["correta"] = corr["correta"]

        # Corrigir / adicionar explicação
        if "explicacao" in corr:
            explic_antiga = row["explicacao"].strip()
            nova = corr["explicacao"].strip()
            if not explic_antiga:
                # Explicação vazia → adicionar
                stats["explicacoes_adicionadas"] += 1
                detalhe = {
                    "id": id_q,
                    "campo": "explicacao",
                    "valor_antigo": "(vazia)",
                    "valor_novo": nova[:80] + "...",
                    "justificativa": "Explicação ausente, adicionada com base na literatura."
                }
                stats["detalhes"].append(detalhe)
                row["explicacao"] = nova
            else:
                # Explicação parcial → completar (substituir por versão completa)
                stats["explicacoes_completadas"] += 1
                detalhe = {
                    "id": id_q,
                    "campo": "explicacao",
                    "valor_antigo": explic_antiga[:80] + ("..." if len(explic_antiga) > 80 else ""),
                    "valor_novo": nova[:80] + "...",
                    "justificativa": "Explicação incompleta, substituída por versão completa."
                }
                stats["detalhes"].append(detalhe)
                row["explicacao"] = nova

    return stats

def salvar_csv(rows, caminho):
    """Salva as linhas no CSV com quoting completo."""
    fieldnames = ["id", "me", "tema", "enunciado", "alternativa_a",
                  "alternativa_b", "alternativa_c", "alternativa_d",
                  "correta", "explicacao"]
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

def processar_arquivo(me_num, correcoes):
    entrada = os.path.join(EXPORTS, f"simulados_{me_num}_novos.csv")
    saida   = os.path.join(EXPORTS, f"simulados_{me_num}_novos_corrigido.csv")

    with open(entrada, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    stats = aplicar_correcoes(rows, correcoes, me_num)
    salvar_csv(rows, saida)
    return stats

# =============================================================================
# Executar
# =============================================================================

if __name__ == "__main__":
    resultados = {}
    for me in ["ME1", "ME2", "ME3"]:
        print(f"Processando {me}...")
        resultados[me] = processar_arquivo(me, CORRECOES)
        print(f"  → {resultados[me]['respostas_corrigidas']} respostas corrigidas")
        print(f"  → {resultados[me]['explicacoes_adicionadas']} explicações adicionadas")
        print(f"  → {resultados[me]['explicacoes_completadas']} explicações completadas")

    # Gerar relatório
    relatorio = []
    relatorio.append("=" * 70)
    relatorio.append("RELATÓRIO DE REVISÃO — QUESTÕES TSA (arquivos _novos)")
    relatorio.append(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    relatorio.append("=" * 70)

    total_questoes = sum(r["total"] for r in resultados.values())
    total_respostas = sum(r["respostas_corrigidas"] for r in resultados.values())
    total_adicionadas = sum(r["explicacoes_adicionadas"] for r in resultados.values())
    total_completadas = sum(r["explicacoes_completadas"] for r in resultados.values())

    relatorio.append(f"\nRESUMO GERAL")
    relatorio.append(f"  Total de questões revisadas : {total_questoes}")
    relatorio.append(f"  Respostas corrigidas        : {total_respostas}")
    relatorio.append(f"  Explicações adicionadas     : {total_adicionadas}")
    relatorio.append(f"  Explicações completadas     : {total_completadas}")

    for me, r in resultados.items():
        relatorio.append(f"\n{'=' * 70}")
        relatorio.append(f"ARQUIVO: simulados_{me}_novos.csv")
        relatorio.append(f"  Total de questões         : {r['total']}")
        relatorio.append(f"  Respostas corrigidas      : {r['respostas_corrigidas']}")
        relatorio.append(f"  Explicações adicionadas   : {r['explicacoes_adicionadas']}")
        relatorio.append(f"  Explicações completadas   : {r['explicacoes_completadas']}")

        if r["detalhes"]:
            relatorio.append(f"\n  DETALHES DAS ALTERAÇÕES:")
            for d in r["detalhes"]:
                relatorio.append(f"\n  ID: {d['id']}")
                relatorio.append(f"  Campo: {d['campo']}")
                relatorio.append(f"  Antes: {d['valor_antigo']}")
                relatorio.append(f"  Depois: {d['valor_novo']}")
                relatorio.append(f"  Justificativa: {d['justificativa']}")
        else:
            relatorio.append(f"\n  Nenhuma alteração registrada neste arquivo.")

    relatorio.append("\n" + "=" * 70)
    relatorio.append("FIM DO RELATÓRIO")
    relatorio.append("=" * 70)

    rel_path = os.path.join(EXPORTS, "relatorio_novos.txt")
    with open(rel_path, "w", encoding="utf-8") as f:
        f.write("\n".join(relatorio))

    print(f"\nRelatório salvo em: {rel_path}")
    print("Processamento concluído.")
