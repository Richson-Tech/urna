import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { Sigil } from "@/lib/sigil";
import { plural, relativeTime, formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const user = (await currentUser())!;
  const elections = await prisma.election.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { ballots: true, options: true } },
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="label">Your registry</p>
          <h1 className="font-serif text-4xl mt-2">
            {elections.length > 0
              ? `${plural(elections.length, "election")} on file`
              : "No elections yet."}
          </h1>
        </div>
        <Link href="/dashboard/new" className="btn btn-stamp">
          New election
        </Link>
      </div>

      <div className="rule mt-8" />

      {elections.length === 0 ? (
        <div className="mt-16 sheet p-12 text-center max-w-xl mx-auto">
          <p className="font-serif italic text-2xl">
            A ballot box is only useful once someone opens it.
          </p>
          <p className="mt-3 text-[color:var(--color-ink-soft)]">
            Describe your race. Choose how ballots are counted. Share
            the link. We'll do the rest.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary mt-8 inline-flex">
            Open your first ballot box
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-[color:var(--color-rule)]">
          {elections.map((e) => (
            <li key={e.id}>
              <Link
                href={`/dashboard/elections/${e.id}`}
                className="grid grid-cols-[auto_1fr_auto] gap-6 items-center py-6 group"
              >
                <div className="shrink-0">
                  <Sigil
                    code={e.code}
                    size={72}
                    tone={
                      e.status === "OPEN"
                        ? "stamp"
                        : e.status === "CLOSED"
                        ? "seal"
                        : "ink"
                    }
                  />
                </div>
                <div className="min-w-0">
                  <p className="label flex items-center gap-2">
                    <StatusDot status={e.status} />
                    {e.status}
                    <span className="opacity-50">·</span>
                    {methodLabel(e.method)}
                    <span className="opacity-50">·</span>
                    {plural(e._count.options, "option")}
                  </p>
                  <p className="font-serif text-2xl truncate group-hover:underline underline-offset-4 decoration-[color:var(--color-rule)]">
                    {e.title}
                  </p>
                  <p className="label mt-1">
                    {plural(e._count.ballots, "ballot")} cast · created{" "}
                    {relativeTime(e.createdAt)}
                    {e.closesAt
                      ? ` · closes ${formatDateTime(e.closesAt)}`
                      : ""}
                  </p>
                </div>
                <span className="label opacity-60 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
