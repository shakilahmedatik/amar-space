import { sessions, users } from '@repo/db/schema'
import { ConflictError, ValidationError } from '@repo/shared/errors'
import type { FieldError } from '@repo/shared/types'
import { emailSchema, passwordSchema } from '@repo/shared/validation'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

export interface RegisterInput {
  email: string
  password: string
}

export interface RegisterResult {
  user: {
    id: string
    email: string
    name: string | null
    role: string
    createdAt: Date
  }
  session: {
    token: string
    expiresAt: Date
  } | null
  sessionError: boolean
}

/**
 * Validates registration input (email and password) using shared Zod schemas.
 * Returns field-level errors if validation fails.
 *
 */
export function validateRegistrationInput(input: RegisterInput): {
  email: string
  password: string
} {
  const errors: FieldError[] = []

  // Validate email
  const emailResult = emailSchema.safeParse(input.email)
  if (!emailResult.success) {
    for (const issue of emailResult.error.issues) {
      errors.push({
        field: 'email',
        message: issue.message,
        rule: issue.code,
      })
    }
  }

  // Validate password
  const passwordResult = passwordSchema.safeParse(input.password)
  if (!passwordResult.success) {
    for (const issue of passwordResult.error.issues) {
      errors.push({
        field: 'password',
        message: issue.message,
        rule: issue.code,
      })
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }

  return {
    email: emailResult.data!,
    password: input.password,
  }
}

/**
 * Registers a new user with the Owner role.
 *
 * Flow:
 * 1. Validate email and password
 * 2. Check for duplicate email
 * 3. Create user via Better Auth (handles password hashing)
 * 4. Update user role to 'owner'
 * 5. Create session via signInEmail
 * 6. If session creation fails, return error indicating user should sign in manually
 *
 */
export async function registerUser(
  fastify: FastifyInstance,
  input: RegisterInput,
  _ipAddress: string,
  _userAgent: string,
): Promise<RegisterResult> {
  // Step 1: Validate input
  const validated = validateRegistrationInput(input)

  // Step 2: Check for duplicate email (Requirement 1.3)
  const existingUser = await fastify.db.query.users.findFirst({
    where: eq(users.email, validated.email),
  })

  if (existingUser) {
    throw new ConflictError('An account with this email address already exists')
  }

  // Step 3: Create user via Better Auth (handles password hashing - Requirement 1.2)
  let createdUser: {
    id: string
    email: string
    name?: string | null
    createdAt?: Date
  }

  try {
    const signUpResponse = await fastify.auth.api.signUpEmail({
      body: {
        email: validated.email,
        password: validated.password,
        name: validated.email.split('@')[0] || validated.email,
      },
    })

    if (!signUpResponse?.user) {
      throw new Error('User creation failed')
    }

    createdUser = {
      id: signUpResponse.user.id,
      email: signUpResponse.user.email,
      name: signUpResponse.user.name,
      createdAt: signUpResponse.user.createdAt,
    }
  } catch (error: unknown) {
    // Better Auth may throw for duplicate email as well
    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('duplicate') ||
        error.message.toLowerCase().includes('unique'))
    ) {
      throw new ConflictError(
        'An account with this email address already exists',
      )
    }
    throw error
  }

  // Step 4: Update user role to 'owner' and set approval status to pending (Requirements 1.1, 2.1)
  await fastify.db
    .update(users)
    .set({ role: 'owner', approvalStatus: 'pending' })
    .where(eq(users.id, createdUser.id))

  // Step 5: Create session (Requirement 1.4)
  // Better Auth signUpEmail may return a token directly, but we use signInEmail
  // to ensure a proper session is created with all metadata.
  let sessionToken: string | null = null
  let sessionExpiresAt: Date | null = null
  let sessionError = false

  try {
    const signInResult = await fastify.auth.api.signInEmail({
      body: {
        email: validated.email,
        password: validated.password,
      },
    })

    if (signInResult?.token) {
      sessionToken = signInResult.token
      try {
        if (fastify.db.query?.sessions) {
          const sess = await fastify.db.query.sessions.findFirst({
            where: eq(sessions.token, sessionToken),
            columns: { expiresAt: true },
          })
          sessionExpiresAt = sess?.expiresAt ?? null
        }
      } catch {
        // Safe fallback in case DB is mocked or query fails
      }
      if (!sessionExpiresAt) {
        sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    } else {
      sessionError = true
    }
  } catch {
    // Requirement 1.7: If session creation fails, still persist the account
    sessionError = true
  }

  return {
    user: {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name ?? null,
      role: 'owner',
      createdAt: createdUser.createdAt ?? new Date(),
    },
    session: sessionToken
      ? {
          token: sessionToken,
          expiresAt: sessionExpiresAt ?? new Date(),
        }
      : null,
    sessionError,
  }
}
