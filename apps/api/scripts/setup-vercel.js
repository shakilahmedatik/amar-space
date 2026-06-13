import fs from 'node:fs'
import path from 'node:path'

const outputDir = path.resolve('.vercel/output')
const funcDir = path.join(outputDir, 'functions/api.func')

// Ensure directories exist
fs.mkdirSync(funcDir, { recursive: true })

// Write .vercel/output/config.json
fs.writeFileSync(
  path.join(outputDir, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [{ src: '/(.*)', dest: '/api' }]
  }, null, 2)
)

// Write .vercel/output/functions/api.func/.vc-config.json
fs.writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs20.x',
    handler: 'index.js',
    launcherType: 'Nodejs'
  }, null, 2)
)

console.log('Vercel Build Output API structure created!')
