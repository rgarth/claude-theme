// Generates hooks/scene.ts: the console backdrop as one SVG, plus the palettes
// and layout numbers the mod shares with it.
// Usage: node scripts/gen-scene.cjs hooks/scene.ts
//
// Everything that changes at runtime is switched by the mod through two marked
// spots on the root element, never by editing the drawing:
//   class="bridge {{classes}}"  red-alert, low-power, no-oncall
//   style="{{vars}}"            --t (seconds, so animations keep time across
//                               redraws) and --shift (room for extra clocks)
// and two slots it fills with text: <!-- clocks --> and <!-- oncall -->.
const fs = require('fs')
let s = 19910923
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)

// The two palettes. The drawing only ever names var(--o) and friends; the
// red-alert class swaps the values.
const PALETTES = {
  pastel: { o: '#ff9900', pe: '#ffcc99', l: '#cc99cc', pw: '#9999ff', co: '#cc6666' },
  red: { o: '#ff2b1c', pe: '#ff8c7f', l: '#b3202a', pw: '#e0564c', co: '#ff4f4f' },
}
const C = { o: 'var(--o)', pe: 'var(--pe)', l: 'var(--l)', pw: 'var(--pw)', co: 'var(--co)' }
const vars = p => Object.entries(p).map(([k, v]) => `--${k}: ${v};`).join(' ')
const G = 4 // black gap between segments

// Stars live in their own 1600x1000 box that slices to fill the window.
// Flying forward: LAYERS sheets of stars, each growing out from the centre
// and fading in then out over ZOOM seconds, staggered so one is always arriving.
// --t wraps every WRAP seconds (10 days). Every looping animation must fit a
// whole number of times into it, or it jumps when the wrap comes round.
const WRAP = 864000
const LAYERS = 5, ZOOM = 40
function stars(n, i) {
  const W = 1600, H = 1000
  let out = ''
  for (let k = 0; k < n; k++) {
    const r = 0.35 + rnd() * 0.55, tint = rnd() < 0.3 ? '#ffe9d6' : '#ffffff'
    out += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${r.toFixed(2)}" fill="${tint}"/>`
  }
  const delay = -(i * ZOOM) / LAYERS
  return `<g class="warp" style="animation-delay: calc(${delay}s - var(--t) * 1s)">${out}</g>`
}
const paint = (col, cls) => ` style="fill:${col}"${cls ? ` class="${cls}"` : ''}`
const rect = (x, y, w, h, col, cls) => `<path d="M${x} ${y}H${x + w}V${y + h}H${x}Z"${paint(col, cls)}/>`
const capR = (x, y, w, h, col, cls) => { const r = h / 2; return `<path d="M${x} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x}Z"${paint(col, cls)}/>` }
const capL = (x, y, w, h, col, cls) => { const r = h / 2; return `<path d="M${x + r} ${y}H${x + w}V${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z"${paint(col, cls)}/>` }

// Left frame geometry, in pixels of the window.
// The backdrop sits behind the whole window: clear the app's sidebar (~290px)
// on the left and its title bar (~45px) at the top.
const X = 300, Y = 56, YB = 24, V = 110, A = 7, R = 60, r = 36, CW = Math.max(R + 50, V + r + 14), CH = Math.max(R + 44, A + r + 14)

// A frame corner at the top-left with blocks stacked down from it. With
// `arm` (a length), a rounded elbow sweeps into an arm that fades out to the
// right; without, the corner is just a square block. The bottom one is drawn
// mirrored.
function elbow(cornerCol, arm, bar, y) {
  let out = arm === null
    ? rect(X, y, V, CH, cornerCol)
    : `<path d="M${X} ${y + R}A${R} ${R} 0 0 1 ${X + R} ${y}H${X + CW}V${y + A}H${X + V + r}A${r} ${r} 0 0 0 ${X + V} ${y + A + r}V${y + CH}H${X}Z"${paint(cornerCol)}/>` +
      `<path d="M${X + CW - 1} ${y}H${X + CW + arm}V${y + A}H${X + CW - 1}Z" fill="url(#armFade)"/>`
  let cy = y + CH + G
  const labels = [] // [far edge, near edge, word]
  bar.forEach(([h, col, cls, word]) => {
    out += rect(X, cy, V, h, col, cls)
    if (word) labels.push([cy + h, cy, word])
    cy += h + G
  })
  return { out, end: cy, labels } // end: where the next bar segment would start
}
// A word in black, tucked into the bottom-right corner of a block.
const label = (y, word) => `<text class="lbl" x="${X + V - 6}" y="${y}">${word}</text>`
const top = elbow(C.o, 240, [[52, C.pw, '', 'SENSORS'], [90, C.l, '', 'OVERRIDE'], [34, C.pe, 'blink', 'STATUS']], Y)
const bot = elbow(C.l, null, [[40, C.co, '', 'AUX 07'], [70, C.pe, '', 'COMMS']], YB)

