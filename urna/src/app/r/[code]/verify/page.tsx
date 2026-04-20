import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sigil } from "@/lib/sigil";
import { formatDateTime } from "@/lib/format";
import { hashEntry } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * /r/:code/verify — a voter looks up their receipt and we tell them
 * (a) whether the ballot is in our log, (b) when it was cast, and
 * (c) that its stored hash still matches what the chain expects.
 *
 * This is the "public proof" arm of Urna's trust model: voters never
 * have to take our word for it that their ballot was counted.
 */

interface VerificationResult {
  status: "missing" | "valid" | "broken";
  castAt?: Date;
  hash?: string;
  prevHash?: string;
  computed?: string;
}

async function verify(
  electionId: string,
  receipt: string,
): Promise<VerificationResult> {
  const ballot = await prisma.ballot.findUnique({
    where: { receipt },
  });
  if (!ballot || ballot.electionId !== electionId) {
    return { status: "missing" };
  }
  const computed = hashEntry(ballot.prevHash, ballot.receipt, ballot.payload);
  return {
    status: computed === ballot.hash ? "valid" : "broken",
    castAt: ballot.castAt,
    hash: ballot.hash,
    prevHash: ballot.prevHash,
    computed,
  };
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { code } = await params;
  const { receipt } = await searchParams;

  const election = await prisma.election.findUnique({ where: { code } });
  if (!election) notFound();

  const cleaned = receipt?.trim().toUpperCase().replace(/\s+/g, "");
  const result = cleaned ? await verify(election.id, cleaned) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-2xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif italic text-lg">
            Urna
          </Link>
          <span className="label">Verify · {code}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center gap-6">
          <Sigil code={election.code} size={96} tone="ink" />
          <div>
            <p className="label">Ballot verification</p>
            <h1 className="font-serif text-3xl mt-1">{election.title}</h1>
          </div>
        </div>

        <div className="rule mt-8" />

        <form method="GET" className="mt-8 flex items-end gap-3">
          <div className="flex-1">
            <label className="label block mb-2" htmlFor="receipt">
              Enter your receipt
            </label>
            <input
              id="receipt"
              name="receipt"
              defaultValue={cleaned}
              className="field font-mono text-lg tracking-widest"
              placeholder="X7-9K2-QFA"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
          <button className="btn btn-primary">Look up</button>
        </form>

        {result ? <ResultDisplay result={result} /> : null}

        <p className="mt-10 label text-[color:var(--color-ink-faded)]">
          Your receipt doesn't reveal how you voted — it only proves
          the ballot was counted. If anyone changes the log after the
          fact, your hash stops matching and this page will tell you.
        </p>
      </main>
    </div>
  );
}

function ResultDisplay({ result }: { result: VerificationResult }) {
  if (result.status === "missing") {
    return (
      <div className="mt-10 sheet p-8">
        <p className="font-serif text-2xl italic">
          No ballot with that receipt.
        </p>
        <p className="mt-2 text-[color:var(--color-ink-soft)]">
          Check for typos — receipts use letters and numbers only,
          no lowercase, no <span className="font-mono">0</span> /{" "}
          <span className="font-mono">O</span> or{" "}
          <span className="font-mono">1</span> /{" "}
          <span className="font-mono">I</span>.
        </p>
      </div>
    );
  }

  if (result.status === "valid") {
    return (
      <div className="mt-10 sheet p-8">
        <p className="label" style={{ color: "var(--color-seal-deep)" }}>
          Counted · hash matches
        </p>
        <p className="mt-2 font-serif text-2xl italic">
          This ballot is in the log, unaltered.
        </p>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-mono text-sm">
          <dt className="label self-baseline">Cast at</dt>
          <dd className="tabular">
            {result.castAt ? formatDateTime(result.castAt) : "—"}
          </dd>
          <dt className="label self-baseline">Prev hash</dt>
          <dd
            className="truncate"
            title={result.prevHash ?? ""}
          >
            {result.prevHash}
          </dd>
          <dt className="label self-baseline">This hash</dt>
          <dd className="truncate" title={result.hash ?? ""}>
            {result.hash}
          </dd>
        </dl>
      </div>
    );
  }

  return (
    <div className="mt-10 sheet p-8 border-[color:var(--color-stamp)]">
      <p className="label" style={{ color: "var(--color-stamp-deep)" }}>
        Chain broken
      </p>
      <p className="mt-2 font-serif text-2xl italic">
        This ballot's recorded hash no longer matches what the chain
        expects.
      </p>
      <p className="mt-3 text-[color:var(--color-ink-soft)]">
        Something has changed since this ballot was cast. This is
        the kind of signal the audit log exists to produce.
      </p>
    </div>
  );
}
