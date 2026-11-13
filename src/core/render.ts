/**
 * Every user-facing sentence the plugin writes itself.
 *
 * Classification returns facts only; this module turns facts into the one line a
 * person reads on a lock screen, in their language. Content that came from the
 * model or the provider is passed through untouched.
 */
import { isSignedOutAbort, type TurnEndReasonLike } from './events.ts'

/** A supported interface language. */
export type Locale = 'zh' | 'en'

/** The stored language preference. */
export type LocaleSetting = 'auto' | Locale

/** What the Host and the browser answer for one completed turn. */
export function completedBody(text: string, locale: Locale): string {
  const trimmed = text.trim()
  if (trimmed.length > 0) return trimmed
  return locale === 'zh' ? '本轮已完成。' : 'The turn finished.'
}

/** What they answer for a failed turn. */
export function failedBody(code: string | null, message: string, locale: Locale): string {
  if (code !== null && (code === 'QUOTA' || code === 'ACCOUNT_QUOTA' || code === 'INSUFFICIENT_QUOTA')) {
    return locale === 'zh' ? '账号额度已用尽，本轮中止。' : 'The account quota is exhausted; the turn was aborted.'
  }
  const detail = message.trim()
  if (detail.length === 0) {
    return locale === 'zh' ? '本轮在给出答案前失败。' : 'The turn failed before it could answer.'
  }
  return code !== null && !detail.includes(code) ? `${detail} (${code})` : detail
}

/** What they answer for an aborted or interrupted turn. */
export function interruptedBody(reason: TurnEndReasonLike, locale: Locale): string {
  if (isSignedOutAbort(reason)) {
    return locale === 'zh' ? '账号已退出登录，本轮停止。' : 'The account signed out, so the turn stopped.'
  }
  if (reason.kind === 'aborted') {
    return locale === 'zh' ? '本轮被中止。' : 'The turn was aborted.'
  }
  return locale === 'zh' ? '本轮被中断。' : 'The turn was interrupted.'
}

/** What they answer for a pending permission request. */
export function approvalBody(toolName: string, reason: string, locale: Locale): string {
  const tool = toolName.trim().length > 0 ? toolName.trim() : locale === 'zh' ? '工具' : 'Tool'
  const detail = reason.trim()
  const head = locale === 'zh' ? `工具 ${tool} 正在请求执行权限` : `Tool ${tool} is waiting for permission`
  return detail.length > 0 ? `${head}${locale === 'zh' ? '：' : ': '}${detail}` : head
}

/** What they answer for a pending question. */
export function questionBody(text: string, locale: Locale): string {
  const trimmed = text.trim()
  return trimmed.length > 0 ? trimmed : locale === 'zh' ? '助手正在等待你的回答。' : 'The agent is waiting for your answer.'
}

/** Resolve the effective locale from a setting and the environment's language tag. */
export function resolveLocale(setting: LocaleSetting, languageTag: string | undefined): Locale {
  if (setting !== 'auto') return setting
  return languageTag?.toLowerCase().startsWith('zh') === true ? 'zh' : 'en'
}

/** The host environment's best language tag. */
export function hostLanguageTag(): string | undefined {
  return process.env.LC_ALL ?? process.env.LANG ?? Intl.DateTimeFormat().resolvedOptions().locale
}
