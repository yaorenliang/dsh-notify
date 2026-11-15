// Print the CHANGELOG entry for one version, so a release body can be the notes
// that were already written rather than a compare link. Empty output means the
// version has no entry; the caller then falls back to generated notes.
import { readFileSync } from 'node:fs'

const version = process.argv[2]?.replace(/^v/, '') ?? ''
const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n')
const start = lines.findIndex((line) => line.startsWith('## ') && line.slice(3).startsWith(version + ' '))
if (start === -1) process.exit(0)

/** The lines between this version's heading and the next one. */
const body = []
for (const line of lines.slice(start + 1)) {
  if (line.startsWith('## ')) break
  body.push(line)
}
process.stdout.write(body.join('\n').trim() + '\n')
