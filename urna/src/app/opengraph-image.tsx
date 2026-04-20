import { ImageResponse } from "next/og";

/**
 * Open Graph preview card — rendered whenever someone pastes an Urna
 * URL into iMessage, Slack, Twitter, WhatsApp, or any site that reads
 * OpenGraph tags. Deliberately composed like a book cover: serif
 * wordmark, italic tagline, a seal on the right, small-caps footer.
 *
 * Satori (the renderer behind next/og) needs fonts explicitly — it
 * can't use system fonts — so we fetch Fraunces at render time. The
 * result is cached by Next.js after first render, so this only pays
 * the network cost once per deploy.
 */

export const alt = "Urna — the ballot box for the internet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f5f1e8";
const PAPER_DEEP = "#ece6d6";
const INK = "#151210";
const INK_SOFT = "#3b342e";
const INK_FADED = "#7a6f62";
const STAMP = "#c8372d";

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load font: ${url}`);
  return res.arrayBuffer();
}

export default async function OpengraphImage() {
  const [italic, regular] = await Promise.all([
    loadFont(
      "https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5/files/fraunces-latin-600-italic.woff",
    ),
    loadFont(
      "https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5/files/fraunces-latin-400-normal.woff",
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          padding: "64px 72px",
          fontFamily: "Fraunces",
        }}
      >
        {/* Masthead row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: `1px solid ${INK_FADED}`,
            paddingBottom: 18,
            color: INK_SOFT,
            fontSize: 18,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <span>Urna · Vol. I</span>
          <span>A civic instrument</span>
        </div>

        {/* Body: headline + seal */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 40,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 720,
            }}
          >
            <div
              style={{
                fontSize: 22,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: INK_FADED,
                marginBottom: 14,
                display: "flex",
              }}
            >
              The ballot box for the internet
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontWeight: 600,
                fontStyle: "italic",
                fontSize: 108,
                lineHeight: 1.02,
                letterSpacing: -1,
              }}
            >
              <span>Hold an election</span>
              <span style={{ color: STAMP }}>without a spreadsheet.</span>
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 28,
                fontWeight: 400,
                color: INK_SOFT,
                display: "flex",
              }}
            >
              Shareable link. No sign-up. Receipted. Verifiable.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Seal />
            <span
              style={{
                fontFamily: "Fraunces",
                fontSize: 16,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: INK_SOFT,
                display: "flex",
              }}
            >
              Urna · Ballot Box
            </span>
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderTop: `1px solid ${INK_FADED}`,
            paddingTop: 16,
            marginTop: 32,
            color: INK_SOFT,
            fontSize: 18,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <span>Vox populi · vox numeri</span>
          <span>Single · Approval · Ranked</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: italic, weight: 600, style: "italic" },
        { name: "Fraunces", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}

/**
 * A compact, hand-drawn version of the Urna sigil for the OG card.
 * Satori supports a useful subset of SVG, so we stick to primitives
 * (circle, line, text) and hardcoded coordinates — no JS-driven loops.
 */
function Seal() {
  return (
    <svg
      width="360"
      height="360"
      viewBox="-80 -80 160 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle cx="0" cy="0" r="72" fill={PAPER_DEEP} stroke={INK} strokeWidth="1.4" />
      <circle
        cx="0"
        cy="0"
        r="62"
        fill="none"
        stroke={INK}
        strokeWidth="0.5"
        strokeDasharray="1 3"
      />

      {/* Ring dots (twelve emphasized) */}
      <circle cx="65" cy="0" r="1.6" fill={INK} />
      <circle cx="56.29" cy="32.5" r="0.9" fill={INK} />
      <circle cx="32.5" cy="56.29" r="0.9" fill={INK} />
      <circle cx="0" cy="65" r="1.6" fill={INK} />
      <circle cx="-32.5" cy="56.29" r="0.9" fill={INK} />
      <circle cx="-56.29" cy="32.5" r="0.9" fill={INK} />
      <circle cx="-65" cy="0" r="1.6" fill={INK} />
      <circle cx="-56.29" cy="-32.5" r="0.9" fill={INK} />
      <circle cx="-32.5" cy="-56.29" r="0.9" fill={INK} />
      <circle cx="0" cy="-65" r="1.6" fill={INK} />
      <circle cx="32.5" cy="-56.29" r="0.9" fill={INK} />
      <circle cx="56.29" cy="-32.5" r="0.9" fill={INK} />

      {/* Radiating rays behind the glyph */}
      <line x1="36" y1="0" x2="56" y2="0" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="-36" y1="0" x2="-56" y2="0" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="0" y1="36" x2="0" y2="56" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="0" y1="-36" x2="0" y2="-56" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="25.5" y1="25.5" x2="39.6" y2="39.6" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="-25.5" y1="25.5" x2="-39.6" y2="39.6" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="25.5" y1="-25.5" x2="39.6" y2="-39.6" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="-25.5" y1="-25.5" x2="-39.6" y2="-39.6" stroke={STAMP} strokeWidth="0.8" strokeLinecap="round" />

      {/* Ballot-box glyph */}
      <rect
        x="-16"
        y="-10"
        width="32"
        height="22"
        rx="1.5"
        fill="none"
        stroke={INK}
        strokeWidth="1.4"
      />
      <line x1="-16" y1="-4" x2="16" y2="-4" stroke={INK} strokeWidth="1.4" />
      <rect x="-6" y="-8" width="12" height="3" fill={INK} />
      <line x1="-10" y1="4" x2="10" y2="4" stroke={INK} strokeWidth="1.4" />
      <line x1="-10" y1="8" x2="10" y2="8" stroke={INK} strokeWidth="1.4" />
      {/* Note: Satori (the renderer behind next/og) does not support
       * <text> inside SVG — only <path>. The former wordmark on the
       * bottom arc was moved to a sibling HTML node in the caller.
       * If you want a curved wordmark inside the seal itself, the
       * letters would need to be supplied as path data. */}
    </svg>
  );
}
