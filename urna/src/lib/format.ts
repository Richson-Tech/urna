/** Pluralize for the simple cases — "1 vote", "12 votes". */
export function plural(n: number, singular: string, plural = `${singular}s`) {
  return n === 1 ? `1 ${singular}` : `${n.toLocaleString()} ${plural}`;
}

/** Format a percentage with one decimal, e.g. 0.624 → "62.4%". */
export function percent(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Format a date like "Apr 20, 2026 · 14:30". Uses the server locale on
 * server render and will re-render client-side for TZ fidelity. */
export function formatDateTime(d: Date): string {
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

/** Human-relative time: "in 3h", "2d ago". Short and civic. */
export function relativeTime(d: Date, now = new Date()): string {
  const diffMs = d.getTime() - now.getTime();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  const units: Array<[string, number]> = [
    ["y", 1000 * 60 * 60 * 24 * 365],
    ["mo", 1000 * 60 * 60 * 24 * 30],
    ["d", 1000 * 60 * 60 * 24],
    ["h", 1000 * 60 * 60],
    ["m", 1000 * 60],
    ["s", 1000],
  ];
  for (const [label, ms] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      return future ? `in ${n}${label}` : `${n}${label} ago`;
    }
  }
  return "just now";
}
