import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";

export default function ManifestoPage() {
  return (
    <div>
      <Masthead
        right={
          <Link href="/" className="hover:text-[color:var(--color-ink)]">
            ← Back to the masthead
          </Link>
        }
      />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="label">A manifesto, such as it is</p>
        <h1 className="font-serif text-5xl mt-3 leading-[1.05]">
          Counting votes should be boring.
        </h1>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-[color:var(--color-ink-soft)]">
          <p>
            Most election tools on the internet are either trivial —
            a single-question poll with no memory of what happened —
            or ceremonial, requiring accounts, phone numbers, and
            marketing emails for a vote among eight colleagues about
            where to get lunch.
          </p>
          <p>
            Urna sits in between. It's a small, serious instrument for
            running real elections in small groups that still care
            about the result. Clubs. Classrooms. Co-ops. Teams. Friends
            who've learned the hard way that plurality voting is how
            you end up eating at the restaurant nobody loves.
          </p>
          <p>
            The premises are few:
          </p>
          <ul className="list-decimal pl-8 space-y-3 marker:font-serif marker:italic marker:text-[color:var(--color-ink-faded)]">
            <li>
              Voters should not have to make accounts. Accounts are
              barriers, and barriers suppress turnout. A link, a
              ballot, a receipt — that is the entire voter-facing
              contract.
            </li>
            <li>
              The method of counting matters. Single-choice works
              when there are two options. Beyond that, we offer
              approval voting and ranked-choice, because the way we
              count shapes what we are counting.
            </li>
            <li>
              Every ballot should leave a trail. Not so we can follow
              a voter, but so a voter can follow their ballot. Each
              receipt is a thread back to the log; each log entry
              links to the one before it.
            </li>
            <li>
              We are not a replacement for the machinery that runs
              a nation. We are a better tool than a group chat, a
              spreadsheet, or a show of hands. That is enough.
            </li>
          </ul>
          <p>
            Urna is free to use, and its source is legible — a small
            codebase you could read in an evening. We believe civic
            infrastructure, however modest, should be understandable
            by the people who use it.
          </p>
        </div>

        <p className="mt-16 fleuron">
          <span className="font-serif italic">Vox populi, vox numeri.</span>
        </p>

        <div className="mt-12 flex items-center justify-between">
          <Link href="/" className="btn btn-ghost">
            ← Home
          </Link>
          <Link href="/signup" className="btn btn-stamp">
            Open an account
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
