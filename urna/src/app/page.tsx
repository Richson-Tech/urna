import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { Sigil } from "@/lib/sigil";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();

  return (
    <div>
      <Masthead
        right={
          user ? (
            <Link href="/dashboard" className="hover:text-[color:var(--color-ink)]">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-[color:var(--color-ink)]">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hover:text-[color:var(--color-ink)]"
              >
                Start an election →
              </Link>
            </>
          )
        }
      />

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <section className="grid gap-12 md:grid-cols-[1.4fr_1fr] items-end">
          <div>
            <p className="label mb-8">A manual for holding an honest vote</p>
            <h1 className="font-serif text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.95] tracking-tight">
              Hold an election
              <br />
              <span className="italic">without a spreadsheet,</span>
              <br />
              a sign-up form, or a prayer.
            </h1>
            <p className="mt-8 max-w-xl text-lg text-[color:var(--color-ink-soft)] leading-relaxed">
              Urna is a small, serious tool for running elections on the
              internet. You describe the race. We print a link. Anyone with
              the link can vote — single choice, approval, or ranked —
              without creating an account. Every ballot is hash-chained,
              every voter gets a receipt, and every count is shown live.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href={user ? "/dashboard/new" : "/signup"} className="btn btn-primary">
                Open a ballot box
              </Link>
              <Link href="/manifesto" className="btn btn-ghost">
                Read the manifesto
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="sheet p-10 rotate-[1.5deg]">
              <Sigil code="SPECIMEN" size={220} tone="stamp" />
            </div>
            <p className="label">Specimen seal · one per election</p>
          </div>
        </section>

        <div className="mt-24 fleuron">
          <span className="font-serif italic">Three ways to count</span>
        </div>

        <section className="mt-10 grid gap-10 md:grid-cols-3">
          <MethodCard
            number="I."
            name="Single choice"
            description="The classic. One voter, one vote, one winner — whoever collects the largest pile of ballots."
            best="Best for: simple yes/no votes, officer elections, quick picks."
          />
          <MethodCard
            number="II."
            name="Approval"
            description="Voters tick every option they'd be happy with. The option with the most ticks wins."
            best="Best for: picking a restaurant, a meeting time, a band name — anywhere consensus matters more than a favorite."
          />
          <MethodCard
            number="III."
            name="Ranked choice"
            description="Voters order the options. We run instant-runoff rounds, eliminating the last-place option each round until someone holds a majority."
            best="Best for: elections where vote-splitting would distort the result. The most honest way to choose among more than two."
          />
        </section>

        <div className="mt-24 fleuron">
          <span className="font-serif italic">What you get</span>
        </div>

        <section className="mt-10 grid gap-10 md:grid-cols-2">
          <Feature
            title="A sharable link &amp; seal."
            body="Every election produces a short code and a unique seal — a deterministic SVG mark no other election will ever have. Share the link, the QR, or the seal itself."
          />
          <Feature
            title="Voting that respects attention."
            body="Ballots are typographic, not theatrical. Ranked ballots are drag-to-order. Approval ballots are press-to-toggle. No modals, no confetti."
          />
          <Feature
            title="Tamper-evident by construction."
            body="Each ballot's hash commits to the one before it. Break a ballot, break the chain. The full audit log is public — receipts, hashes, timestamps."
          />
          <Feature
            title="Live counting you can trust."
            body="Results update as ballots arrive. For ranked races we show the runoff rounds like a waterfall, so voters see exactly how the winner emerged."
          />
        </section>

        <div className="mt-24 fleuron">
          <span className="font-serif italic">Fine print</span>
        </div>

        <section className="mt-10 grid gap-10 md:grid-cols-2 text-[color:var(--color-ink-soft)]">
          <div>
            <p className="label mb-2">What we are</p>
            <p>
              A tool for small, high-trust elections: clubs, classrooms,
              co-ops, teams, friend groups deciding where to eat. Suitable
              for decisions where the stakes matter, but not where
              coercion does.
            </p>
          </div>
          <div>
            <p className="label mb-2">What we are not</p>
            <p>
              A replacement for government voting infrastructure. We
              cannot prove a voter is a particular person; anyone with
              two devices can submit two ballots. We are honest about
              this rather than pretending otherwise.
            </p>
          </div>
        </section>

        <section className="mt-24 sheet p-10 flex flex-col md:flex-row items-center gap-10 justify-between">
          <div>
            <p className="label">Ready when you are</p>
            <p className="font-serif text-4xl italic mt-3">
              Your first ballot takes about 60 seconds.
            </p>
          </div>
          <Link
            href={user ? "/dashboard/new" : "/signup"}
            className="btn btn-stamp text-base px-6 py-3"
          >
            Begin →
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function MethodCard({
  number,
  name,
  description,
  best,
}: {
  number: string;
  name: string;
  description: string;
  best: string;
}) {
  return (
    <article className="border-t border-[color:var(--color-ink)] pt-4">
      <p className="font-serif text-2xl italic">{number}</p>
      <h3 className="mt-2 font-serif text-2xl">{name}</h3>
      <p className="mt-3 text-[color:var(--color-ink-soft)]">{description}</p>
      <p className="mt-4 label">{best}</p>
    </article>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p
        className="font-serif text-2xl"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <p className="mt-3 text-[color:var(--color-ink-soft)]">{body}</p>
    </div>
  );
}
