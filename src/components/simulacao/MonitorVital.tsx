"use client";

import { useEffect, useState } from "react";

type SinaisVitais = {
  PA: string;
  FC: number;
  SpO2: number;
  ETCO2: number;
  FR: number;
  Temp: number;
};

type Props = {
  sinais_vitais: SinaisVitais;
  animado?: boolean;
};

function parseSistolica(pa: string): number {
  return parseInt(pa.split("/")[0] ?? "0");
}

function isAlerta(campo: keyof SinaisVitais, valor: number | string, sinais: SinaisVitais): boolean {
  if (campo === "PA") {
    const s = parseSistolica(sinais.PA);
    return s < 90 || s > 160;
  }
  if (campo === "FC") return (valor as number) < 50 || (valor as number) > 120;
  if (campo === "SpO2") return (valor as number) < 94;
  if (campo === "ETCO2") return (valor as number) < 25 || (valor as number) > 55;
  return false;
}

export function MonitorVital({ sinais_vitais, animado = true }: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animado) return;
    const id = setInterval(() => setBlink((b) => !b), 1000);
    return () => clearInterval(id);
  }, [animado]);

  const campos: { label: string; campo: keyof SinaisVitais; cor: string; unit: string }[] = [
    { label: "PA", campo: "PA", cor: "text-green-400", unit: "mmHg" },
    { label: "FC", campo: "FC", cor: "text-green-400", unit: "bpm" },
    { label: "SpO2", campo: "SpO2", cor: "text-cyan-400", unit: "%" },
    { label: "EtCO2", campo: "ETCO2", cor: "text-yellow-400", unit: "mmHg" },
    { label: "FR", campo: "FR", cor: "text-white", unit: "rpm" },
    { label: "Temp", campo: "Temp", cor: "text-orange-400", unit: "°C" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-black/80 p-4">
      {campos.map(({ label, campo, cor, unit }) => {
        const valor = sinais_vitais[campo];
        const alerta = isAlerta(campo, valor, sinais_vitais);
        const corFinal = alerta ? "text-red-500" : cor;
        const isFC = campo === "FC" && animado;

        return (
          <div
            key={campo}
            className={`flex flex-col items-center rounded-lg border bg-black/60 px-2 py-3 ${
              alerta ? "border-red-500/50" : "border-white/10"
            }`}
          >
            <span className="mb-1 text-[10px] font-medium uppercase tracking-widest text-gray-500">
              {label}
            </span>
            <span
              className={`text-xl font-bold tabular-nums transition-opacity ${corFinal} ${
                isFC && blink ? "opacity-50" : "opacity-100"
              }`}
            >
              {String(valor)}
            </span>
            <span className="mt-0.5 text-[9px] text-gray-600">{unit}</span>
          </div>
        );
      })}
    </div>
  );
}