// A bracketed bar graph whose bars rise and fall slowly, each on its own beat.
function bigChart(x, base, n, w, gap, maxH) {
  const cols = [C.pw, C.pw, C.pe, C.pw, C.l, C.pw, C.pe]
  const width = n * (w + gap) - gap + 2 * gap
  // No left side: a base line and a right-hand edge only.
  let out = `<path class="bracket" d="M${x} ${base}H${x + width}V${base - maxH - 14}"/>`
  for (let i = 0; i < n; i++) {
    const bx = x + gap + i * (w + gap)
    const wave = 1 + Math.floor(rnd() * 3), dur = (9 + rnd() * 10).toFixed(1), delay = (-rnd() * 20).toFixed(1)
    out += `<rect x="${bx}" y="${base - maxH - 4}" width="${w}" height="${maxH}" style="fill:${cols[i % cols.length]}; transform-origin: ${bx}px ${base - 4}px; animation: wave${wave} ${dur}s ease-in-out calc(${delay}s - var(--t) * 1s) infinite"/>`
  }
  return out
}
// Segments flush to the right edge: a pill cap on the outside end, and on the
// inside end too when isPill.
function railRight(y, h, items, isPill = false) {
  const total = items.reduce((a, [w]) => a + w + G, -G)
  let cx = RAIL_EDGE - total, out = ''
  items.forEach(([w, col, cls], i) => { out += (i === items.length - 1 ? capR : i === 0 && isPill ? capL : rect)(cx, y, w, h, col, cls); cx += w + G })
  return out
}

