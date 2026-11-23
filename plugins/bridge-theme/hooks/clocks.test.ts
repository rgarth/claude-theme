import { describe, expect, test } from 'claude-code/testing'

import { CITIES, sceneAt, stardate, timeIn } from './clocks'

const at = (iso: string) => Date.parse(iso)
const offsetOf = (name: string, now: number) => CITIES.find(([n]) => n === name)![1](now)
const local = (name: string, iso: string) => timeIn(at(iso), offsetOf(name, at(iso)))

describe('world clocks', () => {
  test('Sydney follows daylight saving', async () => {
    expect(local('SYDNEY', '2026-11-24T10:00:00Z')).toBe('21:00') // AEDT, +11
    expect(local('SYDNEY', '2026-06-24T10:00:00Z')).toBe('20:00') // AEST, +10
    // Ends 3am AEDT on Sunday 5 April 2026, which is 16:00 UTC on the 4th
    expect(local('SYDNEY', '2026-04-04T15:59:00Z')).toBe('02:59')
    expect(local('SYDNEY', '2026-04-04T16:00:00Z')).toBe('02:00')
    // Starts 2am AEST on Sunday 4 October 2026, which is 16:00 UTC on the 3rd
    expect(local('SYDNEY', '2026-10-03T15:59:00Z')).toBe('01:59')
    expect(local('SYDNEY', '2026-10-03T16:00:00Z')).toBe('03:00')
  })

  test('San Francisco follows daylight saving', async () => {
    expect(local('SAN FRANCISCO', '2026-11-24T20:00:00Z')).toBe('12:00') // PST, -8
    expect(local('SAN FRANCISCO', '2026-07-01T20:00:00Z')).toBe('13:00') // PDT, -7
    // Starts Sunday 8 March 2026 at 10:00 UTC; ends Sunday 1 November 2026 at 09:00 UTC
    expect(local('SAN FRANCISCO', '2026-03-08T09:59:00Z')).toBe('01:59')
    expect(local('SAN FRANCISCO', '2026-03-08T10:00:00Z')).toBe('03:00')
    expect(local('SAN FRANCISCO', '2026-11-01T08:59:00Z')).toBe('01:59')
    expect(local('SAN FRANCISCO', '2026-11-01T09:00:00Z')).toBe('01:00')
  })

  test('Bangalore is UTC+5:30 and UTC is UTC', async () => {
    expect(local('BANGALORE', '2026-11-24T10:00:00Z')).toBe('15:30')
    expect(local('UTC', '2026-11-24T10:07:00Z')).toBe('10:07')
  })

  test('stardate is the year and how far through it', async () => {
    expect(stardate(at('2026-01-01T00:00:00Z'))).toBe('2026.000')
    expect(stardate(at('2026-07-02T12:00:00Z'))).toBe('2026.500')
  })

  test('the scene is filled in and told the time', async () => {
    const scene = '<svg><style>svg { --t: 0; }</style><!-- clocks --></svg>'
    const out = sceneAt(scene, at('2026-11-24T10:00:00Z'))
    expect(out.includes('<!-- clocks -->')).toBe(false)
    expect(out.includes('--t: 0;')).toBe(false)
    expect(out.includes('>21:00<')).toBe(true)
    expect(out.includes('SAN FRANCISCO')).toBe(true)
  })
})
