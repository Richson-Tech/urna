import type { VotingMethod } from "@prisma/client";

/**
 * Ballot payload shape. For every method we store an ordered array of
 * option IDs:
 *   SINGLE    → one ID
 *   APPROVAL  → zero or more IDs, order irrelevant
 *   RANKED    → ordered preference list, earlier = more preferred
 * Keeping a single shape across methods keeps the DB simple and lets
 * us add new methods (Borda, STV, etc.) without migrations.
 */
export type BallotPayload = string[];

export interface TallyOption {
  id: string;
  label: string;
  subtitle?: string | null;
}

export interface TallyResult {
  method: VotingMethod;
  totalBallots: number;
  // Ordered from winner to loser. For RANKED, this reflects the final
  // IRV ranking (winner first, then runoff-eliminated in reverse).
  standings: Array<{
    optionId: string;
    label: string;
    subtitle?: string | null;
    votes: number;
    // 0..1 — share of ballots that named this option (approval) or
    // first-round share (ranked). For SINGLE it's just the vote share.
    share: number;
    // Only meaningful for RANKED: the round the option was eliminated
    // in (0 = never eliminated / winner).
    eliminatedRound?: number;
  }>;
  // For RANKED elections, the per-round breakdown — lets us draw the
  // instant-runoff "waterfall" chart on the results page.
  rounds?: RankedRound[];
}

export interface RankedRound {
  round: number;
  counts: Record<string, number>;
  eliminated: string | null;
  majority: string | null;
}

export function tally(
  method: VotingMethod,
  options: TallyOption[],
  ballots: BallotPayload[],
): TallyResult {
  if (method === "SINGLE") return tallySingle(options, ballots);
  if (method === "APPROVAL") return tallyApproval(options, ballots);
  return tallyRanked(options, ballots);
}

function tallySingle(
  options: TallyOption[],
  ballots: BallotPayload[],
): TallyResult {
  const counts: Record<string, number> = {};
  for (const o of options) counts[o.id] = 0;
  for (const b of ballots) {
    const id = b[0];
    if (id && id in counts) counts[id] += 1;
  }
  const total = ballots.length;
  const standings = options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      subtitle: o.subtitle,
      votes: counts[o.id] ?? 0,
      share: total > 0 ? (counts[o.id] ?? 0) / total : 0,
    }))
    .sort((a, b) => b.votes - a.votes);
  return { method: "SINGLE", totalBallots: total, standings };
}

function tallyApproval(
  options: TallyOption[],
  ballots: BallotPayload[],
): TallyResult {
  const counts: Record<string, number> = {};
  for (const o of options) counts[o.id] = 0;
  for (const b of ballots) {
    const seen = new Set<string>();
    for (const id of b) {
      // Defensive: ignore duplicates within a single ballot — approval
      // is a set, not a multiset, and we don't want a malformed client
      // to inflate its own ballot.
      if (seen.has(id)) continue;
      seen.add(id);
      if (id in counts) counts[id] += 1;
    }
  }
  const total = ballots.length;
  const standings = options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      subtitle: o.subtitle,
      votes: counts[o.id] ?? 0,
      // For approval the "share" is the approval rate — what % of
      // voters approved of this option. Often > 100% across options.
      share: total > 0 ? (counts[o.id] ?? 0) / total : 0,
    }))
    .sort((a, b) => b.votes - a.votes);
  return { method: "APPROVAL", totalBallots: total, standings };
}

/**
 * Instant-runoff voting (IRV).
 * Each round:
 *   1. Count every ballot's top still-in-running preference.
 *   2. If someone has > 50%, they win.
 *   3. Otherwise eliminate the lowest-scoring option.
 *      Ties broken by reverse position in the options list, which is
 *      deterministic and documented — not mathematically elegant, but
 *      being deterministic is more important than being clever.
 *   4. Repeat until a winner emerges or only one option remains.
 *
 * Exhausted ballots (ones whose entire preference list has been
 * eliminated) are simply dropped from the denominator for future
 * rounds — the standard "fractional transfer" variant — so the
 * 50% threshold is of remaining non-exhausted ballots.
 */
function tallyRanked(
  options: TallyOption[],
  ballots: BallotPayload[],
): TallyResult {
  const rounds: RankedRound[] = [];
  const eliminated = new Set<string>();
  const eliminatedOrder: string[] = [];
  let winner: string | null = null;
  let round = 0;

  while (winner === null && options.length - eliminated.size > 1) {
    round += 1;
    const counts: Record<string, number> = {};
    for (const o of options) if (!eliminated.has(o.id)) counts[o.id] = 0;

    let active = 0;
    for (const b of ballots) {
      const top = b.find((id) => !eliminated.has(id));
      if (top && top in counts) {
        counts[top] += 1;
        active += 1;
      }
    }

    // Majority check — a clean win, no more rounds needed.
    const leader = Object.entries(counts).reduce<[string, number]>(
      (best, [id, n]) => (n > best[1] ? [id, n] : best),
      ["", -1],
    );
    const majority = active > 0 && leader[1] > active / 2 ? leader[0] : null;

    let toEliminate: string | null = null;
    if (majority) {
      winner = majority;
    } else {
      const min = Math.min(...Object.values(counts));
      const losers = Object.entries(counts)
        .filter(([, n]) => n === min)
        .map(([id]) => id);
      // Tie-break: eliminate the option that appears LAST in the
      // creator-defined options list. Deterministic and audit-friendly.
      toEliminate =
        losers.length === 1
          ? losers[0]
          : [...options]
              .reverse()
              .find((o) => losers.includes(o.id))?.id ?? losers[0]!;
      eliminated.add(toEliminate);
      eliminatedOrder.push(toEliminate);
    }

    rounds.push({ round, counts, eliminated: toEliminate, majority });

    // Safety — if everyone's tied and no one can be eliminated, break.
    if (!majority && toEliminate === null) break;
  }

  // If we ran out of candidates without a majority (e.g. only one left
  // after eliminations), whoever is standing wins.
  if (!winner) {
    const survivors = options.filter((o) => !eliminated.has(o.id));
    winner = survivors[0]?.id ?? null;
  }

  const total = ballots.length;
  const firstRoundCounts = rounds[0]?.counts ?? {};
  const standings = options
    .map((o) => {
      const first = firstRoundCounts[o.id] ?? 0;
      const elimIndex = eliminatedOrder.indexOf(o.id);
      return {
        optionId: o.id,
        label: o.label,
        subtitle: o.subtitle,
        votes: first,
        share: total > 0 ? first / total : 0,
        eliminatedRound: elimIndex === -1 ? 0 : elimIndex + 1,
      };
    })
    .sort((a, b) => {
      if (a.optionId === winner) return -1;
      if (b.optionId === winner) return 1;
      // Later elimination = higher finish. (0 = never eliminated ⇒ winner,
      // already handled above.)
      return (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0);
    });

  return { method: "RANKED", totalBallots: total, standings, rounds };
}
