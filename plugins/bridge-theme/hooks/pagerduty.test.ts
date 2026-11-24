import { describe, expect, test } from 'claude-code/testing'

import { fetchEscalations, fetchOnCall, onCallSvg, shortName } from './pagerduty'
import { LAYOUT } from './scene'
import { ACQUIRING } from './pagerduty'
import type { Escalation, OnCallPair, PagerDutyConfig, Readings } from './pagerduty'

const cfg: PagerDutyConfig = { server: 'pd', primarySchedule: 'PRI', secondarySchedule: 'SEC', incidentScope: 'teams' }
const reply = (response: unknown) => ({ content: [{ type: 'text', text: JSON.stringify({ response, truncated: false }) }] })
const now = Date.parse('2026-11-24T02:00:00Z')
const ok = <T>(value: T) => ({ status: 'ok' as const, value })
const failed = (message: string) => ({ status: 'failed' as const, message })
const draw = (onCall: Readings['onCall'], escalations: Readings['escalations']) => onCallSvg({ onCall, escalations })
const ADA: OnCallPair = { primary: { name: 'ADA L.', until: '07:00' } }

describe('PagerDuty block', () => {
  test('names are shortened to first name and initial', async () => {
    expect(shortName('Ada Lovelace')).toBe('ADA L.')
    expect(shortName('Grace Brewster Hopper')).toBe('GRACE H.')
    expect(shortName('Cher')).toBe('CHER')
  })

  test('on-call picks the current shift for each schedule', async () => {
    const asked: unknown[] = []
    const call = async (server: string, tool: string, args: Record<string, unknown>) => {
      asked.push([server, tool, args])
      return reply([
        { schedule: { id: 'PRI' }, user: { summary: 'Old Shift' }, start: '2026-11-23T15:00:00Z', end: '2026-11-23T23:00:00Z' },
        { schedule: { id: 'PRI' }, user: { summary: 'Ada Lovelace' }, start: '2026-11-23T23:00:00Z', end: '2026-11-24T07:00:00Z' },
        { schedule: { id: 'SEC' }, user: { summary: 'Grace Hopper' }, start: '2026-11-23T23:00:00Z', end: '2026-11-24T07:30:00Z' },
      ])
    }
    const got = await fetchOnCall(call, cfg, now)
    expect(got.primary).toEqual({ name: 'ADA L.', until: '07:00' })
    expect(got.secondary).toEqual({ name: 'GRACE H.', until: '07:30' })
    expect(JSON.stringify(asked[0])).toContain('list_oncalls')
  })

  test('escalations are open high-urgency incidents', async () => {
    let args: Record<string, unknown> = {}
    const call = async (_s: string, _t: string, a: Record<string, unknown>) => {
      args = a
      return reply([
        { incident_number: 101, status: 'triggered', service: { summary: 'Payments API' } },
        { incident_number: 102, status: 'acknowledged', service: { summary: 'Search' } },
      ])
    }
    const got = await fetchEscalations(call, cfg)
    expect(got).toEqual([
      { number: 101, service: 'PAYMENTS API', isAcknowledged: false },
      { number: 102, service: 'SEARCH', isAcknowledged: true },
    ])
    expect(JSON.stringify(args)).toContain('"urgencies":["high"]')
  })

  test('a tool error is thrown, not drawn as data', async () => {
    const call = async () => ({ content: [{ type: 'text', text: 'Schedule Not Found' }], isError: true })
    let failed = false
    try { await fetchOnCall(call, cfg, now) } catch { failed = true }
    expect(failed).toBe(true)
  })

  test('the block says what state it is in', async () => {
    expect(draw(ACQUIRING, ACQUIRING)).toContain('ACQUIRING')
    expect(draw(failed('x'), failed('y'))).toContain('NO SIGNAL')
    expect(draw(ACQUIRING, ok([]))).toContain('ALL CLEAR')
    expect(draw(failed('HooksError: $.mcp.call: no connected MCP tool "x"'), ACQUIRING)).toContain('NOT CONNECTED')
    const many: Escalation[] = Array.from({ length: 5 }, (_, i) => ({ number: i, service: 'S<&>', isAcknowledged: false }))
    const svg = draw(ok(ADA), ok(many))
    expect(svg).toContain('ESCALATIONS 5')
    expect(svg).toContain('+3 MORE')
    expect(svg).toContain('S&lt;&amp;&gt;')
    expect(svg).toContain('UNTIL 07:00 UTC')
    expect(svg).toContain('>—<') // on-call answered, nobody on the secondary shift
  })

  test('on-call still waiting shows ACQUIRING, not empty, even once incidents are in', async () => {
    const svg = draw(ACQUIRING, ok([]))
    expect(svg).not.toContain('>—<')
    expect(svg.split('ACQUIRING').length).toBe(3) // primary and secondary
  })

  test('the tallest ON CALL block fits in the room the scene leaves for it', async () => {
    const many: Escalation[] = Array.from({ length: 9 }, (_, i) => ({ number: i, service: 'SERVICE', isAcknowledged: i % 2 === 0 }))
    const tallest = draw(ok({ primary: { name: 'A', until: '07:00' }, secondary: { name: 'B', until: '07:00' } }), ok(many))
    const bottom = Math.max(...[...tallest.matchAll(/ y="(\d+)"/g)].map(m => Number(m[1])))
    expect(bottom + 24).toBeLessThanOrEqual(LAYOUT.onCallHeight) // 24: room above the next heading
  })
})
