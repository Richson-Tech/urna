import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, currentUser } from "@/lib/auth";

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Your name, please.").max(80),
  email: z.string().email("That email doesn't look right."),
  password: z
    .string()
    .min(8, "At least eight characters."),
});

async function signup(formData: FormData) {
  "use server";
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Please check the form.";
    redirect(`/signup?err=${encodeURIComponent(first)}`);
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    redirect(
      `/signup?err=${encodeURIComponent(
        "An account with that email already exists.",
      )}`,
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: await hashPassword(password),
    },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  if (await currentUser()) redirect("/dashboard");
  const { err } = await searchParams;

  return (
    <div>
      <p className="label mb-2">New conductor</p>
      <h1 className="font-serif text-4xl">Open an account.</h1>
      <p className="mt-3 text-[color:var(--color-ink-soft)]">
        You'll use this to create elections and read their results.
        Voters never need one.
      </p>

      {err ? (
        <p className="mt-6 border-l-2 border-[color:var(--color-stamp)] pl-3 text-[color:var(--color-stamp-deep)]">
          {err}
        </p>
      ) : null}

      <form action={signup} className="mt-8 space-y-6">
        <div>
          <label className="label block mb-2" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            name="name"
            className="field"
            placeholder="Eleanor Roosevelt"
            required
            maxLength={80}
          />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            className="field"
            placeholder="you@org.org"
            required
          />
        </div>
        <div>
          <label className="label block mb-2" htmlFor="password">
            Password · at least 8 characters
          </label>
          <input
            id="password"
            type="password"
            name="password"
            className="field"
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Open the ballot box
        </button>
      </form>

      <p className="mt-8 label">
        Already have an account?{" "}
        <Link
          href="/login"
          className="underline decoration-[color:var(--color-rule)] underline-offset-4 hover:decoration-[color:var(--color-ink)]"
        >
          Sign in.
        </Link>
      </p>
    </div>
  );
}
