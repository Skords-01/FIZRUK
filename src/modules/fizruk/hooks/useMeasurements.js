import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "fizruk_measurements_v1";

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const MEASURE_FIELDS = [
  { id: "weightKg", label: "Вага", unit: "кг" },
  { id: "bodyFatPct", label: "% жиру", unit: "%" },
  { id: "neckCm", label: "Шия", unit: "см" },
  { id: "chestCm", label: "Груди", unit: "см" },
  { id: "waistCm", label: "Талія", unit: "см" },
  { id: "hipsCm", label: "Стегна (обхват)", unit: "см" },
  { id: "bicepCm", label: "Біцепс", unit: "см" },
  { id: "forearmCm", label: "Передпліччя", unit: "см" },
  { id: "thighCm", label: "Стегно", unit: "см" },
  { id: "calfCm", label: "Литка", unit: "см" },
];

export function useMeasurements() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? safeParse(raw, []) : [];
      if (Array.isArray(parsed)) setEntries(parsed);
    } catch {}
  }, []);

  const persist = useCallback((next) => {
    setEntries(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const addEntry = useCallback((entry) => {
    const e = { id: uid(), at: new Date().toISOString(), ...entry };
    persist([e, ...entries]);
    return e;
  }, [persist, entries]);

  const deleteEntry = useCallback((id) => {
    persist(entries.filter(e => e.id !== id));
  }, [persist, entries]);

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
  }, [entries]);

  return { entries: sorted, addEntry, deleteEntry };
}

