export function Footer() {
  return (
    <footer className="mt-24 border-t border-[color:var(--color-rule)]">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 md:grid-cols-3 text-sm text-[color:var(--color-ink-soft)]">
        <div>
          <p className="font-serif text-lg italic">Urna</p>
          <p className="mt-2 max-w-xs">
            A civic instrument for small elections. Built with the belief that
            counting votes should be boring, legible, and verifiable.
          </p>
        </div>
        <div>
          <p className="label">Principles</p>
          <ul className="mt-3 space-y-1">
            <li>Anonymous voting, no sign-up.</li>
            <li>Tamper-evident hash-chained ballots.</li>
            <li>Receipts you can look up yourself.</li>
          </ul>
        </div>
        <div>
          <p className="label">Colophon</p>
          <p className="mt-3">
            Created and designed by{" "}
            <a
              href="https://ahmedcodes.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif italic text-[color:var(--color-ink)] underline decoration-[color:var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[color:var(--color-stamp)] hover:text-[color:var(--color-stamp)]"
            >
              Crazy Codes
            </a>
            .
          </p>
          <a
              href="https://ahmedcodes.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif italic text-[color:var(--color-ink)] underline decoration-[color:var(--color-rule)] underline-offset-4 transition-colors hover:decoration-[color:var(--color-stamp)] hover:text-[color:var(--color-stamp)]"
            >
            Portfolio ↗
          </a>
        </div>
      </div>
      <div className="border-t border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-2 sm:flex-row items-center sm:justify-between label">
          <span>© {new Date().getFullYear()} · Printed on the open web</span>
          <span>vox populi · vox numeri</span>
        </div>
      </div>
    </footer>
  );
}
