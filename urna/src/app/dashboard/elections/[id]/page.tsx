import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { Sigil } from "@/lib/sigil";
import { plural, formatDateTime, relativeTime } from "@/lib/format";
import type { BallotPayload } from "@/lib/tally";
import { tally } from "@/lib/tally";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ShareCard } from "@/components/ShareCard";

async function openElection(electionId: string) {
  "use server";
  const user = await currentUser();
  if (!user) throw new Error("Not authorized");
  const election = await prisma.election.findFirst({
    where: { id: electionId, creatorId: user.id },
  });
  if (!election) throw new Error("Not found");
  if (election.status === "CLOSED") {
    throw new Error("A closed election cannot be re-opened.");
  }
  await prisma.election.update({
    where: { id: election.id },
    data: { status: "OPEN", opensAt: election.opensAt ?? new Date() },
  });
  redirect(`/dashboard/elections/${electionId}`);
}

async function closeElection(electionId: string) {
  "use server";
  const user = await currentUser();
  if (!user) throw new Error("Not authorized");
  const election = await prisma.election.findFirst({
    where: { id: electionId, creatorId: user.id },
  });
  if (!election) throw new Error("Not found");
  await prisma.election.update({
    where: { id: election.id },
    data: { status: "CLOSED", closesAt: new Date() },
  });
  redirect(`/dashboard/elections/${electionId}`);
}

async function deleteElection(electionId: string) {
  "use server";
  const user = await currentUser();
  if (!user) throw new Error("Not authorized");
  await prisma.election.deleteMany({
    where: { id: electionId, creatorId: user.id },
  });
  redirect("/dashboard");
}

export default async function ElectionManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = (await currentUser())!;
  const { id } = await params;
  const { created } = await searchParams;

  const election = await prisma.election.findFirst({
    where: { id, creatorId: user.id },
    include: {
      options: { orderBy: { position: "asc" } },
      ballots: { orderBy: { castAt: "asc" } },
    },
  });
  if (!election) notFound();

  const parsedBallots: BallotPayload[] = election.ballots.map(
    (b) => JSON.parse(b.payload) as BallotPayload,
  );
  const result = tally(election.method, election.options, parsedBallots);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const voteUrl = `${baseUrl}/v/${election.code}`;

  return (
    <div className="space-y-12">
      {created ? (
        <div className="border border-[color:var(--color-seal)] bg-[color:var(--color-paper-deep)]/40 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="label text-[color:var(--color-seal-deep)]">
              Printed and sealed
            </p>
            <p className="font-serif text-xl mt-0.5">
              Your election is ready to share.
            </p>
          </div>
          <Link href={voteUrl} target="_blank" className="btn btn-ghost">
            Preview the ballot →
          </Link>
        </div>
      ) : null}

      <header className="grid gap-10 md:grid-cols-[auto_1fr_auto] items-start">
        <Sigil
          code={election.code}
          size={140}
          tone={
            election.status === "OPEN"
              ? "stamp"
              : election.status === "CLOSED"
              ? "seal"
              : "ink"
          }
        />
        <div>
          <p className="label flex items-center gap-2">
            <StatusDot status={election.status} /> {election.status}
            <span className="opacity-50">·</span>
            {methodLabel(election.method)}
          </p>
          <h1 className="font-serif text-4xl mt-2 leading-tight">
            {election.title}
          </h1>
          {election.description ? (
            <p className="mt-4 text-[color:var(--color-ink-soft)] max-w-2xl whitespace-pre-wrap">
              {election.description}
            </p>
          ) : null}
          <p className="mt-4 label">
            Created {relativeTime(election.createdAt)} ·{" "}
            {plural(election.options.length, "option")} ·{" "}
            {plural(election.ballots.length, "ballot")} cast
            {election.closesAt
              ? ` · ${
                  election.status === "CLOSED" ? "closed" : "closes"
                } ${formatDateTime(election.closesAt)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {election.status === "DRAFT" ? (
            <form action={openElection.bind(null, election.id)}>
              <button className="btn btn-stamp w-full">Open voting</button>
            </form>
          ) : null}
          {election.status === "OPEN" ? (
            <form action={closeElection.bind(null, election.id)}>
              <button className="btn btn-primary w-full">Close voting</button>
            </form>
          ) : null}
          <Link
            href={`/v/${election.code}`}
            target="_blank"
            className="btn btn-ghost"
          >
            Open ballot ↗
          </Link>
          <Link
            href={`/r/${election.code}`}
            target="_blank"
            className="btn btn-ghost"
          >
            Public results ↗
          </Link>
        </div>
      </header>

      <ShareCard
        voteUrl={voteUrl}
        code={election.code}
        passcode={election.passcode}
      />

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-3xl italic">The count</h2>
          <p className="label">
            Live · updates automatically
          </p>
        </div>
        <div className="rule" />
        <ResultsPanel
          initial={result}
          code={election.code}
          status={election.status}
          showRoundsByDefault
        />
      </section>

      <section>
        <h2 className="font-serif text-3xl italic mb-4">Ballots cast</h2>
        <div className="rule" />
        {election.ballots.length === 0 ? (
          <p className="mt-8 text-[color:var(--color-ink-soft)]">
            No ballots yet. Share the link and they'll appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-rule)] font-mono text-sm">
            {election.ballots.slice(-30).reverse().map((b) => (
              <li
                key={b.id}
                className="py-3 grid grid-cols-[auto_1fr_auto] gap-4 items-baseline"
              >
                <span className="tabular text-[color:var(--color-ink-faded)]">
                  {formatDateTime(b.castAt)}
                </span>
                <span>#{b.receipt}</span>
                <span
                  className="truncate text-[color:var(--color-ink-faded)]"
                  title={b.hash}
                >
                  {b.hash.slice(0, 10)}…{b.hash.slice(-6)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pt-10 border-t border-[color:var(--color-rule)]">
        <h2 className="font-serif text-2xl italic">Danger zone</h2>
        <p className="mt-2 text-[color:var(--color-ink-soft)] max-w-xl">
          Deleting an election removes its ballots and its audit log.
          If you've promised voters a public record, delete with care.
        </p>
        <form
          action={deleteElection.bind(null, election.id)}
          className="mt-4"
        >
          <button className="btn btn-ghost text-[color:var(--color-stamp-deep)] border-[color:var(--color-stamp)]/40 hover:border-[color:var(--color-stamp)]">
            Delete this election
          </button>
        </form>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "OPEN"
      ? "var(--color-stamp)"
      : status === "CLOSED"
      ? "var(--color-seal)"
      : "var(--color-ink-faded)";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: color }}
    />
  );
}

function methodLabel(m: string) {
  switch (m) {
    case "SINGLE":
      return "Single-choice";
    case "APPROVAL":
      return "Approval";
    case "RANKED":
      return "Ranked-choice";
    default:
      return m;
  }
}
