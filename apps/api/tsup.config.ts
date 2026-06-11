import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  shims: true,
  splitting: false,
  noExternal: ['@repo/shared', '@repo/db'],
})