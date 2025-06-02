import { PrismaClient } from "@prisma/client"

// Declare a global variable for PrismaClient to prevent multiple instances in development
declare global {
  var prismaGlobal: PrismaClient | undefined
}

// Use the global PrismaClient instance if it exists, otherwise create a new one
export const prisma = global.prismaGlobal || new PrismaClient()

// In development, store the PrismaClient instance globally to prevent hot-reloading issues
if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma
}
