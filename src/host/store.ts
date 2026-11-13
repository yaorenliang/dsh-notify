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
}

/** The live configuration document with change notification. */
export class ConfigStore {
  private config: NotifyConfig = DEFAULT_CONFIG
  private readonly file: string
  private readonly readText: (path: string) => string
  private readonly writeText: (path: string, text: string) => void
  private readonly warn: (message: string) => void

  constructor(options: ConfigStoreOptions) {
    this.file = options.file
    this.readText = options.readText ?? ((path) => readFileSync(path, 'utf8'))
    this.writeText = options.writeText ?? atomicWrite
    this.warn = options.warn ?? (() => {})
  }

  /** Read the document once; a missing file keeps the defaults. */
  load(): NotifyConfig {
    try {
      this.config = resolveConfig(JSON.parse(this.readText(this.file)))
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') this.warn(`dsh-notify: could not read ${this.file}: ${String(error)}`)
      this.config = DEFAULT_CONFIG
    }
    return this.config
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
