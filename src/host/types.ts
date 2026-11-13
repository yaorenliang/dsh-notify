/**
 * The Host surface this plugin consumes, declared structurally.
 *
 * The plugin deliberately does not depend on DSH's internal packages for types:
 * a structural contract documents exactly what it touches, keeps the repository
 * installable without the Host, and survives internal package reshuffles as long
 * as the runtime shape holds.
 */

/** One exact Fetch route registered below Connection's authentication fence. */
export interface FetchRoute {
  readonly path: string
  readonly methods: readonly ('GET' | 'HEAD' | 'POST')[]
  readonly requestBody: 'buffered' | 'streaming'
  readonly fetch: (request: Request) => Promise<Response>
}

/** The Host services and hooks the plugin uses. */
export interface DshHost {
  /** Register an event listener; the runtime removes it with the plugin fiber. */
  on(event: string, listener: (...args: never[]) => unknown): unknown
  /** Register a disposer scoped to this plugin. */
  effect(disposer: () => (() => void) | void, label?: string): unknown
  /** Host logger. */
  readonly logger?: { warn?: (message: string) => void }
  /**
   * Read one optional Cordis service.
   *
   * Cordis refuses a plain property read for a service this plugin did not
   * declare in `inject`, so every optional service is read through this method.
   */
  get(name: string): unknown
  /** Folded session titles, when the composition provides the service. */
  readonly sessionTitle?: { get(session: unknown): { title?: string | null } | undefined }
  /** Connection: authenticated HTTP carrier. */
  readonly connection: { readonly fetch: { register(route: FetchRoute): () => Promise<void> } }
}

/** The subset of a Host session the plugin reads. */
export interface SessionLike {
  readonly id: string
  readonly header?: { readonly origin?: string; readonly delegationDepth?: number }
}

/** One durable session event, narrowed to the fields read here. */
export interface SessionEventLike {
  readonly type: string
  readonly data?: unknown
}
