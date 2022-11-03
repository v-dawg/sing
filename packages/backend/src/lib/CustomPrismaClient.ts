import { PrismaClient } from "@prisma/client"

export function createPrismaClient() {
  const client = new PrismaClient({
    datasources: {
      db: { url: process.argv[2] },
    },
  })

  return client
}
