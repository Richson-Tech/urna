import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <Masthead
        right={
          <>
            <span className="hidden sm:inline">{user.name}</span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="label hover:text-[color:var(--color-ink)]"
              >
                Sign out
              </button>
            </form>
            <Link
              href="/dashboard/new"
              className="hover:text-[color:var(--color-ink)]"
            >
              New election →
            </Link>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
      <Footer />
    </div>
  );
}
