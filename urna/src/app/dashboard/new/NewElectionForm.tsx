"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type Method = "SINGLE" | "APPROVAL" | "RANKED";

interface OptionDraft {
  key: number;
  label: string;
  subtitle: string;
}

interface Props {
  action: (payload: unknown) => Promise<CreateResult>;
}

export function NewElectionForm({ action }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<Method>("SINGLE");
  const [options, setOptions] = useState<OptionDraft[]>([
    { key: 1, label: "", subtitle: "" },
    { key: 2, label: "", subtitle: "" },
  ]);
  const [passcode, setPasscode] = useState("");
  const [publicResults, setPublicResults] = useState(true);
  const [openNow, setOpenNow] = useState(true);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addOption = () => {
    if (options.length >= 20) return;
    setOptions((xs) => [
      ...xs,
      { key: Math.max(0, ...xs.map((o) => o.key)) + 1, label: "", subtitle: "" },
    ]);
  };

  const removeOption = (key: number) => {
    if (options.length <= 2) return;
    setOptions((xs) => xs.filter((o) => o.key !== key));
  };

  const update = (key: number, field: "label" | "subtitle", value: string) => {
    setOptions((xs) =>
      xs.map((o) => (o.key === key ? { ...o, [field]: value } : o)),
    );
  };

  const submit = () => {
    setError(null);
    const cleaned = options
      .map((o) => ({ label: o.label.trim(), subtitle: o.subtitle.trim() }))
      .filter((o) => o.label.length > 0);
    if (!title.trim()) return setError("Give your election a title.");
    if (cleaned.length < 2)
      return setError("You need at least two options with labels.");

    startTransition(async () => {
      const result = await action({
        title: title.trim(),
        description: description.trim() || undefined,
        method,
        options: cleaned,
        passcode: passcode.trim() || undefined,
        publicResults,
        openNow,
        closesAt: closesAt || undefined,
      });
      if (result.ok) {
        router.push(`/dashboard/elections/${result.id}?created=1`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form
      className="mt-10 space-y-12"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <section className="space-y-6">
        <div>
          <label className="label block mb-2" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="field text-lg font-serif italic"
            placeholder="Who should chair the gardening committee?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
          />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="description">
            Description · optional
          </label>
          <textarea
            id="description"
            className="field"
            rows={3}
            placeholder="Context for voters, rules, anything they should know before casting."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </div>
      </section>

      <section>
        <p className="label mb-3">Method of counting</p>
        <div className="grid gap-3 md:grid-cols-3">
          <MethodCard
            active={method === "SINGLE"}
            onClick={() => setMethod("SINGLE")}
            name="Single"
            description="One vote per ballot. Most votes wins."
          />
          <MethodCard
            active={method === "APPROVAL"}
            onClick={() => setMethod("APPROVAL")}
            name="Approval"
            description="Tick every option you'd approve of. Most ticks wins."
          />
          <MethodCard
            active={method === "RANKED"}
            onClick={() => setMethod("RANKED")}
            name="Ranked"
            description="Order the options. Instant-runoff rounds decide the winner."
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="label">The options</p>
          <span className="label opacity-60">
            {options.length} / 20
          </span>
        </div>
        <ul className="space-y-3">
          {options.map((o, i) => (
            <li
              key={o.key}
              className="grid grid-cols-[auto_1fr_auto] gap-3 items-start border-b border-[color:var(--color-rule)] pb-3"
            >
              <span className="font-serif italic text-xl text-[color:var(--color-ink-faded)] mt-1 w-8 tabular">
                {romanNumeral(i + 1)}.
              </span>
              <div className="space-y-1">
                <input
                  className="field"
                  placeholder="Option label"
                  value={o.label}
                  onChange={(e) => update(o.key, "label", e.target.value)}
                  maxLength={140}
                />
                <input
                  className="field text-sm"
                  placeholder="Subtitle · optional (party, bio, etc.)"
                  value={o.subtitle}
                  onChange={(e) => update(o.key, "subtitle", e.target.value)}
                  maxLength={140}
                />
              </div>
              <button
                type="button"
                onClick={() => removeOption(o.key)}
                disabled={options.length <= 2}
                className="label hover:text-[color:var(--color-stamp)] disabled:opacity-30 disabled:pointer-events-none mt-2"
                aria-label="Remove option"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addOption}
          disabled={options.length >= 20}
          className="btn btn-ghost mt-4"
        >
          + Add option
        </button>
      </section>

      <section className="space-y-6">
        <p className="label">Rules of the house</p>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={openNow}
              onChange={(v) => setOpenNow(v)}
            />
            <span>
              <span className="font-serif text-lg">Open voting immediately</span>
              <span className="block label mt-1">
                Otherwise it starts as a draft and you can publish later.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <Checkbox
              checked={publicResults}
              onChange={(v) => setPublicResults(v)}
            />
            <span>
              <span className="font-serif text-lg">Show live results to voters</span>
              <span className="block label mt-1">
                Uncheck to keep the count a secret until you close the vote.
              </span>
            </span>
          </label>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="label block mb-2" htmlFor="closesAt">
              Close at · optional
            </label>
            <input
              id="closesAt"
              type="datetime-local"
              className="field"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label block mb-2" htmlFor="passcode">
              Passcode · optional
            </label>
            <input
              id="passcode"
              type="text"
              className="field"
              placeholder="Leave blank for open voting"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>
      </section>

      {error ? (
        <p className="border-l-2 border-[color:var(--color-stamp)] pl-3 text-[color:var(--color-stamp-deep)]">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <p className="label max-w-md">
          Once ballots start arriving you can no longer change the method or
          the options — tampering with a race mid-vote is not a feature.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-stamp text-base px-6"
        >
          {pending ? "Printing…" : "Create election →"}
        </button>
      </div>
    </form>
  );
}

function MethodCard({
  active,
  onClick,
  name,
  description,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-5 border transition-all rounded-sm ${
        active
          ? "border-[color:var(--color-ink)] bg-[color:var(--color-paper-deep)]"
          : "border-[color:var(--color-rule)] hover:border-[color:var(--color-ink)]"
      }`}
    >
      <span className="font-serif text-xl">{name}</span>
      <span className="block mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {description}
      </span>
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`mt-1 w-5 h-5 border flex items-center justify-center rounded-[2px] transition-colors ${
        checked
          ? "bg-[color:var(--color-ink)] border-[color:var(--color-ink)]"
          : "border-[color:var(--color-ink)]"
      }`}
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
    </button>
  );
}

function romanNumeral(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  for (const [v, s] of map) {
    while (n >= v) {
      result += s;
      n -= v;
    }
  }
  return result;
}
