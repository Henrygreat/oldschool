import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      schoolId: string
    } & DefaultSession["user"]
  }

  interface User {
    schoolId: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    schoolId: string
  }
}
