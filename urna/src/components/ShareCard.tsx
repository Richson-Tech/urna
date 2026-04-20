"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  voteUrl: string;
  code: string;
  passcode: string | null;
}

/**
 * ShareCard — a typographic share sheet. Voting URL on the left, QR
 * on the right, passcode hint below if set. Copy-to-clipboard with
 * a civil "Copied." toast, not a bouncy notification.
 */
export function ShareCard({ voteUrl, code, passcode }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  useEffect(() => {
    QRCode.toDataURL(voteUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
      color: { dark: "#151210", light: "#f5f1e8" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [voteUrl]);

  const copy = async (value: string, kind: "url" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable (e.g. insecure origin) — degrade silently */
    }
  };

  return (
    <section className="sheet grid gap-8 md:grid-cols-[1fr_auto] p-8">
      <div className="min-w-0">
        <p className="label">Voting link</p>
        <div className="mt-2 flex items-center gap-3">
          <code className="font-mono text-lg tabular truncate flex-1 text-[color:var(--color-ink)]">
            {voteUrl}
          </code>
          <button
            onClick={() => copy(voteUrl, "url")}
            className="btn btn-ghost"
          >
            {copied === "url" ? "Copied." : "Copy link"}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 items-baseline">
          <p className="label">Short code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl tracking-widest tabular">
              {code}
            </span>
            <button
              onClick={() => copy(code, "code")}
              className="label hover:text-[color:var(--color-ink)]"
            >
              {copied === "code" ? "Copied." : "Copy"}
            </button>
          </div>

          {passcode ? (
            <>
              <p className="label">Passcode</p>
              <p className="font-mono text-lg">
                {passcode}
                <span className="label ml-3 text-[color:var(--color-ink-faded)]">
                  — required to vote
                </span>
              </p>
            </>
          ) : null}
        </div>

        <p className="mt-8 text-sm text-[color:var(--color-ink-soft)] max-w-md leading-relaxed">
          Voters visit the link, read the race, and cast a ballot. They
          receive a receipt code they can look up at any time to verify
          their ballot was counted — even after the election closes.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {qr ? (
          <img
            src={qr}
            alt="QR code for the voting link"
            className="w-48 h-48 border border-[color:var(--color-rule)]"
          />
        ) : (
          <div className="w-48 h-48 border border-[color:var(--color-rule)]" />
        )}
        <p className="label">Scan to vote</p>
      </div>
    </section>
  );
}
