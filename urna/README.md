# Urna

**The ballot box for the internet.** A small, serious tool for hosting real
elections on the web. Voters cast ballots via a shareable link — no account,
no sign-up, no email required. Organizers sign up once and can run as many
elections as they like.

Urna supports three methods of counting: **single-choice**, **approval**,
and **ranked-choice (instant-runoff)**. Every ballot is sealed into a
tamper-evident hash chain and every voter receives a receipt code they
can look up at any time to verify their ballot was counted.

## Why

Most polling tools are either toys (single-question polls with no memory)
or enterprise ceremonies (accounts, SSO, compliance copy). Urna sits in
between: suitable for clubs, classrooms, co-ops, and teams that care about
the outcome but don't need CIA-grade infrastructure to decide where to
hold the offsite.

Read [the manifesto](./src/app/manifesto/page.tsx) for the full pitch.

## Getting started

```bash
cp .env.example .env     # fill in the three values
npm install
npx prisma db push       # creates prisma/dev.db
npm run db:seed          # optional: populate three demo elections
npm run dev
```

Open <http://localhost:3000>. If you seeded, sign in with:

- **Email** · `demo@urna.example`
- **Password** · `demo1234`

## Running a live demo

The app is designed to be run on a single machine (see *Architecture*
below — SQLite + in-memory SSE). To show it to someone on the internet
without deploying anywhere, pair a local server with a Cloudflare
quick-tunnel:

```bash
# Terminal 1 — run the production build locally
npm run build
npm run start

# Terminal 2 — expose it to the internet
npm run demo:tunnel
```

Cloudflare prints a throwaway `https://*.trycloudflare.com` URL that
forwards to your laptop. Share it, demo it, close both terminals when
you're done. No accounts, no deployment, no DNS. **Remember to update
`NEXT_PUBLIC_APP_URL` in `.env` to that tunnel URL and restart the
server** so the in-app share links and QR codes point to the public
URL instead of `localhost`.

## What's in the box

- **Next.js 15** with the App Router, server components, server actions
- **TypeScript** in strict mode
- **Tailwind CSS v4** with a paper-white, ink-and-vermillion design system
- **Prisma + SQLite** for data (swap the connection string for Postgres in production)
- **JOSE + bcrypt** for organizer authentication
- **Framer Motion** for the results choreography and the drag-to-rank ballot
- **Server-Sent Events** for live result updates
- **qrcode** for sharable ballot QRs
- **Deterministic SVG election sigils** — every election gets a unique seal

## Trust model

Urna is **honest, not omniscient** about its guarantees.

- **Ballots are anonymous.** We store what you voted for, not who you are.
- **Duplicate voting is deterred, not prevented.** We set a cookie on each
  voter's browser; a second ballot from the same browser is rejected. A
  determined voter can clear cookies or use a second device. We surface
  this in the product rather than pretending otherwise.
- **The log is tamper-evident.** Every ballot commits to a hash of the
  previous ballot's hash, its own receipt, and its payload. Altering,
  reordering, or removing a ballot breaks the chain; the public audit
  page will say so, and any voter can re-verify their own receipt.
- **Receipts don't leak.** A receipt proves a ballot was counted; it does
  not reveal what was voted for.

This model is appropriate for high-trust elections among small groups
(clubs, classrooms, co-ops, teams). **It is not appropriate for anything
the state runs.** Urna can't prove a voter is a particular person; if
your election requires that guarantee, you need a different tool.

## Architecture

```
src/
├── app/
│   ├── page.tsx              — landing ("newspaper masthead")
│   ├── manifesto/            — the long-form pitch
│   ├── (auth)/               — signup, login
│   ├── dashboard/            — organizer-only routes
│   │   ├── page.tsx          — election list
│   │   ├── new/              — create an election
│   │   └── elections/[id]/   — manage: share, close, results, delete
│   ├── v/[code]/             — public voting page (the ballot)
│   ├── r/[code]/             — public results
│   │   ├── page.tsx          — live tally + bars + IRV rounds
│   │   ├── audit/            — append-only hash-chained log
│   │   └── verify/           — look up a receipt
│   └── api/elections/[code]/stream — SSE live-update endpoint
├── components/               — Masthead, Footer, ResultsPanel, ShareCard
└── lib/
    ├── db.ts                 — Prisma singleton
    ├── auth.ts               — JWT sessions via jose
    ├── crypto.ts             — receipts, hash chain
    ├── sigil.tsx             — generative SVG election seals
    ├── tally.ts              — SINGLE / APPROVAL / RANKED (IRV) counting
    ├── events.ts             — in-memory pub/sub for SSE
    └── format.ts, shortcode.ts — small utilities
prisma/
├── schema.prisma             — data model
└── seed.ts                   — demo data
```

### Voting methods

All three share one on-wire shape: an ordered array of option IDs. The
tally function in `lib/tally.ts` decides what the array means:

- **Single-choice** — first entry wins one vote; others ignored.
- **Approval** — every entry in the set gets one vote; duplicates dropped.
- **Ranked** — ordered preference list. We run instant-runoff rounds,
  eliminating the last-place option each round until someone passes
  50% of remaining non-exhausted ballots.

Ties are broken deterministically by reverse position in the organizer's
original option list — documented in code, and audit-safe.

### Hash chain

Each ballot stores `prevHash`, `hash`, and `payload`. The hash is
`sha256(prevHash || "|" || receipt || "|" || payload)`. The genesis
hash is derived from the election code so chains can't be swapped
between elections. The audit page walks the chain and flags any
entry whose `prevHash` doesn't link to its predecessor's `hash`.

## Extending

- **Postgres** — change the `provider` in `prisma/schema.prisma` and
  the `DATABASE_URL`. Everything else is portable.
- **Additional voting methods** — add an enum value and a case in
  `lib/tally.ts`. Borda count, STV, quadratic all fit naturally.
- **Horizontal scaling** — the in-memory pub/sub in `lib/events.ts`
  is a deliberate fig-leaf. Replace it with Redis pub/sub or Postgres
  `LISTEN/NOTIFY` when you outgrow a single process.

## License

MIT, or whatever license is appropriate for a civic instrument you
want others to use. Copy, remix, run your own.
