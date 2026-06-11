import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { '[[...path]]': 'src/index.ts' },
  format: ['esm'],
  outDir: 'api',
  clean: true,
  shims: true,
  splitting: false,
  noExternal: ['@repo/shared', '@repo/db'],
})