// Right column, top to bottom, x measured from the window's right edge. The
// mod draws the clock rows and the ON CALL block (clocks.ts, pagerduty.ts)
// from LAYOUT, so both sides work from the same numbers.
const LAYOUT = {
  colLeft: -196, // labels start here
  colRight: -14, // values end here
  clockTop: 66, // first clock row, below the STARDATE heading
  clockRow: 26,
  clocksFit: 4, // more or fewer shift what's below (--shift)
  onCallHeight: 232, // room for the ON CALL block, heading to the next heading
}
const RAIL_EDGE = -10 // the rails run flush to here
const COL_MID = (LAYOUT.colLeft + RAIL_EDGE) / 2 // the dial's centre
const CLOCK_LABEL = 150 // STARDATE heading; the mod fills in the clocks below it
const ONCALL_LABEL = CLOCK_LABEL + LAYOUT.clockTop + (LAYOUT.clocksFit - 1) * LAYOUT.clockRow + 42 // ON CALL heading
const SENSOR_LABEL = ONCALL_LABEL + LAYOUT.onCallHeight, DIAL = SENSOR_LABEL + 82, CHART_BASE = DIAL + 48 + 44 + 124
const FRAME_END = 75 // percent of the window's height where the left frame stops
const midTop = top.end, midBottom = bot.end // px from top, px from bottom
const fade = (id, x1, x2, mid) => `<linearGradient id="${id}" x1="${x1}" y1="0" x2="${x2}" y2="0"><stop offset="0" style="stop-color:${C.o}"/>${mid ? `<stop offset="${mid}" style="stop-color:${C.o}"/>` : ''}<stop offset="1" style="stop-color:${C.o}" stop-opacity="0"/></linearGradient>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" class="bridge {{classes}}" style="{{vars}}">
<style>
.bridge { ${vars(PALETTES.pastel)} }
.bridge.red-alert { ${vars(PALETTES.red)} }
/* red alert: a full-window red wash that pulses over the backdrop */
.ra { display: none; }
.red-alert .ra { display: inline; animation: ra 1.6s ease-in-out infinite; }
@keyframes ra { 0%, 100% { opacity: 0; } 50% { opacity: 0.16; } }
/* low power: every animation frozen where it stands */
.low-power * { animation-play-state: paused !important; }
/* with the ON CALL block off, the sensor array and graph move up into its place */
.no-oncall .oncall { display: none; }
/* --shift moves everything under the clocks when there are more or fewer than fit */
.oncall, .lower { transform: translateY(var(--shift)); }
.no-oncall .lower { transform: translateY(calc(var(--shift) - ${SENSOR_LABEL - ONCALL_LABEL}px)); }
.warp { transform-box: view-box; transform-origin: 800px 500px; opacity: 0; animation: warp ${ZOOM}s cubic-bezier(0.55, 0, 1, 1) infinite; }
@keyframes warp { 0% { transform: scale(0.35); opacity: 0; } 15% { opacity: 0.75; } 80% { opacity: 0.75; } 100% { transform: scale(2.2); opacity: 0; } }
text { font-family: 'Swiss 911 Ultra Compressed BT', 'Swiss911 UCm BT', 'Swiss 911 Ultra Compressed', 'DIN Condensed', 'Arial Narrow', sans-serif; font-stretch: condensed; font-size: 11px; letter-spacing: 1px; }
.city { fill: ${C.l}; font-size: 16px; letter-spacing: 1px; }
.time { fill: #ffffff; font-size: 22px; letter-spacing: 0.5px; text-anchor: end; }
.date { fill: ${C.pe}; font-size: 26px; letter-spacing: 1px; text-anchor: end; }
.who { fill: #ffffff; font-size: 20px; letter-spacing: 0.5px; text-anchor: end; }
.until { fill: ${C.pw}; font-size: 13px; letter-spacing: 1px; text-anchor: end; }
.esc { font-size: 15px; letter-spacing: 0.5px; }
.esc-new { fill: ${C.co}; } .esc-ack { fill: ${C.pe}; } .clear { fill: ${C.pw}; font-size: 16px; letter-spacing: 1px; text-anchor: end; }
.bracket { fill: none; stroke: ${C.pw}; stroke-width: 1; }
@keyframes wave1 { 0%, 100% { transform: scaleY(0.75); } 30% { transform: scaleY(0.35); } 55% { transform: scaleY(0.9); } 80% { transform: scaleY(0.5); } }
@keyframes wave2 { 0%, 100% { transform: scaleY(0.4); } 25% { transform: scaleY(0.85); } 60% { transform: scaleY(0.6); } 85% { transform: scaleY(1); } }
@keyframes wave3 { 0%, 100% { transform: scaleY(0.6); } 40% { transform: scaleY(0.2); } 70% { transform: scaleY(0.95); } }
.lbl { fill: #000000; font-size: 18px; letter-spacing: 1px; text-anchor: end; }
.head { fill: ${C.o}; font-size: 30px; letter-spacing: 2px; }
.sub { fill: ${C.o}; font-size: 17px; letter-spacing: 1.5px; }
.blink { animation: blink 8s steps(1) calc(-3s - var(--t) * 1s) infinite; }
@keyframes blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.35; } }
/* one turn a minute: the dot is at the top on each new minute */
.spin { animation: spin 60s linear calc(0s - var(--t) * 1s) infinite; transform-origin: ${COL_MID}px ${DIAL}px; }
/* the dial's dot beats once a second: solid, then a quick blip that lands back on each whole second */
.blip { animation: blip 1s linear calc(0s - var(--t) * 1s) infinite; }
@keyframes blip { 0%, 82% { opacity: 1; } 91% { opacity: 0.1; } 100% { opacity: 1; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.schem { fill: none; stroke: ${C.pw}; stroke-width: 2; opacity: 0.55; }
.midbar { x: ${X}px; y: ${midTop}px; width: ${V}px; height: calc(${FRAME_END}% - ${midTop + midBottom}px); }
/* the cut and its word sit halfway along the middle block */
.midcut { x: ${X}px; y: calc(${FRAME_END / 2}% + ${(midTop - midBottom - G) / 2}px); width: ${V}px; height: ${G}px; }
</style>
<defs>${fade('railFade', 1, 0)}${fade('armFade', 0, 1, 0.3)}</defs>
<rect width="100%" height="100%" fill="#000000"/>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
${Array.from({ length: LAYERS }, (_, i) => stars(60, i)).join('\n')}
</svg>
<!-- left frame: top elbow, full-height bar, bottom elbow -->
${top.out}
<rect class="midbar" style="fill:${C.o}"/>
<rect class="midcut" fill="#000000"/>
<svg x="0" y="${FRAME_END}%" width="1" height="1" overflow="visible"><g transform="scale(1 -1)">${bot.out}</g>
${bot.labels.map(([, near, w]) => label(-near - 7, w)).join('')}
${label(-midBottom - G - 7, 'POWER')}
</svg>
${label(Y + CH - 7, 'BRIDGE')}
${top.labels.map(([far, , w]) => label(far - 7, w)).join('')}
<svg x="0" y="${FRAME_END / 2}%" width="1" height="1" overflow="visible">${label((midTop - midBottom - G) / 2 - 7, 'SYSTEMS')}</svg>
<text class="head" x="${X + V + r + 8}" y="${Y + A + 36}">NCC-1701</text>
<!-- right side: rails, clocks, on-call, sensor dial, bar graph -->
<svg x="100%" y="0" width="1" height="1" overflow="visible">
${railRight(Y, A, [[186, C.o]])}
<rect x="${RAIL_EDGE - 186 - 240}" y="${Y}" width="241" height="${A}" fill="url(#railFade)"/>
${railRight(Y + A + 6, 22, [[124, C.l], [58, C.pe]], true)}
<text class="sub" x="${LAYOUT.colRight}" y="${CLOCK_LABEL}" text-anchor="end">STARDATE</text>
<g transform="translate(0 ${CLOCK_LABEL})"><!-- clocks --></g>
<g class="oncall"><text class="sub" x="${LAYOUT.colRight}" y="${ONCALL_LABEL}" text-anchor="end">ON CALL</text>
<g transform="translate(0 ${ONCALL_LABEL})"><!-- oncall --></g></g>
<g class="lower">
<text class="sub" x="${LAYOUT.colRight}" y="${SENSOR_LABEL}" text-anchor="end">SENSOR ARRAY</text>
<g class="schem"><circle cx="${COL_MID}" cy="${DIAL}" r="48"/><circle cx="${COL_MID}" cy="${DIAL}" r="30"/><path d="M${COL_MID - 56} ${DIAL}H${COL_MID + 56}M${COL_MID} ${DIAL - 56}V${DIAL + 56}"/></g>
<g class="spin"><path class="schem" d="M${COL_MID - 48} ${DIAL}A48 48 0 0 1 ${COL_MID} ${DIAL - 48}"/><circle class="blip" cx="${COL_MID}" cy="${DIAL - 48}" r="4" style="fill:${C.pe}"/></g>
${bigChart(LAYOUT.colLeft, CHART_BASE, 9, 14, 6, 110)}
</g>
</svg>
<svg x="100%" y="100%" width="1" height="1" overflow="visible">
${railRight(-32, 22, [[30, C.co], [110, C.o], [24, C.pe, 'blink'], [140, C.l]])}
</svg>
<rect class="ra" width="100%" height="100%" fill="#ff0000"/>
</svg>`

// Every looping animation's period, in seconds, must divide the wrap.
for (const period of [ZOOM, 60, 8, 1, 1.6]) {
  if ((WRAP / period) % 1 !== 0) throw new Error(`a ${period}s animation doesn't fit the ${WRAP}s wrap of --t`)
}

fs.writeFileSync(
  process.argv[2],
  `// Generated by scripts/gen-scene.cjs: edit that, then run it. Do not edit by hand.
export const SCENE = ${JSON.stringify(svg)}
export const PALETTES = ${JSON.stringify(PALETTES)} as const
export const LAYOUT = ${JSON.stringify(LAYOUT)} as const
export const WRAP_SECONDS = ${WRAP}
`,
)
console.log('svg chars', svg.length, 'midTop', midTop, 'midBottom', midBottom)
