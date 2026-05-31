import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().int().min(1000).max(60000).default(30000),
  DB_CONNECTION_TIMEOUT: z.coerce
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(10000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z
    .string()
    .url()
    .default('https://pub-40447608ec184615a71d23d6ff08de5e.r2.dev'),
})

export type Env = z.infer<typeof envSchema>

declare module 'fastify' {
  interface FastifyInstance {
    env: Env
  }
}

export default fp(
  async function envPlugin(fastify: FastifyInstance) {
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (issue.code === 'invalid_type' && issue.input === undefined) {
          process.stderr.write(`Environment variable ${path} is missing\n`)
        } else {
          process.stderr.write(
            `Environment variable ${path} is invalid: ${issue.message}\n`,
          )
        }
      }
      process.exit(1)
    }

    fastify.decorate('env', result.data)
  },
  {
    name: 'env',
  },
)
