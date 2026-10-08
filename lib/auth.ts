import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(8) })
          .safeParse(credentials)

        if (!parsedCredentials.success) return null

        const { email, password } = parsedCredentials.data

        const user = await prisma.user.findUnique({
          where: { email },
          include: { school: true },
        })

        if (!user || !user.isActive) return null

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.surname}`,
          schoolId: user.schoolId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.schoolId = user.schoolId
        token.authAt = Math.floor(Date.now() / 1000)
        return token
      }
      if (!token.id) return token

      // Sessions issued before a password change or reset are no longer valid.
      const account = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { isActive: true, passwordChangedAt: true },
      })
      if (!account || !account.isActive) return null
      if (account.passwordChangedAt) {
        const issuedAt = Number(token.authAt ?? token.iat ?? 0)
        if (issuedAt < Math.floor(account.passwordChangedAt.getTime() / 1000)) return null
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.schoolId = token.schoolId as string
      }
      return session
    },
  },
})
