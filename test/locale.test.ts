import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The package root, one level above this test file. */
const root = new URL('..', import.meta.url).pathname

/** The card fields one locale file declares; an absent one reads as undefined. */
interface Meta {
  title: string | undefined
  description: string | undefined
  detail: string | undefined
}

/** Read one locale JSON the way the Host does: an object whose `meta` carries the card fields. */
function locale(language: string): Meta {
  const file = join(root, 'locale', `${language}.json`)
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as { meta?: Record<string, unknown> }
  const meta = parsed.meta ?? {}
  const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined)
  return { title: text(meta.title), description: text(meta.description), detail: text(meta.detail) }
}

/** Every language the package ships a dictionary for. */
const LOCALES = ['en', 'zh']

describe('locale metadata', () => {
  // The plugin manager reads `<package>/locale/en.json` and then every sibling
  // language file; without en.json the dictionary is empty and the card falls back
  // to the manifest's single English description. This keeps that file from going missing.
  it('has an English dictionary the other locales hang off', () => {
    expect(existsSync(join(root, 'locale', 'en.json'))).toBe(true)
    expect(locale('en').title).toBeTruthy()
    expect(locale('en').description).toBeTruthy()
  })

  it('translates the card for a Chinese reader', () => {
    const chinese = locale('zh')
    expect(chinese.title).toBe('会话通知')
    expect(chinese.description).toContain('Bark')
    // A translated card must not be a copy of the English one.
    expect(chinese.description).not.toBe(locale('en').description)
  })

  it('names a detail document that ships and stays inside the package', () => {
    for (const language of LOCALES) {
      const detail = locale(language).detail
      expect(detail, `${language}.json: meta.detail`).toBeTruthy()
      if (detail === undefined) continue
      expect(detail).not.toContain('..')
      expect(detail.endsWith('.md')).toBe(true)
      expect(existsSync(join(root, detail))).toBe(true)
    }
  })

  it('stays inside the files the package publishes', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      exports: Record<string, string>
      files: string[]
    }
    expect(manifest.exports['./locale/*.json']).toBe('./locale/*.json')
    expect(manifest.files).toContain('locale/*.json')
    // `meta.detail` is read from the published tarball, so the documents must be in `files`.
    for (const document of ['docs/DETAIL.md', 'docs/DETAIL.zh.md']) expect(manifest.files).toContain(document)
  })
})
