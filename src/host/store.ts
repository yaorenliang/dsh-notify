/**
 * The configuration file: one small JSON document owned by the Host.
 *
 * Writes are atomic (temp file + rename) so a crash mid-write cannot leave a
 * half document behind, and every read is defensive: an unreadable or malformed
 * file degrades to the defaults instead of failing plugin activation.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_CONFIG, mergeConfig, resolveConfig, type NotifyConfig } from '../core/config.ts'

/** Where the document lives and how it is read and written. */
export interface ConfigStoreOptions {
  /** Absolute path of the JSON document. */
  readonly file: string
  /** Read the file as UTF-8; injected so tests need no disk. */
  readonly readText?: (path: string) => string
  /** Write the file atomically; injected so tests need no disk. */
  readonly writeText?: (path: string, text: string) => void
  /** Host logger, used when the document cannot be parsed. */
  readonly warn?: (message: string) => void
  /** A predecessor's document to import when this one does not exist yet. */
  readonly legacyFile?: string
  /** Translator from a predecessor document into this plugin's configuration. */
  readonly migrate?: (raw: unknown) => NotifyConfig
}

/** The live configuration document with change notification. */
export class ConfigStore {
  private config: NotifyConfig = DEFAULT_CONFIG
  private readonly file: string
  private readonly readText: (path: string) => string
  private readonly writeText: (path: string, text: string) => void
  private readonly warn: (message: string) => void
  private readonly legacyFile: string | undefined
  private readonly migrate: ((raw: unknown) => NotifyConfig) | undefined

  constructor(options: ConfigStoreOptions) {
    this.file = options.file
    this.readText = options.readText ?? ((path) => readFileSync(path, 'utf8'))
    this.writeText = options.writeText ?? atomicWrite
    this.warn = options.warn ?? (() => {})
    this.legacyFile = options.legacyFile
    this.migrate = options.migrate
  }

  /** Read the document once; a missing file keeps the defaults. */
  load(): NotifyConfig {
    try {
      this.config = resolveConfig(JSON.parse(this.readText(this.file)))
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') this.warn(`dsh-notify: could not read ${this.file}: ${String(error)}`)
      this.config = this.importLegacy()
    }
    return this.config
  }

  /**
   * Import a predecessor's document on first run.
   *
   * The imported values are persisted under this plugin's own file so later
   * edits have one source of truth; the predecessor's file is left in place so
   * rolling back stays possible.
   */
  private importLegacy(): NotifyConfig {
    if (this.legacyFile === undefined || this.migrate === undefined) return DEFAULT_CONFIG
    try {
      const imported = this.migrate(JSON.parse(this.readText(this.legacyFile)))
      try {
        this.writeText(this.file, `${JSON.stringify(imported, null, 2)}\n`)
      } catch (error) {
        this.warn(`dsh-notify: could not persist the imported configuration: ${String(error)}`)
      }
      return imported
    } catch {
      return DEFAULT_CONFIG
    }
  }

  /** The current configuration. */
  get(): NotifyConfig {
    return this.config
  }

  /** Apply a browser patch, persist it, and notify listeners. */
  update(patch: unknown): NotifyConfig {
    const next = mergeConfig(this.config, patch)
    this.config = next
    try {
      this.writeText(this.file, `${JSON.stringify(next, null, 2)}\n`)
    } catch (error) {
      this.warn(`dsh-notify: could not write ${this.file}: ${String(error)}`)
    }
    return next
  }
}

/** Write through a temp sibling so readers never observe a partial document. */
function atomicWrite(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = join(dirname(path), `.${Date.now()}-${process.pid}.tmp`)
  writeFileSync(temp, text, 'utf8')
  renameSync(temp, path)
}
