import { PrismaClient } from "@/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Use a single DB connection + adapter
const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter, // driver adapter for better-sqlite3
    // log: ["query", "info", "warn", "error"], // uncomment for debugging
  });
};

// Prevent multiple instances in dev (Next HMR)
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;

