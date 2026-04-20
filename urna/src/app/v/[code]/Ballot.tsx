"use client";

import { useState, useTransition } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
  useMotionValue,
} from "framer-motion";
import Link from "next/link";
import { castBallot, type CastResult } from "./actions";

interface OptionIn {
  id: string;
  label: string;
  subtitle: string | null;
}

interface Props {
  code: string;
  method: "SINGLE" | "APPROVAL" | "RANKED";
  passcodeRequired: boolean;
  options: OptionIn[];
}

export function Ballot({ code, method, passcodeRequired, options }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");

  const submit = (selections: string[]) => {
    setError(null);
    startTransition(async () => {
      const r: CastResult = await castBallot({ code, passcode, selections });
      if (r.ok) setReceipt(r.receipt);
      else setError(r.error);
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {receipt ? (
        <motion.div
          key="receipt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ReceiptCard receipt={receipt} code={code} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 1 }}
          // While the ballot is being sealed, very subtly dim and lift
          // the form so the upcoming stamp reads as a new event, not a
          // rearrangement of the same surface.
          animate={{
            opacity: pending ? 0.55 : 1,
            y: pending ? -2 : 0,
            filter: pending ? "saturate(0.7)" : "saturate(1)",
          }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <BallotBody
            method={method}
            options={options}
            passcode={passcode}
            setPasscode={setPasscode}
            passcodeRequired={passcodeRequired}
            pending={pending}
            onSubmit={submit}
            error={error}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Split out so the animated wrapper doesn't make the main component
 * hard to read. Pure presentational; takes its props and forwards. */
function BallotBody({
  method,
  options,
  passcode,
  setPasscode,
  passcodeRequired,
  pending,
  onSubmit,
  error,
}: {
  method: "SINGLE" | "APPROVAL" | "RANKED";
  options: OptionIn[];
  passcode: string;
  setPasscode: (v: string) => void;
  passcodeRequired: boolean;
  pending: boolean;
  onSubmit: (selections: string[]) => void;
  error: string | null;
}) {
  return (
    <div className="mt-10">
      {passcodeRequired ? (
        <div className="mb-10">
          <label className="label block mb-2" htmlFor="passcode">
            Passcode · required by the organizer
          </label>
          <input
            id="passcode"
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="field"
            autoComplete="off"
            placeholder="Enter the passcode you were given"
          />
        </div>
      ) : null}

      {method === "SINGLE" ? (
        <SingleBallot
          options={options}
          pending={pending}
          onSubmit={(id) => onSubmit([id])}
        />
      ) : method === "APPROVAL" ? (
        <ApprovalBallot
          options={options}
          pending={pending}
          onSubmit={(ids) => onSubmit(ids)}
        />
      ) : (
        <RankedBallot
          options={options}
          pending={pending}
          onSubmit={(ordered) => onSubmit(ordered)}
        />
      )}

      {error ? (
        <p className="mt-6 border-l-2 border-[color:var(--color-stamp)] pl-3 text-[color:var(--color-stamp-deep)]">
          {error}
        </p>
      ) : null}

      <p className="mt-10 label text-[color:var(--color-ink-faded)] max-w-xl">
        Your ballot is anonymous. We store only what you selected — not
        who you are. A cookie prevents a second ballot from this browser.
      </p>
    </div>
  );
}

function SingleBallot({
  options,
  pending,
  onSubmit,
}: {
  options: OptionIn[];
  pending: boolean;
  onSubmit: (id: string) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <div>
      <ul className="space-y-2">
        {options.map((o) => {
          const selected = pick === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setPick(o.id)}
                className={`w-full text-left grid grid-cols-[auto_1fr] gap-4 items-center py-4 px-5 border transition-all ${
                  selected
                    ? "border-[color:var(--color-ink)] bg-[color:var(--color-paper-deep)]"
                    : "border-[color:var(--color-rule)] hover:border-[color:var(--color-ink)]"
                }`}
              >
                <Radio checked={selected} />
                <div>
                  <p className="font-serif text-xl">{o.label}</p>
                  {o.subtitle ? (
                    <p className="label mt-1">{o.subtitle}</p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <SubmitBar
        disabled={!pick || pending}
        pending={pending}
        label={pick ? "Cast this ballot" : "Select an option"}
        onClick={() => pick && onSubmit(pick)}
      />
    </div>
  );
}

function ApprovalBallot({
  options,
  pending,
  onSubmit,
}: {
  options: OptionIn[];
  pending: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setPicks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <p className="label mb-4">
        Tick every option you approve of — zero, one, or many.
      </p>
      <ul className="space-y-2">
        {options.map((o) => {
          const selected = picks.has(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className={`w-full text-left grid grid-cols-[auto_1fr] gap-4 items-center py-4 px-5 border transition-all ${
                  selected
                    ? "border-[color:var(--color-ink)] bg-[color:var(--color-paper-deep)]"
                    : "border-[color:var(--color-rule)] hover:border-[color:var(--color-ink)]"
                }`}
              >
                <BoxCheck checked={selected} />
                <div>
                  <p className="font-serif text-xl">{o.label}</p>
                  {o.subtitle ? (
                    <p className="label mt-1">{o.subtitle}</p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <SubmitBar
        disabled={picks.size === 0 || pending}
        pending={pending}
        label={
          picks.size === 0
            ? "Approve at least one"
            : `Submit ${picks.size} approval${picks.size === 1 ? "" : "s"}`
        }
        onClick={() => onSubmit([...picks])}
      />
    </div>
  );
}

function RankedBallot({
  options,
  pending,
  onSubmit,
}: {
  options: OptionIn[];
  pending: boolean;
  onSubmit: (ordered: string[]) => void;
}) {
  const [order, setOrder] = useState<OptionIn[]>(options);

  return (
    <div>
      <p className="label mb-4">
        Drag to reorder from most-preferred (top) to least (bottom).
      </p>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="space-y-2 list-none"
      >
        {order.map((o, i) => (
          <RankedItem key={o.id} option={o} rank={i + 1} />
        ))}
      </Reorder.Group>
      <SubmitBar
        disabled={pending}
        pending={pending}
        label="Cast this ranking"
        onClick={() => onSubmit(order.map((o) => o.id))}
      />
    </div>
  );
}

function RankedItem({ option, rank }: { option: OptionIn; rank: number }) {
  const y = useMotionValue(0);
  return (
    <Reorder.Item
      value={option}
      style={{ y }}
      className="list-none"
      whileDrag={{ scale: 1.01, boxShadow: "0 18px 30px -20px rgba(21,18,16,0.45)" }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-4 px-5 border border-[color:var(--color-rule)] bg-[color:var(--color-paper)] cursor-grab active:cursor-grabbing">
        <span className="font-serif italic text-2xl text-[color:var(--color-ink-faded)] w-8 tabular">
          {rank}.
        </span>
        <div>
          <p className="font-serif text-xl">{option.label}</p>
          {option.subtitle ? (
            <p className="label mt-1">{option.subtitle}</p>
          ) : null}
        </div>
        <GripIcon />
      </div>
    </Reorder.Item>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className="w-5 h-5 rounded-full border border-[color:var(--color-ink)] flex items-center justify-center"
      aria-hidden
    >
      {checked ? (
        <motion.span
          layoutId="radio-dot"
          className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-stamp)]"
        />
      ) : null}
    </span>
  );
}

function BoxCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-5 h-5 border flex items-center justify-center rounded-[2px] ${
        checked
          ? "bg-[color:var(--color-ink)] border-[color:var(--color-ink)]"
          : "border-[color:var(--color-ink)]"
      }`}
      aria-hidden
    >
      {checked ? (
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 6.5 L5 9 L10 3" />
        </svg>
      ) : null}
    </span>
  );
}

function GripIcon() {
  return (
    <svg
      width="14"
      height="18"
      viewBox="0 0 14 18"
      fill="var(--color-ink-faded)"
      aria-hidden
    >
      <circle cx="3" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="3" cy="9" r="1.3" />
      <circle cx="11" cy="9" r="1.3" />
      <circle cx="3" cy="15" r="1.3" />
      <circle cx="11" cy="15" r="1.3" />
    </svg>
  );
}

function SubmitBar({
  disabled,
  pending,
  label,
  onClick,
}: {
  disabled: boolean;
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="btn btn-stamp text-base px-6"
      >
        {pending ? "Sealing ballot…" : label} →
      </button>
    </div>
  );
}

/**
 * ReceiptCard — the reward state after a ballot is cast. The motion
 * sequence is designed like a printing press:
 *   1. A "printer's ruler" bar sweeps across the sheet top-to-bottom.
 *   2. The stamp crashes in from above, overshoots its resting angle,
 *      and settles. A red wash radiates outward like wet ink bleeding
 *      through paper.
 *   3. Each character of the receipt is stamped in turn, with a tiny
 *      per-glyph impact — not one long fade of the whole string.
 *   4. Supporting copy and action buttons fade in last.
 * Deliberately no confetti, no sound. Civic, not cute.
 */
function ReceiptCard({ receipt, code }: { receipt: string; code: string }) {
  const chars = `#${receipt}`.split("");

  return (
    <motion.div
      className="mt-10 relative overflow-hidden sheet p-10 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {/* Printer's ruler — an ink-coloured bar that wipes across the
          top of the sheet, announcing "something was just pressed". */}
      <motion.span
        aria-hidden
        className="absolute left-0 right-0 top-0 h-[2px] origin-left"
        style={{ background: "var(--color-ink)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* Ink bleed — a soft radial wash of stamp red that pulses once
          behind the stamp, mimicking wet ink soaking into paper. */}
      <motion.span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 28%, color-mix(in oklab, var(--color-stamp) 22%, transparent) 0%, transparent 45%)",
        }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 1, 0], scale: [0.7, 1.2, 1.4] }}
        transition={{ duration: 1.1, delay: 0.35, ease: "easeOut" }}
      />

      {/* Stamp — crashes down from above with an overshoot that reads
          as "pressed". A small Y-axis bounce after landing gives it
          weight without being cartoonish. */}
      <motion.span
        className="stamp relative z-10"
        initial={{ scale: 2.4, opacity: 0, y: -80, rotate: -28 }}
        animate={{
          scale: [2.4, 0.92, 1.02, 1],
          opacity: [0, 1, 0.95, 0.95],
          y: [-80, 4, -2, 0],
          rotate: [-28, -2, -8, -6],
        }}
        transition={{
          duration: 0.85,
          delay: 0.25,
          times: [0, 0.55, 0.8, 1],
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        Ballot sealed
      </motion.span>

      <motion.p
        className="mt-6 font-serif text-3xl relative z-10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.9 }}
      >
        Your vote has been counted.
      </motion.p>
      <motion.p
        className="mt-2 text-[color:var(--color-ink-soft)] max-w-md mx-auto relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 1.0 }}
      >
        This receipt appears on the public audit log. Keep it if you'd
        like to verify your ballot was included in the final tally.
      </motion.p>

      {/* Receipt code — each glyph is stamped individually. The tiny
          translate/scale bounce gives the impression of a mechanical
          type-slug hitting paper, one character at a time. */}
      <p
        className="mt-8 font-mono text-[clamp(1.8rem,6vw,2.6rem)] tracking-[0.18em] tabular relative z-10 flex items-center justify-center flex-wrap"
        aria-label={`Receipt code ${receipt}`}
      >
        {chars.map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: -14, scale: 1.6, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.28,
              delay: 1.15 + i * 0.055,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            className="inline-block"
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </p>

      <motion.div
        className="mt-8 flex items-center justify-center gap-3 flex-wrap relative z-10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: 1.2 + chars.length * 0.055 + 0.1,
        }}
      >
        <Link href={`/r/${code}`} className="btn btn-primary">
          See the running count →
        </Link>
        <Link href={`/r/${code}/audit`} className="btn btn-ghost">
          Open the audit log
        </Link>
      </motion.div>
    </motion.div>
  );
}
