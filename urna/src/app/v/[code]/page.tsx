import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VOTER_COOKIE } from "@/lib/auth";
import { Sigil } from "@/lib/sigil";
import { formatDateTime, plural } from "@/lib/format";
import { Ballot } from "./Ballot";

export const dynamic = "force-dynamic";

export default async function VotePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const election = await prisma.election.findUnique({
    where: { code },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!election) notFound();

  const jar = await cookies();
  const voterToken = jar.get(VOTER_COOKIE)?.value;

  // If this browser has already voted, show their receipt instead of
  // the ballot. We fetch the ballot by (election, token) — the DB
  // enforces the one-per-token rule.
  const existingBallot = voterToken
    ? await prisma.ballot.findUnique({
        where: {
          electionId_voterToken: {
            electionId: election.id,
            voterToken,
          },
        },
      })
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif italic text-lg">
            Urna
          </Link>
          <span className="label">Ballot · {code}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-start gap-8">
          <div className="hidden md:block shrink-0">
            <Sigil
              code={election.code}
              size={120}
              tone={
                election.status === "OPEN"
                  ? "stamp"
                  : election.status === "CLOSED"
                  ? "seal"
                  : "ink"
              }
            />
          </div>
          <div className="flex-1">
            <p className="label">
              {election.status === "OPEN"
                ? "Now accepting ballots"
                : election.status === "CLOSED"
                ? "Voting has closed"
                : "Not yet open"}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl mt-2 leading-tight">
              {election.title}
            </h1>
            {election.description ? (
              <p className="mt-4 text-[color:var(--color-ink-soft)] whitespace-pre-wrap">
                {election.description}
              </p>
            ) : null}
            <p className="mt-4 label">
              {methodBlurb(election.method)} ·{" "}
              {plural(election.options.length, "option")}
              {election.closesAt
                ? ` · ${
                    election.status === "CLOSED" ? "closed" : "closes"
                  } ${formatDateTime(election.closesAt)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="rule mt-10" />

        {existingBallot ? (
          <AlreadyVoted receipt={existingBallot.receipt} code={code} />
        ) : election.status !== "OPEN" ? (
          <NotOpen status={election.status} />
        ) : (
          <Ballot
            code={code}
            method={election.method}
            passcodeRequired={Boolean(election.passcode)}
            options={election.options.map((o) => ({
              id: o.id,
              label: o.label,
              subtitle: o.subtitle,
            }))}
          />
        )}

        {election.publicResults ? (
          <p className="mt-16 label text-center">
            <Link
              href={`/r/${code}`}
              className="underline underline-offset-4 decoration-[color:var(--color-rule)] hover:decoration-[color:var(--color-ink)]"
            >
              See the live count →
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  );
}

function methodBlurb(m: string) {
  switch (m) {
    case "SINGLE":
      return "Pick one";
    case "APPROVAL":
      return "Tick every option you approve of";
    case "RANKED":
      return "Order the options, top to bottom";
    default:
      return m;
  }
}

function AlreadyVoted({ receipt, code }: { receipt: string; code: string }) {
  return (
    <div className="mt-10 sheet p-10 text-center">
      <span className="stamp">Ballot received</span>
      <p className="mt-6 font-serif text-2xl">Your vote has been counted.</p>
      <p className="mt-2 text-[color:var(--color-ink-soft)]">
        Keep this receipt. You can look it up on the public audit log
        at any time to confirm it was included.
      </p>
      <p className="mt-6 font-mono text-3xl tracking-[0.2em] tabular">
        #{receipt}
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <Link href={`/r/${code}`} className="btn btn-primary">
          See the running count →
        </Link>
        <Link href={`/r/${code}/audit`} className="btn btn-ghost">
          Open the audit log
        </Link>
      </div>
    </div>
  );
}

function NotOpen({ status }: { status: string }) {
  return (
    <div className="mt-10 sheet p-10 text-center">
      <span className="stamp" style={{ color: "var(--color-seal)" }}>
        {status === "CLOSED" ? "Closed" : "Not yet open"}
      </span>
      <p className="mt-6 font-serif text-2xl">
        {status === "CLOSED"
          ? "This election has ended."
          : "The ballot box hasn't opened yet."}
      </p>
      <p className="mt-2 text-[color:var(--color-ink-soft)]">
        {status === "CLOSED"
          ? "You can still read the results and audit the record."
          : "Check back once the organizer opens voting."}
      </p>
    </div>
  );
}
