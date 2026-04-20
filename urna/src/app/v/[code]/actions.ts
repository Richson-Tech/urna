"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { VOTER_COOKIE } from "@/lib/auth";
import {
  generateReceipt,
  hashEntry,
  genesisHash,
  newVoterToken,
} from "@/lib/crypto";
import { emit } from "@/lib/events";

const CastSchema = z.object({
  code: z.string().min(4).max(16),
  passcode: z.string().max(60).optional(),
  selections: z.array(z.string().min(1).max(40)).min(1).max(40),
});

export type CastResult =
  | { ok: true; receipt: string }
  | { ok: false; error: string };

export async function castBallot(input: unknown): Promise<CastResult> {
  const parsed = CastSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Malformed ballot." };
  }
  const { code, passcode, selections } = parsed.data;

  const election = await prisma.election.findUnique({
    where: { code },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!election) return { ok: false, error: "Election not found." };
  if (election.status !== "OPEN")
    return { ok: false, error: "This ballot is not currently accepting votes." };

  if (election.passcode && election.passcode !== passcode) {
    return { ok: false, error: "The passcode doesn't match." };
  }

  // Validate selections against the method's rules. Doing this on the
  // server is non-negotiable — the client can and will lie.
  const validIds = new Set(election.options.map((o) => o.id));
  for (const id of selections) {
    if (!validIds.has(id)) return { ok: false, error: "Unknown option." };
  }
  if (election.method === "SINGLE" && selections.length !== 1) {
    return { ok: false, error: "Single-choice ballots must pick exactly one." };
  }
  if (election.method === "APPROVAL" && selections.length === 0) {
    return { ok: false, error: "Approve at least one option." };
  }
  if (election.method === "RANKED") {
    const unique = new Set(selections);
    if (unique.size !== selections.length) {
      return { ok: false, error: "A ranked ballot can't list the same option twice." };
    }
    if (selections.length < 1) {
      return { ok: false, error: "Rank at least one option." };
    }
  }

  // Voter token — ensures one ballot per browser per election. We
  // mint one if none exists yet; set it in the same response so a
  // voter can share their browser with a friend and the friend will
  // still be able to vote on other elections.
  const jar = await cookies();
  let voterToken = jar.get(VOTER_COOKIE)?.value;
  if (!voterToken) {
    voterToken = newVoterToken();
    jar.set(VOTER_COOKIE, voterToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const existing = await prisma.ballot.findUnique({
    where: { electionId_voterToken: { electionId: election.id, voterToken } },
  });
  if (existing) {
    // Idempotent: re-returning the same receipt is safer than an error,
    // in case the user submitted twice due to a flaky network.
    return { ok: true, receipt: existing.receipt };
  }

  const payload = JSON.stringify(selections);
  const receipt = generateReceipt();

  // Build the hash chain entry. We grab the latest ballot inside a
  // transaction so we never end up with a forked chain if two votes
  // arrive at the exact same millisecond.
  const { receipt: stored } = await prisma.$transaction(async (tx) => {
    const last = await tx.ballot.findFirst({
      where: { electionId: election.id },
      orderBy: { castAt: "desc" },
      select: { hash: true },
    });
    const prevHash = last?.hash ?? genesisHash(election.code);
    const hash = hashEntry(prevHash, receipt, payload);

    const ballot = await tx.ballot.create({
      data: {
        electionId: election.id,
        voterToken,
        payload,
        receipt,
        prevHash,
        hash,
      },
    });
    await tx.auditEntry.create({
      data: {
        electionId: election.id,
        receipt,
        prevHash,
        hash,
        castAt: ballot.castAt,
      },
    });
    return { receipt: ballot.receipt };
  });

  emit(code);
  return { ok: true, receipt: stored };
}
