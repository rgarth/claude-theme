// World clocks for the backdrop's STARDATE block.
//
// Offsets are worked out here, with each place's daylight-saving rule, so the
// clocks don't depend on time-zone data being present where the mod runs.

const HOUR = 3_600_000

// The UTC moment of the nth Sunday (n = 1, 2...) of a month, at a given UTC hour.
function nthSunday(year: number, month: number, n: number, utcHour: number): number {
  const first = new Date(Date.UTC(year, month, 1))
  const day = 1 + ((7 - first.getUTCDay()) % 7) + 7 * (n - 1)
  return Date.UTC(year, month, day, utcHour)
}

// Sydney: AEDT (+11) from the first Sunday of October, 2am local (16:00 UTC the
// day before), until the first Sunday of April, 3am local (16:00 UTC the day before).
function sydneyOffset(now: number): number {
  const year = new Date(now).getUTCFullYear()
  const endsThisYear = nthSunday(year, 3, 1, 16) - 24 * HOUR
  const startsThisYear = nthSunday(year, 9, 1, 16) - 24 * HOUR
  const isSummer = now < endsThisYear || now >= startsThisYear
  return (isSummer ? 11 : 10) * HOUR
}

// San Francisco: PDT (-7) from the second Sunday of March, 2am local (10:00 UTC),
// until the first Sunday of November, 2am local (09:00 UTC).
function sanFranciscoOffset(now: number): number {
  const year = new Date(now).getUTCFullYear()
  const starts = nthSunday(year, 2, 2, 10)
  const ends = nthSunday(year, 10, 1, 9)
  return (now >= starts && now < ends ? -7 : -8) * HOUR
}

export const CITIES: readonly [string, (now: number) => number][] = [
  ['SYDNEY', sydneyOffset],
  ['BANGALORE', () => 5.5 * HOUR],
  ['SAN FRANCISCO', sanFranciscoOffset],
  ['UTC', () => 0],
]

const two = (n: number) => String(n).padStart(2, '0')

export function timeIn(now: number, offset: number): string {
  const t = new Date(now + offset)
  return `${two(t.getUTCHours())}:${two(t.getUTCMinutes())}`
}

// The year plus how far through it we are: 2026.898 and so on.
export function stardate(now: number): string {
  const year = new Date(now).getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return (year + (now - start) / (end - start)).toFixed(3)
}

// The SVG for the block under the STARDATE heading, right-aligned to the
// column's edge (x = -14) with city names on the left (x = -196).
export function clocksSvg(now: number): string {
  let out = `<text class="date" x="-14" y="32">${stardate(now)}</text>`
  CITIES.forEach(([name, offset], i) => {
    const y = 66 + i * 26
    out += `<text class="city" x="-196" y="${y}">${name}</text>`
    out += `<text class="time" x="-14" y="${y}">${timeIn(now, offset(now))}</text>`
  })
  return out
}

// The scene at a given moment: clocks filled in, and every animation told the
// time so a redraw carries on where the last one was instead of restarting.
export function sceneAt(scene: string, now: number): string {
  const seconds = ((now / 1000) % 1_000_000).toFixed(2)
  return scene.replace('--t: 0;', `--t: ${seconds};`).replace('<!-- clocks -->', clocksSvg(now))
}
