import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'

const out = 'lib'
await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

const shared = {
  bundle: true,
  sourcemap: false,
  logLevel: 'info',
}

await build({
  ...shared,
  entryPoints: ['src/host/index.ts'],
  outfile: `${out}/index.js`,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@deepseek-ai/*', 'node:*'],
})

await build({
  ...shared,
  entryPoints: ['src/client/index.tsx'],
  outfile: `${out}/client.js`,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', '@deepseek-ai/*'],
  banner: { js: 'window.__ModuleLoader__.load({\n\tid: "dsh-notify",\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;' },
  footer: { js: '\t\treturn module.exports;\n\t}\n});' },
})
