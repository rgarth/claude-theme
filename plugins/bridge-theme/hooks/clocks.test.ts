import { describe, expect, test } from 'claude-code/testing'

import { DEFAULT_CLOCKS, clockShift, parseClocks, stardate, timeIn } from './clocks'

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

  test('more clocks than fit push what is below them down; fewer close up', async () => {
    expect(clockShift(4)).toBe(0)
    expect(clockShift(6)).toBe(52)
    expect(clockShift(3)).toBe(-26)
  })
})
