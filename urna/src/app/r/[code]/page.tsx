import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sigil } from "@/lib/sigil";
import { tally, type BallotPayload } from "@/lib/tally";
import { formatDateTime, plural, relativeTime } from "@/lib/format";
import { ResultsPanel } from "@/components/ResultsPanel";

export const dynamic = "force-dynamic";

export default async function PublicResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const election = await prisma.election.findUnique({
    where: { code },
    include: {
      options: { orderBy: { position: "asc" } },
      ballots: { select: { payload: true } },
    },
  });
  if (!election) notFound();

  // Respect the creator's choice to keep results hidden until close.
  const hideUntilClosed = !election.publicResults && election.status === "OPEN";
  const result = hideUntilClosed
    ? null
    : tally(
        election.method,
        election.options,
        election.ballots.map((b) => JSON.parse(b.payload) as BallotPayload),
      );

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif italic text-lg">
            Urna
          </Link>
          <span className="label">Results · {code}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-start gap-8">
          <div className="hidden md:block shrink-0">
            <Sigil
              code={election.code}
              size={120}
              tone={election.status === "CLOSED" ? "seal" : "stamp"}
            />
          </div>
          <div className="flex-1">
            <p className="label">
              {election.status === "OPEN"
                ? "Voting in progress"
                : election.status === "CLOSED"
                ? "Voting has closed"
                : "Draft"}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl mt-2 leading-tight">
              {election.title}
            </h1>
            <p className="mt-4 label">
              {plural(election.ballots.length, "ballot")} cast ·{" "}
              {election.closesAt
                ? `${
                    election.status === "CLOSED" ? "closed" : "closes"
                  } ${formatDateTime(election.closesAt)}`
                : `opened ${relativeTime(election.opensAt ?? election.createdAt)}`}
            </p>
          </div>
        </div>

        <div className="rule mt-10" />

        {hideUntilClosed ? (
          <div className="mt-16 sheet p-10 text-center">
            <p className="font-serif italic text-2xl">
              The count is sealed until voting closes.
            </p>
            <p className="mt-3 text-[color:var(--color-ink-soft)]">
              The organizer has chosen to keep results hidden while
              ballots are still being cast. Check back after the
              closing time.
            </p>
          </div>
        ) : (
          <ResultsPanel
            initial={result!}
            code={code}
            status={election.status}
          />
        )}

        <div className="mt-16 flex items-center justify-center gap-3 flex-wrap">
          {election.status === "OPEN" ? (
            <Link href={`/v/${code}`} className="btn btn-primary">
              Cast your ballot →
            </Link>
          ) : null}
          <Link href={`/r/${code}/audit`} className="btn btn-ghost">
            Audit log
          </Link>
          <Link href={`/r/${code}/verify`} className="btn btn-ghost">
            Verify a receipt
          </Link>
        </div>
      </main>
    </div>
  );
}
