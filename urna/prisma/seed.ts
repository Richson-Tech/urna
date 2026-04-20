/**
 * A small demo seed — one account, one of each voting method, and
 * a sprinkling of ballots so the results page has something to show
 * before you cast your first vote. Run with:
 *
 *   npx tsx prisma/seed.ts
 *
 * Safe to re-run: everything is keyed off a fixed demo email, so we
 * wipe and re-create rather than append duplicates.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@urna.example";
const DEMO_PASSWORD = "demo1234";

const shortCode = customAlphabet("23456789ABCDEFGHJKMNPQRSTVWXYZ", 8);
const receiptAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function receipt(): string {
  const bytes = randomBytes(9);
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += receiptAlphabet[bytes[i] % receiptAlphabet.length];
    if (i === 1 || i === 4) out += "-";
  }
  return out;
}

function hashEntry(prev: string, r: string, payload: string) {
  return createHash("sha256")
    .update(prev)
    .update("|")
    .update(r)
    .update("|")
    .update(payload)
    .digest("hex");
}

function genesis(code: string) {
  return createHash("sha256").update("urna:genesis:").update(code).digest("hex");
}

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Organizer",
      password: await bcrypt.hash(DEMO_PASSWORD, 12),
    },
  });

  await makeElection({
    userId: user.id,
    title: "Where should we go for the team offsite?",
    description:
      "A vote to decide where our eight-person team should spend the week of the offsite. Lunch, dinner, and local transit are covered either way.",
    method: "RANKED",
    options: [
      { label: "Lisbon", subtitle: "Coastal, sunny, and we know a good apartment." },
      { label: "Edinburgh", subtitle: "Castle views; the pubs are walking distance." },
      { label: "Kyoto", subtitle: "Quieter, longer flight, unforgettable in spring." },
      { label: "Mexico City", subtitle: "Excellent food scene and short flights." },
    ],
    ballotDistribution: [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 3, 1, 2],
      [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3],
      [2, 0, 1, 3], [2, 3, 0, 1],
      [3, 0, 1, 2], [3, 1, 0, 2], [3, 0, 2, 1],
    ],
  });

  await makeElection({
    userId: user.id,
    title: "Pick a name for the new conference room.",
    description:
      "Tick every name you'd be happy with — this one's approval-style, so vote as broadly as you like.",
    method: "APPROVAL",
    options: [
      { label: "The Library" },
      { label: "Turing" },
      { label: "The Aviary" },
      { label: "Hypatia" },
      { label: "The Foundry" },
    ],
    ballotDistribution: [
      [0, 3], [0, 1, 3], [1, 3], [1], [3, 4], [3],
      [0, 2, 3], [3], [1, 3], [0, 3], [2, 4],
    ],
  });

  await makeElection({
    userId: user.id,
    title: "Shall we move the weekly standup to Tuesday at 10am?",
    description:
      "Simple yes or no. Either way we'll try it for a month before revisiting.",
    method: "SINGLE",
    options: [
      { label: "Yes — move it to Tuesday 10am" },
      { label: "No — keep it where it is" },
    ],
    ballotDistribution: [[0], [0], [0], [0], [1], [0], [1], [0], [0]],
  });

  console.log(`\nSeeded demo data.`);
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
}

interface MakeElectionArgs {
  userId: string;
  title: string;
  description: string;
  method: "SINGLE" | "APPROVAL" | "RANKED";
  options: Array<{ label: string; subtitle?: string }>;
  ballotDistribution: number[][];
}

async function makeElection(args: MakeElectionArgs) {
  const code = shortCode();
  const election = await prisma.election.create({
    data: {
      code,
      title: args.title,
      description: args.description,
      method: args.method,
      status: "OPEN",
      publicResults: true,
      opensAt: new Date(),
      creatorId: args.userId,
      options: {
        create: args.options.map((o, i) => ({
          label: o.label,
          subtitle: o.subtitle ?? null,
          position: i,
        })),
      },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  let prev = genesis(code);
  for (const indexList of args.ballotDistribution) {
    const ids = indexList.map((i) => election.options[i]!.id);
    const payload = JSON.stringify(ids);
    const r = receipt();
    const hash = hashEntry(prev, r, payload);
    await prisma.ballot.create({
      data: {
        electionId: election.id,
        voterToken: randomBytes(12).toString("base64url"),
        payload,
        receipt: r,
        prevHash: prev,
        hash,
      },
    });
    await prisma.auditEntry.create({
      data: {
        electionId: election.id,
        receipt: r,
        prevHash: prev,
        hash,
      },
    });
    prev = hash;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
