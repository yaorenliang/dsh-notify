import { describe, expect, it } from 'vitest'
import { Backlog } from '../src/host/backlog.ts'

describe('event backlog', () => {
  it('hands a new client a cursor and no history', () => {
    const backlog = new Backlog()
    backlog.record({ id: 'a' })

    expect(backlog.since(null)).toEqual({ seq: 1, entries: [] })
  })

  it('returns only what the client has not seen', () => {
    const backlog = new Backlog()
    backlog.record({ id: 'a' })
    backlog.record({ id: 'b' })

    expect(backlog.since(1)).toEqual({ seq: 2, entries: [{ id: 'b' }] })
    expect(backlog.since(2).entries).toEqual([])
  })

  it('forgets what is old enough that nobody will ask for it', () => {
    const backlog = new Backlog(200, 60_000)
    const now = 1_000_000
    backlog.record({ id: 'old' }, now - 120_000)
    backlog.record({ id: 'fresh' }, now)

    expect(backlog.since(0, now).entries).toEqual([{ id: 'fresh' }])
  })

  it('keeps a bounded window so a storm cannot grow the Host', () => {
    const backlog = new Backlog(3, 60_000)
    for (const id of ['a', 'b', 'c', 'd', 'e']) backlog.record({ id })

    const entries = backlog.since(0).entries.map((entry) => (entry as { id: string }).id)
    expect(entries).toEqual(['c', 'd', 'e'])
  })
})
