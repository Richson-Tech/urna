import { createHash, randomBytes } from "node:crypto";

/**
 * Short, human-readable receipt code: 9 chars grouped like "X7-9K2-QFA".
 * Uses a Crockford-inspired alphabet (no 0/O/1/I/L to avoid confusion).
 * ~4.7 × 10⁻¹³ collision space per election — more than enough, and we
 * enforce uniqueness at the DB level anyway.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateReceipt(): string {
  const bytes = randomBytes(9);
  let out = "";
  for (let i = 0; i < 9; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 1 || i === 4) out += "-";
  }
  return out;
}

/**
 * Append-only hash chain: each ballot's hash commits to the previous
 * ballot's hash, the receipt, and the payload. If anyone tampers with
 * the log — reorders, deletes, edits — the chain breaks and everyone
 * can see it. The genesis entry uses a fixed prefix derived from the
 * election code so chains can't be swapped between elections.
 */
export function hashEntry(
  prevHash: string,
  receipt: string,
  payload: string,
): string {
  return createHash("sha256")
    .update(prevHash)
    .update("|")
    .update(receipt)
    .update("|")
    .update(payload)
    .digest("hex");
}

export function genesisHash(electionCode: string): string {
  return createHash("sha256")
    .update("urna:genesis:")
    .update(electionCode)
    .digest("hex");
}

/**
 * Voter tokens are random opaque strings stored per-voter in a
 * long-lived cookie. They are not tied to identity; they exist only to
 * prevent a voter casting more than one ballot per election from the
 * same browser. This is an honest, not perfect, deterrent — anyone
 * determined to vote twice can clear cookies or use a second device.
 * We surface that limitation in the product copy rather than pretend
 * otherwise.
 */
export function newVoterToken(): string {
  return randomBytes(24).toString("base64url");
}
