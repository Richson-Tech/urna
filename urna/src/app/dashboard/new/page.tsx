import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { newElectionCode } from "@/lib/shortcode";
import { NewElectionForm } from "./NewElectionForm";

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
  method: z.enum(["SINGLE", "APPROVAL", "RANKED"]),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(140),
        subtitle: z.string().trim().max(140).optional(),
      }),
    )
    .min(2, "You need at least two options.")
    .max(20, "Twenty options is the limit."),
  passcode: z.string().trim().max(60).optional(),
  publicResults: z.boolean(),
  openNow: z.boolean(),
  closesAt: z.string().optional(),
});

async function createElection(payload: unknown) {
  "use server";
  const user = await currentUser();
  if (!user) throw new Error("Not authorized");

  const parsed = CreateSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid form.";
    return { ok: false as const, error: first };
  }
  const data = parsed.data;

  let code = newElectionCode();
  // Exceedingly unlikely collision, but handle it deterministically.
  while (await prisma.election.findUnique({ where: { code } })) {
    code = newElectionCode();
  }

  const closesAt = data.closesAt ? new Date(data.closesAt) : null;
  if (closesAt && Number.isNaN(closesAt.getTime())) {
    return { ok: false as const, error: "Close time couldn't be parsed." };
  }

  const election = await prisma.election.create({
    data: {
      code,
      title: data.title,
      description: data.description || null,
      method: data.method,
      passcode: data.passcode || null,
      publicResults: data.publicResults,
      status: data.openNow ? "OPEN" : "DRAFT",
      opensAt: data.openNow ? new Date() : null,
      closesAt,
      creatorId: user.id,
      options: {
        create: data.options.map((o, i) => ({
          label: o.label,
          subtitle: o.subtitle || null,
          position: i,
        })),
      },
    },
  });

  return { ok: true as const, id: election.id };
}

export default async function NewElectionPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <p className="label">Step one</p>
      <h1 className="font-serif text-4xl mt-2">Describe the race.</h1>
      <p className="mt-3 text-[color:var(--color-ink-soft)] max-w-xl">
        Give it a title, a method of counting, and the options voters
        will choose from. You can edit the title later, but not the
        method once a single ballot is cast.
      </p>

      <div className="rule mt-8" />

      <NewElectionForm action={createElection} />
    </div>
  );
}
