import { customAlphabet } from "nanoid";

// 8-char URL-safe codes without 0/O/1/I/L/U to minimize misreads when
// someone is reading the code aloud over a call. 29^8 ≈ 5 × 10¹¹ —
// collision risk is negligible and the DB enforces uniqueness.
export const newElectionCode = customAlphabet(
  "23456789ABCDEFGHJKMNPQRSTVWXYZ",
  8,
);
