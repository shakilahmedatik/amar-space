import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_BASE_URL: z.string().url(),
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
        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
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
