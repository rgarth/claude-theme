import { describe, expect, test } from 'claude-code/testing'

import { DEFAULT_CLOCKS, parseClocks, sceneAt, stardate, timeIn } from './clocks'

const at = (iso: string) => Date.parse(iso)
const { clocks: DEFAULTS } = parseClocks(DEFAULT_CLOCKS)

describe('world clocks', () => {
  test('time zones follow daylight saving', async () => {
    expect(timeIn(at('2026-11-24T10:00:00Z'), 'Australia/Sydney')).toBe('21:00') // AEDT, +11
    expect(timeIn(at('2026-06-24T10:00:00Z'), 'Australia/Sydney')).toBe('20:00') // AEST, +10
    expect(timeIn(at('2026-11-24T20:00:00Z'), 'America/Los_Angeles')).toBe('12:00') // PST
    expect(timeIn(at('2026-07-01T20:00:00Z'), 'America/Los_Angeles')).toBe('13:00') // PDT
    expect(timeIn(at('2026-11-24T10:00:00Z'), 'Asia/Kolkata')).toBe('15:30')
    expect(timeIn(at('2026-11-24T00:07:00Z'), 'UTC')).toBe('00:07')
  })

  test('the clocks option takes labels, bare zones, and reports bad ones', async () => {
    const { clocks, problems } = parseClocks(' Home=Europe/London , America/New_York, Mars/Olympus ,')
    expect(clocks).toEqual([
      { label: 'HOME', zone: 'Europe/London' },
      { label: 'NEW YORK', zone: 'America/New_York' },
    ])
    expect(problems).toEqual(['unknown time zone "Mars/Olympus"'])
    expect(DEFAULTS.map(c => c.label)).toEqual(['SYDNEY', 'BANGALORE', 'SAN FRANCISCO', 'UTC'])
    expect(parseClocks(Array(10).fill('UTC').join(',')).clocks.length).toBe(8)
  })

  test('stardate is the UTC date as YYYY.MM.DD', async () => {
    expect(stardate(at('2026-01-01T00:00:00Z'))).toBe('2026.01.01')
    expect(stardate(at('2026-11-24T23:59:00Z'))).toBe('2026.11.24')
  })

  test('the scene is filled in and told the time', async () => {
    const scene = '<svg><style>svg { --t: 0; --shift: 0px; }</style><!-- clocks --></svg>'
    const out = sceneAt(scene, at('2026-11-24T10:00:00Z'), { clocks: DEFAULTS })
    expect(out.includes('<!-- clocks -->')).toBe(false)
    expect(out.includes('--t: 0;')).toBe(false)
    expect(out.includes('--shift: 0px;')).toBe(true)
    expect(out.includes('>21:00<')).toBe(true)
    expect(out.includes('SAN FRANCISCO')).toBe(true)
  })

  test('low power freezes every animation; full power leaves them running', async () => {
    const scene = '<svg><style>svg { --t: 0; --shift: 0px; }</style></svg>'
    const now = at('2026-11-24T10:00:00Z')
    expect(sceneAt(scene, now, { clocks: DEFAULTS, onCall: '', isLowPower: true }).includes('animation-play-state: paused')).toBe(true)
    expect(sceneAt(scene, now, { clocks: DEFAULTS }).includes('animation-play-state')).toBe(false)
  })

  test('with no ON CALL block the panel is hidden and the gap closed', async () => {
    const scene = '<svg xmlns="x"><style></style><!-- oncall --></svg>'
    const now = at('2026-11-24T10:00:00Z')
    expect(sceneAt(scene, now, { clocks: DEFAULTS }).startsWith('<svg class="no-oncall" ')).toBe(true)
    expect(sceneAt(scene, now, { clocks: DEFAULTS, onCall: '<text/>' }).includes('no-oncall')).toBe(false)
  })

  test('more clocks push what is below them down', async () => {
    const scene = '<svg><style>svg { --t: 0; --shift: 0px; }</style></svg>'
    const six = parseClocks('UTC, UTC, UTC, UTC, UTC, UTC').clocks
    expect(sceneAt(scene, at('2026-11-24T10:00:00Z'), { clocks: six }).includes('--shift: 52px;')).toBe(true)
  })
})
