function isPerfEnabled() {
  try {
    return localStorage.getItem("hub_perf") === "1";
  } catch {
    return false;
  }
}

export function perfMark(name) {
  if (!isPerfEnabled()) return null;
  const t = performance.now();
  return { name, t };
}

export function perfEnd(mark, extra = null) {
  if (!mark || !isPerfEnabled()) return;
  const dt = performance.now() - mark.t;
  try {
    // keep it compact; visible only when enabled via localStorage flag
    console.debug(`[perf] ${mark.name}: ${dt.toFixed(1)}ms`, extra ?? "");
  } catch {
    /* ignore */
  }
  return dt;
}

