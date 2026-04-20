import { createHash } from "node:crypto";

/**
 * Election sigils — every election gets a unique, deterministic SVG
 * seal generated from its short code. It's the ballot-box equivalent
 * of a ship's coat of arms: a compact, memorable mark that makes each
 * election feel like a distinct object rather than a database row.
 *
 * The generator is intentionally constrained. A seal is:
 *   - A ring (border + decorative dots)
 *   - Two rotated rays that fan out behind the center
 *   - A center glyph — one of four primitives chosen by seed
 *   - The election code rendered in small-caps around the bottom arc
 *
 * Constrained randomness looks intentional; unconstrained randomness
 * looks like noise. This is the line between "handcrafted" and "vibe
 * coded" and we want to be firmly on the first side.
 */

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromCode(code: string): number {
  const h = createHash("sha256").update(code).digest();
  return h.readUInt32BE(0);
}

function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)]!;
}

type Glyph = "box" | "cross" | "laurel" | "sun";

export interface SigilProps {
  code: string;
  size?: number;
  tone?: "ink" | "stamp" | "seal" | "gold";
  title?: string;
}

export function Sigil({
  code,
  size = 140,
  tone = "ink",
  title,
}: SigilProps) {
  const rng = mulberry32(seedFromCode(code));
  const rayCount = 8 + Math.floor(rng() * 6) * 2;
  const rayInner = 32 + rng() * 6;
  const rayOuter = 52 + rng() * 6;
  const rotate = rng() * 360;
  const dots = 24 + Math.floor(rng() * 12);
  const glyph = pick<Glyph>(rng, ["box", "cross", "laurel", "sun"]);
  const innerGlyphAngle = rng() * 20 - 10;

  const color =
    tone === "stamp"
      ? "var(--color-stamp)"
      : tone === "seal"
      ? "var(--color-seal)"
      : tone === "gold"
      ? "var(--color-gold)"
      : "var(--color-ink)";

  // Ring dots — evenly spaced, every Nth one enlarged for rhythm.
  const ringDots = Array.from({ length: dots }, (_, i) => {
    const angle = (i / dots) * Math.PI * 2;
    const r = 58;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const big = i % 6 === 0;
    return <circle key={i} cx={x} cy={y} r={big ? 1.6 : 0.9} fill={color} />;
  });

  // Rays — thin lines radiating from the core, giving the sigil a
  // "struck medal" look at a glance.
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const angle = (i / rayCount) * Math.PI * 2 + (rotate * Math.PI) / 180;
    const x1 = Math.cos(angle) * rayInner;
    const y1 = Math.sin(angle) * rayInner;
    const x2 = Math.cos(angle) * rayOuter;
    const y2 = Math.sin(angle) * rayOuter;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      viewBox="-80 -80 160 160"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? `Seal for election ${code}`}
      style={{ display: "block" }}
    >
      <title>{title ?? `Seal for election ${code}`}</title>

      <circle
        cx={0}
        cy={0}
        r={64}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
      <circle
        cx={0}
        cy={0}
        r={52}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        strokeDasharray="1 3"
      />
      {ringDots}
      {rays}

      <g transform={`rotate(${innerGlyphAngle})`}>
        {glyph === "box" && <BallotBoxGlyph color={color} />}
        {glyph === "cross" && <CrossGlyph color={color} />}
        {glyph === "laurel" && <LaurelGlyph color={color} />}
        {glyph === "sun" && <SunGlyph color={color} />}
      </g>

      {/* Code along the bottom arc — rendered as plain text centered
       * to keep the implementation simple; a <textPath> would be more
       * elegant but introduces font-metric pitfalls on first paint. */}
      <text
        x={0}
        y={72}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={7}
        letterSpacing={1.4}
        fill={color}
      >
        URNA · {code}
      </text>
    </svg>
  );
}

function BallotBoxGlyph({ color }: { color: string }) {
  return (
    <g stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round">
      <rect x={-16} y={-10} width={32} height={22} rx={1.5} />
      <line x1={-16} y1={-4} x2={16} y2={-4} />
      <rect x={-6} y={-8} width={12} height={3} fill={color} />
      <line x1={-10} y1={4} x2={10} y2={4} />
      <line x1={-10} y1={8} x2={10} y2={8} />
    </g>
  );
}

function CrossGlyph({ color }: { color: string }) {
  return (
    <g stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <line x1={-12} y1={-12} x2={12} y2={12} />
      <line x1={-12} y1={12} x2={12} y2={-12} />
      <circle cx={0} cy={0} r={4} fill={color} />
    </g>
  );
}

function LaurelGlyph({ color }: { color: string }) {
  const leaves = Array.from({ length: 8 }, (_, i) => {
    const side = i < 4 ? -1 : 1;
    const t = (i % 4) / 3;
    const y = -10 + t * 20;
    const x = side * (4 + Math.sin(t * Math.PI) * 8);
    const rot = side * (30 + t * 20);
    return (
      <ellipse
        key={i}
        cx={x}
        cy={y}
        rx={3.2}
        ry={1.4}
        transform={`rotate(${rot} ${x} ${y})`}
        fill={color}
      />
    );
  });
  return (
    <g>
      {leaves}
      <circle cx={0} cy={0} r={3} fill="none" stroke={color} strokeWidth={1.2} />
    </g>
  );
}

function SunGlyph({ color }: { color: string }) {
  const spikes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = Math.cos(a) * 6;
    const y1 = Math.sin(a) * 6;
    const x2 = Math.cos(a) * 12;
    const y2 = Math.sin(a) * 12;
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      {spikes}
      <circle cx={0} cy={0} r={4.2} fill={color} />
    </g>
  );
}
