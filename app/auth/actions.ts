'use server'

import { Prisma } from '@prisma/client'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export type FormState = { error?: string }

export async function loginAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      email: z.string().trim().email().max(254),
      password: z.string().min(8).max(128),
    })
    .safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    })
  if (!parsed.success) return { error: 'Enter a valid email and password.' }

  try {
    await signIn('credentials', {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email or password was not recognized.' }
    }
    throw error
  }
  return {}
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      firstName: z.string().trim().min(1).max(80),
      surname: z.string().trim().min(1).max(80),
      email: z.string().trim().email().max(254),
      password: z.string().min(8).max(128),
    })
    .safeParse({
      firstName: formData.get('firstName'),
      surname: formData.get('surname'),
      email: formData.get('email'),
      password: formData.get('password'),
    })
  if (!parsed.success) return { error: 'Enter your name, a valid email, and a password of at least 8 characters.' }

  const school = await prisma.school.findUnique({
    where: { shortName: 'GCUOBA' },
    select: { id: true, isActive: true },
  })
  if (!school?.isActive) {
    return { error: 'GCUOBA registration is not available yet. Please contact the association.' }
  }

  try {
    await prisma.user.create({
      data: {
        schoolId: school.id,
        firstName: parsed.data.firstName,
        surname: parsed.data.surname,
        email: parsed.data.email.toLowerCase(),
        password: await bcrypt.hash(parsed.data.password, 12),
      },
      select: { id: true },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'An account with that email already exists. Try signing in instead.' }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Account registration failed.', error.code)
      return { error: 'Your account could not be created. Please try again.' }
    }
    throw error
  }

  redirect('/auth/login?registered=1')
}
