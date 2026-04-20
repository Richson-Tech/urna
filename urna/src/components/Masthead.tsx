import Link from "next/link";

/**
 * Masthead — the site-wide header. Designed to feel like the nameplate
 * of a printed journal: small-caps issue marker on the left, a wordmark
 * in the middle, and a single quiet action on the right. No logo, no
 * tagline, no hamburger.
 *
 * Responsive behavior:
 *   - Mobile (<sm): a single, tidy row with the wordmark on the left
 *     and nav on the right. No date, no volume marker, no tagline —
 *     those are editorial garnish, not critical affordance.
 *   - Desktop (sm+): the full three-column masthead with the date on
 *     the left, wordmark centered, nav on the right, and the tagline
 *     + issue number on a second row below.
 */
export function Masthead({ right }: { right?: React.ReactNode }) {
  const longDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const shortDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <header className="border-b border-[color:var(--color-rule)]">
      {/* Mobile masthead: tight, single row. */}
      <div className="sm:hidden mx-auto max-w-6xl px-5 py-4 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-2xl font-semibold italic leading-none tracking-tight"
        >
          Urna
        </Link>
        <div className="flex items-center gap-3 label text-xs">{right}</div>
      </div>

      {/* Desktop masthead: three columns + editorial tagline row. */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-4">
          <div className="flex items-baseline justify-between gap-6">
            <span className="label">
              Vol. I · <span className="hidden md:inline">{longDate}</span>
              <span className="md:hidden">{shortDate}</span>
            </span>
            <Link
              href="/"
              className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-semibold italic leading-none tracking-tight"
            >
              Urna
            </Link>
            <div className="flex items-center gap-3 label">{right}</div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3 flex items-center justify-between label">
          <span>The ballot box for the internet</span>
          <span>No. {Math.floor(Date.now() / 8.64e7) % 10_000}</span>
        </div>
      </div>
    </header>
  );
}
