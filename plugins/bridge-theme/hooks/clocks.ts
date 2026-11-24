// World clocks for the backdrop's STARDATE block.
//
// Which places to show is the `clocks` option: a comma-separated list of
// IANA time zones, each optionally labelled, such as
// "Sydney=Australia/Sydney, Europe/London, UTC". Local times come from the
// engine's own time-zone data, daylight saving included.

import { LAYOUT } from './scene'

export type Clock = { label: string; zone: string }

export const DEFAULT_CLOCKS = 'Sydney=Australia/Sydney, Bangalore=Asia/Kolkata, San Francisco=America/Los_Angeles, UTC=UTC'
export const MAX_CLOCKS = 8

const formats = new Map<string, Intl.DateTimeFormat>()
function formatFor(zone: string): Intl.DateTimeFormat {
  let f = formats.get(zone)
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    formats.set(zone, f)
  }
  return f
}

// Reads the `clocks` option. Unknown zones are left out and named in `problems`.
export function parseClocks(text: string): { clocks: Clock[]; problems: string[] } {
  const clocks: Clock[] = []
  const problems: string[] = []
  for (const item of text.split(',').map(s => s.trim()).filter(Boolean)) {
    const eq = item.indexOf('=')
    const zone = (eq >= 0 ? item.slice(eq + 1) : item).trim()
    const named = eq >= 0 ? item.slice(0, eq).trim() : ''
    const label = (named || (zone.split('/').pop() ?? zone).replace(/_/g, ' ')).toUpperCase().slice(0, 14)
    try {
      formatFor(zone)
    } catch {
      problems.push(`unknown time zone "${zone}"`)
      continue
    }
    clocks.push({ label, zone })
  }
  if (clocks.length > MAX_CLOCKS) {
    problems.push(`only the first ${MAX_CLOCKS} clocks fit`)
    clocks.length = MAX_CLOCKS
  }
  return { clocks, problems }
}

// Back to the option's text form, for storing what the clocks pane edits.
export function formatClocks(clocks: readonly Clock[]): string {
  return clocks.map(c => `${c.label}=${c.zone}`).join(', ')
}

// The list with clock `i` moved one place up (-1) or down (+1).
export function moveClock(clocks: readonly Clock[], i: number, by: -1 | 1): Clock[] {
  const j = i + by
  if (i < 0 || j < 0 || i >= clocks.length || j >= clocks.length) return [...clocks]
  const out = [...clocks]
  ;[out[i], out[j]] = [out[j]!, out[i]!]
  return out
}

// The time in a zone as HH:MM, 24-hour.
export function timeIn(now: number, zone: string): string {
  const parts = formatFor(zone).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

const two = (n: number) => String(n).padStart(2, '0')

// Today's date in UTC as YYYY.MM.DD.
export function stardate(now: number): string {
  const t = new Date(now)
  return `${t.getUTCFullYear()}.${two(t.getUTCMonth() + 1)}.${two(t.getUTCDate())}`
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The SVG for the block under the STARDATE heading: values right-aligned to
// the column's right edge, place names from its left.
export function clocksSvg(now: number, clocks: readonly Clock[]): string {
  const { colLeft, colRight, clockTop, clockRow } = LAYOUT
  let out = `<text class="date" x="${colRight}" y="32">${stardate(now)}</text>`
  clocks.forEach(({ label, zone }, i) => {
    const y = clockTop + i * clockRow
    out += `<text class="city" x="${colLeft}" y="${y}">${escape(label)}</text>`
    out += `<text class="time" x="${colRight}" y="${y}">${timeIn(now, zone)}</text>`
  })
  return out
}

// How far everything below the clocks moves, in pixels, to make room for more
// clocks than the column was laid out for (or to close up for fewer).
export function clockShift(count: number): number {
  return (count - LAYOUT.clocksFit) * LAYOUT.clockRow
}
