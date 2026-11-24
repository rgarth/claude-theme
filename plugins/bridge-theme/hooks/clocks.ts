// World clocks for the backdrop's STARDATE block.
//
// Which places to show is the `clocks` option: a comma-separated list of
// IANA time zones, each optionally labelled, such as
// "Sydney=Australia/Sydney, Europe/London, UTC". Local times come from the
// engine's own time-zone data, daylight saving included.

export type Clock = { label: string; zone: string }

export const DEFAULT_CLOCKS = 'Sydney=Australia/Sydney, Bangalore=Asia/Kolkata, San Francisco=America/Los_Angeles, UTC=UTC'
export const MAX_CLOCKS = 8
const ROW = 26 // pixels between clock rows
const DESIGNED_FOR = 4 // the column is laid out for four clocks; more or fewer shifts what's below

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

// The SVG for the block under the STARDATE heading, right-aligned to the
// column's edge (x = -14) with place names on the left (x = -196).
export function clocksSvg(now: number, clocks: readonly Clock[]): string {
  let out = `<text class="date" x="-14" y="32">${stardate(now)}</text>`
  clocks.forEach(({ label, zone }, i) => {
    const y = 66 + i * ROW
    out += `<text class="city" x="-196" y="${y}">${escape(label)}</text>`
    out += `<text class="time" x="-14" y="${y}">${timeIn(now, zone)}</text>`
  })
  return out
}

export type SceneOptions = {
  clocks: readonly Clock[]
  // The SVG for the ON CALL block, drawn by pagerduty.ts; undefined leaves
  // the block out and closes the gap.
  onCall?: string
  // Freezes every animation where it stands, so nothing repaints between the
  // once-a-minute redraws.
  isLowPower?: boolean
}

// The scene at a given moment: clocks filled in, and every animation told the
// time so a redraw carries on where the last one was instead of restarting.
export function sceneAt(scene: string, now: number, { clocks, onCall, isLowPower = false }: SceneOptions): string {
  // Seconds since the epoch, wrapped every 10 days: a whole number of minutes,
  // so the minute dial stays on the real second hand.
  const seconds = ((now / 1000) % 864_000).toFixed(2)
  const shift = (clocks.length - DESIGNED_FOR) * ROW
  return scene
    .replace('--t: 0; --shift: 0px;', `--t: ${seconds}; --shift: ${shift}px;`)
    .replace('<!-- clocks -->', clocksSvg(now, clocks))
    .replace('<!-- oncall -->', onCall ?? '')
    .replace('<svg ', onCall === undefined ? '<svg class="no-oncall" ' : '<svg ')
    .replace('<style>', isLowPower ? '<style>* { animation-play-state: paused !important; }' : '<style>')
}
