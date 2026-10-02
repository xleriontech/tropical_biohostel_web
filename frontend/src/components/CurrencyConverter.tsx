"use client";

import { useState, useEffect } from "react";

const CURRENCIES = [
  { code: "COP", symbol: "$", name: "Peso Colombiano" },
  { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano" },
  { code: "ARS", symbol: "$", name: "Peso Argentino" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
];

const FALLBACK_RATES: Record<string, number> = {
  COP: 1,
  USD: 0.000321,
  EUR: 0.000278,
  MXN: 0.005501,
  ARS: 0.484618,
  BRL: 0.001653,
  GBP: 0.000238,
};

export default function CurrencyConverter({ precioCOP, sufijo = "/ noche" }: { precioCOP: number; sufijo?: string }) {
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [selected, setSelected] = useState("COP");
  const [loadingRates, setLoadingRates] = useState(true);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/COP")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.rates) {
          const custom: Record<string, number> = { COP: 1 };
          for (const c of CURRENCIES) {
            if (c.code !== "COP" && data.rates[c.code]) {
              custom[c.code] = data.rates[c.code];
            }
          }
          setRates(custom);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRates(false));
  }, []);

  const converted = selected === "COP" ? precioCOP : precioCOP * (rates[selected] || 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold text-primary">
        {CURRENCIES.find((c) => c.code === selected)?.symbol}
        {converted.toLocaleString("es-CO", { maximumFractionDigits: selected === "COP" || selected === "ARS" || selected === "BRL" || selected === "MXN" ? 0 : 2 })}
      </span>
      <span className="text-muted-foreground">{sufijo}</span>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="ml-2 rounded-lg border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {CURRENCIES.filter((c) => rates[c.code] !== undefined).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {loadingRates ? "" : c.symbol}
          </option>
        ))}
      </select>
    </div>
  );
}
