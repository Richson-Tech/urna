import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  currentUser,
} from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function login(formData: FormData) {
  "use server";
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(
      `/login?err=${encodeURIComponent("Please provide an email and password.")}`,
    );
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  // We use a constant-ish error message to avoid leaking whether an
  // email exists. Bcrypt's cost already slows things down enough that
  // a timing attack is impractical in this context.
  const invalid = () =>
    redirect(
      `/login?err=${encodeURIComponent(
        "That email and password don't match.",
      )}`,
    );
  if (!user) invalid();
  if (!(await verifyPassword(parsed.data.password, user!.password))) invalid();

  await createSession(user!.id);
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  if (await currentUser()) redirect("/dashboard");
  const { err } = await searchParams;

  return (
    <div>
      <p className="label mb-2">Returning conductor</p>
      <h1 className="font-serif text-4xl">Welcome back.</h1>
      <p className="mt-3 text-[color:var(--color-ink-soft)]">
        Sign in to manage your elections.
      </p>

      {err ? (
        <p className="mt-6 border-l-2 border-[color:var(--color-stamp)] pl-3 text-[color:var(--color-stamp-deep)]">
          {err}
        </p>
      ) : null}

      <form action={login} className="mt-8 space-y-6">
        <div>
          <label className="label block mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            className="field"
            required
          />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            className="field"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Sign in
        </button>
      </form>

      <p className="mt-8 label">
        First time?{" "}
        <Link
          href="/signup"
          className="underline decoration-[color:var(--color-rule)] underline-offset-4 hover:decoration-[color:var(--color-ink)]"
        >
          Open an account.
        </Link>
      </p>
    </div>
  );
}
