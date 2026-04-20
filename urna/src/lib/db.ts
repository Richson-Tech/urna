import { PrismaClient } from "@prisma/client";

// Reuse the Prisma client across hot reloads in dev to avoid
// exhausting the SQLite connection pool. Production gets a fresh
// singleton per process, which is what we want.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
