import { PrismaClient } from '@prisma/client'

// Reuse the Prisma client across hot-reloads in development
// In production (serverless), each function invocation gets a fresh instance
const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
