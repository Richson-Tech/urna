import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="label">404 · No such page</p>
        <p className="font-serif text-5xl mt-3 italic">
          That ballot box isn't here.
        </p>
        <p className="mt-4 text-[color:var(--color-ink-soft)]">
          The election you're looking for may have been deleted, or
          the link may have been mistyped.
        </p>
        <Link href="/" className="btn btn-ghost mt-8 inline-flex">
          Return to the masthead
        </Link>
      </div>
    </div>
  );
}
