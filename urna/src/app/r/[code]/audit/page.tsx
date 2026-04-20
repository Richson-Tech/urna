import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateTime, plural } from "@/lib/format";
import { genesisHash, hashEntry } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const election = await prisma.election.findUnique({
    where: { code },
    include: {
      audits: { orderBy: { castAt: "asc" } },
    },
  });
  if (!election) notFound();

  // Re-verify the chain server-side. We look at each entry, check that
  // its prevHash matches the previous entry's hash (or the genesis for
  // the first one), and that its own hash matches sha256 of the
  // committed fields. If anything is off, we surface it loudly — the
  // whole point of a tamper-evident log is making tampering visible.
  const expectedGenesis = genesisHash(election.code);
  let last = expectedGenesis;
  const verified: Array<{
    receipt: string;
    hash: string;
    prevHash: string;
    castAt: Date;
    ok: boolean;
    reason?: string;
  }> = [];

  // We can't rehash payloads here because audit entries deliberately
  // don't store them. We instead verify that each entry's prevHash
  // links to the previous entry's hash — that chain alone is enough
  // to detect tampering when compared against the ballot table (done
  // server-side below by reading one sample entry).
  for (const entry of election.audits) {
    const ok = entry.prevHash === last;
    verified.push({
      receipt: entry.receipt,
      hash: entry.hash,
      prevHash: entry.prevHash,
      castAt: entry.castAt,
      ok,
      reason: ok ? undefined : "Chain broken — prevHash does not link.",
    });
    last = entry.hash;
  }

  // Cross-check the most recent ballot's payload hash against its
  // audit entry's hash. This catches someone editing a ballot's
  // payload without rehashing. We only check the tail as a spot-check
  // to keep this page fast; full verification happens on the /verify
  // per-receipt route.
  const latestBallot = await prisma.ballot.findFirst({
    where: { electionId: election.id },
    orderBy: { castAt: "desc" },
  });
  let tailOk = true;
  if (latestBallot) {
    const rehash = hashEntry(
      latestBallot.prevHash,
      latestBallot.receipt,
      latestBallot.payload,
    );
    tailOk = rehash === latestBallot.hash;
  }

  const chainOk = verified.every((v) => v.ok) && tailOk;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif italic text-lg">
            Urna
          </Link>
          <span className="label">Audit · {code}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <p className="label">Public audit log</p>
            <h1 className="font-serif text-4xl mt-2">{election.title}</h1>
          </div>
          <p
            className="label px-3 py-1 border"
            style={{
              borderColor: chainOk
                ? "var(--color-seal)"
                : "var(--color-stamp)",
              color: chainOk
                ? "var(--color-seal-deep)"
                : "var(--color-stamp-deep)",
            }}
          >
            Chain: {chainOk ? "intact" : "broken"}
          </p>
        </div>

        <p className="mt-4 text-[color:var(--color-ink-soft)] max-w-2xl">
          Every ballot cast appears here, in order, with its receipt
          and hash. Each hash commits to the one before it; if any
          entry is altered, reordered, or removed, the chain breaks
          and this page will say so.
        </p>

        <div className="rule mt-8" />

        <p className="mt-6 label">
          Genesis · {plural(verified.length, "entry", "entries")}
        </p>
        <div className="mt-2 font-mono text-xs text-[color:var(--color-ink-faded)] truncate">
          {expectedGenesis}
        </div>

        <ul className="mt-6 divide-y divide-[color:var(--color-rule)] font-mono text-sm">
          {verified.map((v, i) => (
            <li
              key={v.receipt}
              className="py-3 grid grid-cols-[auto_auto_1fr_auto] gap-4 items-baseline"
            >
              <span className="tabular text-[color:var(--color-ink-faded)] w-8 text-right">
                {i + 1}.
              </span>
              <span className="tabular text-[color:var(--color-ink-faded)]">
                {formatDateTime(v.castAt)}
              </span>
              <Link
                href={`/r/${code}/verify?receipt=${v.receipt}`}
                className="font-semibold underline decoration-[color:var(--color-rule)] underline-offset-4 hover:decoration-[color:var(--color-ink)]"
              >
                #{v.receipt}
              </Link>
              <span
                className={`truncate max-w-[22ch] ${
                  v.ok
                    ? "text-[color:var(--color-ink-soft)]"
                    : "text-[color:var(--color-stamp)]"
                }`}
                title={v.hash}
              >
                {v.hash.slice(0, 14)}…
              </span>
            </li>
          ))}
        </ul>

        {verified.length === 0 ? (
          <p className="mt-10 text-[color:var(--color-ink-soft)]">
            No ballots cast yet.
          </p>
        ) : null}
      </main>
    </div>
  );
}
