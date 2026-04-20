"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TallyResult, RankedRound } from "@/lib/tally";
import { percent, plural } from "@/lib/format";

interface Props {
  initial: TallyResult;
  code: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  /** Show IRV rounds panel expanded by default. Set on the creator
   * dashboard; closed by default on the public results page. */
  showRoundsByDefault?: boolean;
}

/**
 * ResultsPanel — renders a TallyResult and keeps it live via SSE. Two
 * visualization modes:
 *   • SINGLE / APPROVAL: horizontal bars with animated width and a
 *     leader crown that swaps with weight as the count changes.
 *   • RANKED: same bars for the first round + a collapsible waterfall
 *     showing the IRV rounds as a connected flow.
 */
export function ResultsPanel({
  initial,
  code,
  status,
  showRoundsByDefault,
}: Props) {
  const [result, setResult] = useState(initial);
  const pulseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status !== "OPEN") return;
    const source = new EventSource(`/api/elections/${code}/stream`);
    source.addEventListener("tally", (e) => {
      try {
        const next = JSON.parse((e as MessageEvent).data) as TallyResult;
        setResult(next);
        if (pulseRef.current) {
          pulseRef.current.animate(
            [
              { background: "color-mix(in oklab, var(--color-stamp) 25%, transparent)" },
              { background: "transparent" },
            ],
            { duration: 900, easing: "ease-out" },
          );
        }
      } catch {
        /* keep existing result on malformed frame */
      }
    });
    return () => source.close();
  }, [code, status]);

  const leader = result.standings[0];
  const maxVotes = Math.max(1, ...result.standings.map((s) => s.votes));

  return (
    <div ref={pulseRef} className="mt-6 transition-colors rounded-sm">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="label">Total ballots</p>
          <p className="font-serif text-5xl tabular mt-1">
            <motion.span
              key={result.totalBallots}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {result.totalBallots.toLocaleString()}
            </motion.span>
          </p>
        </div>
        {leader && result.totalBallots > 0 ? (
          <div className="text-right">
            <p className="label">
              {result.method === "APPROVAL"
                ? "Most approved"
                : result.method === "RANKED" && status === "CLOSED"
                ? "Winner"
                : "Currently leading"}
            </p>
            <p className="font-serif text-2xl italic mt-1">{leader.label}</p>
            <p className="label mt-1">
              {plural(leader.votes, "vote")} ·{" "}
              {result.method === "APPROVAL"
                ? `${percent(leader.share)} approval`
                : percent(leader.share)}
            </p>
          </div>
        ) : null}
      </div>

      <ul className="mt-8 space-y-5">
        <AnimatePresence initial={false}>
          {result.standings.map((s, index) => (
            <motion.li
              key={s.optionId}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex items-baseline gap-3">
                  <span className="font-serif italic text-xl text-[color:var(--color-ink-faded)] w-8 tabular">
                    {index + 1}.
                  </span>
                  <span className="font-serif text-xl truncate">
                    {s.label}
                  </span>
                  {s.subtitle ? (
                    <span className="label truncate">— {s.subtitle}</span>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="tabular text-[color:var(--color-ink-soft)]">
                    {s.votes.toLocaleString()}
                  </span>
                  <span className="label w-14 text-right tabular">
                    {percent(s.share)}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 bg-[color:var(--color-paper-deep)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      index === 0 && result.totalBallots > 0
                        ? "var(--color-stamp)"
                        : "var(--color-ink)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.votes / maxVotes) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                />
              </div>
              {s.eliminatedRound && s.eliminatedRound > 0 ? (
                <p className="label mt-1 text-[color:var(--color-ink-faded)]">
                  Eliminated in round {s.eliminatedRound}
                </p>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {result.rounds && result.rounds.length > 0 ? (
        <RoundsWaterfall
          rounds={result.rounds}
          options={Object.fromEntries(
            result.standings.map((s) => [s.optionId, s.label]),
          )}
          defaultOpen={showRoundsByDefault ?? false}
        />
      ) : null}
    </div>
  );
}

/**
 * IRV rounds waterfall — a compact table + a sparkline-style flow that
 * shows how each option's vote share moves between rounds as others
 * are eliminated. A real Sankey would be prettier but also 600 lines
 * of layout math; this gets us 90% of the clarity for 10% of the cost.
 */
function RoundsWaterfall({
  rounds,
  options,
  defaultOpen,
}: {
  rounds: RankedRound[];
  options: Record<string, string>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ids = useMemo(
    () =>
      Array.from(
        new Set(rounds.flatMap((r) => Object.keys(r.counts))),
      ),
    [rounds],
  );

  if (rounds.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[color:var(--color-rule)] pt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="font-serif text-2xl italic">
          Instant-runoff rounds
        </span>
        <span className="label group-hover:text-[color:var(--color-ink)]">
          {open ? "Hide" : "Show"} · {rounds.length} rounds
        </span>
      </button>

      {open ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse font-mono text-sm">
            <thead>
              <tr>
                <th className="text-left label py-2 pr-4">Option</th>
                {rounds.map((r) => (
                  <th
                    key={r.round}
                    className="text-right label py-2 px-3 tabular"
                  >
                    R{r.round}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const values = rounds.map((r) => r.counts[id]);
                return (
                  <tr
                    key={id}
                    className="border-t border-[color:var(--color-rule)]"
                  >
                    <td className="py-2 pr-4 font-sans truncate max-w-[16rem]">
                      {options[id] ?? id}
                    </td>
                    {rounds.map((r, i) => {
                      const v = values[i];
                      const eliminated = r.eliminated === id;
                      const winner = r.majority === id;
                      return (
                        <td
                          key={r.round}
                          className={`py-2 px-3 text-right tabular ${
                            winner
                              ? "text-[color:var(--color-stamp)]"
                              : eliminated
                              ? "text-[color:var(--color-ink-faded)] line-through"
                              : v === undefined
                              ? "text-[color:var(--color-ink-faded)]"
                              : ""
                          }`}
                        >
                          {v === undefined ? "—" : v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-4 label max-w-2xl">
            Each round, the option in last place is eliminated and their
            ballots transfer to the next-preferred option still standing.
            The first option to cross 50% of remaining non-exhausted
            ballots wins.
          </p>
        </div>
      ) : null}
    </section>
  );
}
