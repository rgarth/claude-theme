const fs = require('fs')
let s = 19910923
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
const C = { o: '#ff9900', pe: '#ffcc99', l: '#cc99cc', pw: '#9999ff', co: '#cc6666' }
const G = 4 // black gap between segments

// Stars live in their own 1600x1000 box that slices to fill the window.
function stars(n, rmin, rmax, cls) {
  const W = 1600, H = 1000, pts = []
  for (let i = 0; i < n; i++) pts.push([rnd() * W, rnd() * H, rmin + rnd() * (rmax - rmin)])
  let out = ''
  for (const dx of [0, W]) for (const [x, y, r] of pts) out += `<circle cx="${(x + dx).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`
  return `<g class="${cls}">${out}</g>`
}
const rect = (x, y, w, h, col, cls) => `<path d="M${x} ${y}H${x + w}V${y + h}H${x}Z" fill="${col}"${cls ? ` class="${cls}"` : ''}/>`
const capR = (x, y, w, h, col, cls) => { const r = h / 2; return `<path d="M${x} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x}Z" fill="${col}"${cls ? ` class="${cls}"` : ''}/>` }
const capL = (x, y, w, h, col, cls) => { const r = h / 2; return `<path d="M${x + r} ${y}H${x + w}V${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z" fill="${col}"${cls ? ` class="${cls}"` : ''}/>` }

// Left frame geometry, in pixels of the window.
// The backdrop sits behind the whole window: clear the app's sidebar (~290px)
// on the left and its title bar (~45px) at the top.
const X = 300, Y = 56, YB = 24, V = 110, A = 7, R = 60, r = 36, CW = Math.max(R + 50, V + r + 14), CH = Math.max(R + 44, A + r + 14)

// One elbow drawn at the top-left; the bottom one is the same drawn mirrored.
function elbow(cornerCol, arm, bar, Y = TOPY) {
  // arm === null: no elbow at all, the bar just ends in a square block.
  let out = arm === null ? rect(X, Y, V, CH, cornerCol) : `<path d="M${X} ${Y + R}A${R} ${R} 0 0 1 ${X + R} ${Y}H${X + CW}V${Y + A}H${X + V + r}A${r} ${r} 0 0 0 ${X + V} ${Y + A + r}V${Y + CH}H${X}Z" fill="${cornerCol}"/>`
  let cx = X + CW + G
  if (arm === null) {
    // nothing sweeps out sideways
  } else if (typeof arm === 'number') {
    // One unbroken arm continuing the corner's colour, fading out to nothing.
    out += `<path d="M${X + CW - 1} ${Y}H${X + CW + arm}V${Y + A}H${X + CW - 1}Z" fill="url(#armFade)"/>`
    cx = X + CW + arm
  } else arm.forEach(([w, col, cls], i) => {
    out += (i === arm.length - 1 ? capR : rect)(cx, Y, w, A, col, cls)
    cx += w + G
  })
  let cy = Y + CH + G
  const labels = [] // [y of the block's far edge from the elbow, word]
  bar.forEach(([h, col, cls, word]) => {
    out += rect(X, cy, V, h, col, cls)
    if (word) labels.push([cy + h, cy, word])
    cy += h + G
  })
  return { out, end: cy, armEnd: cx, labels } // end: where the next bar segment would start
}
// A word in black, tucked into the bottom-right corner of a block.
const label = (y, word) => `<text class="lbl" x="${X + V - 6}" y="${y}">${word}</text>`
const TOPY = Y
const top = elbow(C.o, 240, [[52, C.pw, '', 'SENSORS'], [90, C.l, '', 'OVERRIDE'], [34, C.pe, 'blink2', 'STATUS']])
const bot = elbow(C.l, null, [[40, C.co, '', 'AUX 07'], [70, C.pe, '', 'COMMS']], YB)

// Columns of readouts, each column right-aligned on its own edge.
// colW: the width of each column; a token's right edge sits at its column's end.
function token() {
  const k = rnd()
  const digits = n => String(Math.floor(rnd() * 10 ** n)).padStart(n, '0')
  if (k < 0.18) return `${digits(3)}-${digits(3)}`
  return digits(2 + Math.floor(rnd() * 5))
}
function tokenColour() {
  const k = rnd()
  return k < 0.62 ? C.pw : k < 0.82 ? '#ffffff' : k < 0.95 ? C.pe : C.o
}
function telemetry(x, y, rows, colW, lh) {
  const cells = []
  for (let i = 0; i < rows; i++) cells.push(colW.map(() => [token(), tokenColour()]))
  let out = ''
  for (const dy of [0, rows * lh]) cells.forEach((row, i) => {
    let edge = x
    row.forEach(([t, c], j) => {
      edge += colW[j]
      out += `<text x="${edge}" y="${y + dy + i * lh}" fill="${c}" text-anchor="end">${t}</text>`
    })
  })
  return { out, span: rows * lh }
}
function chart(x, y, n, w, gap, maxH) {
  const cols = [C.o, C.pe, C.l, C.pw, C.co]
  let out = ''
  for (let i = 0; i < n; i++) {
    const h = 12 + rnd() * (maxH - 12), bx = x + i * (w + gap)
    out += `<rect class="bar b${i % 4}" x="${bx}" y="${(y - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" fill="${cols[i % 5]}" style="transform-origin: ${bx}px ${y}px"/>`
  }
  return out
}
// A bracketed bar graph whose bars rise and fall slowly, each on its own beat.
function bigChart(x, base, n, w, gap, maxH) {
  const cols = [C.pw, C.pw, C.pe, C.pw, C.l, C.pw, C.pe]
  const width = n * (w + gap) - gap + 2 * gap
  let out = `<path class="bracket" d="M${x} ${base - maxH - 14}V${base}H${x + width}V${base - maxH - 14}"/>`
  for (let i = 0; i < n; i++) {
    const bx = x + gap + i * (w + gap)
    const wave = 1 + Math.floor(rnd() * 3), dur = (9 + rnd() * 10).toFixed(1), delay = (-rnd() * 20).toFixed(1)
    out += `<rect x="${bx}" y="${base - maxH - 4}" width="${w}" height="${maxH}" fill="${cols[i % cols.length]}" style="transform-origin: ${bx}px ${base - 4}px; animation: wave${wave} ${dur}s ease-in-out ${delay}s infinite"/>`
  }
  return out
}
function railRight(y, h, items) { // flush to the right edge, pill cap on the outside
  const total = items.reduce((a, [w]) => a + w + G, -G)
  let cx = -10 - total, out = ''
  items.forEach(([w, col, cls], i) => { out += (i === items.length - 1 ? capR : rect)(cx, y, w, h, col, cls); cx += w + G })
  return out
}

const tx = X + V + 18, ty = Y + A + r + 16
const tR = telemetry(-190, 352, 22, [80, 94], 21)
const FRAME_END = 75 // percent of the window's height where the left frame stops
const midTop = top.end, midBottom = bot.end // px from top, px from bottom

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
.s1 { fill: #ffffff; opacity: 0.55; animation: drift 1200s linear infinite; }
.s2 { fill: #ffe9d6; opacity: 0.7; animation: drift 700s linear infinite; }
@keyframes drift { from { transform: translateX(0px); } to { transform: translateX(-1600px); } }
text { font-family: 'Swiss 911 Ultra Compressed BT', 'Swiss911 UCm BT', 'Swiss 911 Ultra Compressed', 'DIN Condensed', 'Arial Narrow', sans-serif; font-stretch: condensed; font-size: 11px; letter-spacing: 1px; }
.tele { opacity: 0.8; }
.tele text { font-size: 18px; letter-spacing: 0.5px; }
.bracket { fill: none; stroke: ${C.pw}; stroke-width: 2; }
@keyframes wave1 { 0%, 100% { transform: scaleY(0.75); } 30% { transform: scaleY(0.35); } 55% { transform: scaleY(0.9); } 80% { transform: scaleY(0.5); } }
@keyframes wave2 { 0%, 100% { transform: scaleY(0.4); } 25% { transform: scaleY(0.85); } 60% { transform: scaleY(0.6); } 85% { transform: scaleY(1); } }
@keyframes wave3 { 0%, 100% { transform: scaleY(0.6); } 40% { transform: scaleY(0.2); } 70% { transform: scaleY(0.95); } }
.lbl { fill: #000000; font-size: 18px; letter-spacing: 1px; text-anchor: end; }
.head { fill: ${C.o}; font-size: 30px; letter-spacing: 2px; }
.sub { fill: ${C.o}; font-size: 17px; letter-spacing: 1.5px; }
.scrollR { animation: upR 80s linear infinite; }
@keyframes upR { from { transform: translateY(0px); } to { transform: translateY(-${tR.span}px); } }
.blink1 { animation: blink 5s steps(1) infinite; }
.blink2 { animation: blink 8s steps(1) infinite; animation-delay: -3s; }
@keyframes blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.35; } }
.bar { animation: grow 9s ease-in-out infinite alternate; }
.b1 { animation-duration: 12s; } .b2 { animation-duration: 7s; animation-delay: -4s; } .b3 { animation-duration: 15s; animation-delay: -6s; }
@keyframes grow { from { transform: scaleY(1); } to { transform: scaleY(0.45); } }
.spin { animation: spin 160s linear infinite; transform-origin: -80px 246px; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.schem { fill: none; stroke: ${C.pw}; stroke-width: 2; opacity: 0.55; }
.midbar { x: ${X}px; y: ${midTop}px; width: ${V}px; height: calc(${FRAME_END}% - ${midTop + midBottom}px); }
/* the cut and its word sit halfway along the middle block */
.midcut { x: ${X}px; y: calc(${FRAME_END / 2}% + ${(midTop - midBottom - G) / 2}px); width: ${V}px; height: ${G}px; }
</style>
<defs><linearGradient id="armFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.o}" stop-opacity="1"/><stop offset="0.3" stop-color="${C.o}" stop-opacity="1"/><stop offset="1" stop-color="${C.o}" stop-opacity="0"/></linearGradient><clipPath id="cr"><rect x="-196" y="334" width="190" height="300"/></clipPath></defs>
<rect width="100%" height="100%" fill="#000000"/>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
${stars(110, 0.5, 0.9, 's1')}
${stars(40, 0.9, 1.5, 's2')}
</svg>
<!-- left frame: top elbow, full-height bar, bottom elbow -->
${top.out}
<rect class="midbar" fill="${C.o}"/>
<rect class="midcut" fill="#000000"/>
<svg x="0" y="${FRAME_END}%" width="1" height="1" overflow="visible"><g transform="scale(1 -1)">${bot.out}</g>
${bot.labels.map(([, near, w]) => label(-near - 7, w)).join('')}
${label(-midBottom - G - 7, 'POWER')}
</svg>
${label(Y + CH - 7, 'BRIDGE')}
${top.labels.map(([far, , w]) => label(far - 7, w)).join('')}
<svg x="0" y="${FRAME_END / 2}%" width="1" height="1" overflow="visible">${label((midTop - midBottom - G) / 2 - 7, 'SYSTEMS')}</svg>
<text class="head" x="${X + V + r + 8}" y="${Y + A + 36}">NCC-1701</text>
<!-- right side: rails, schematic, chart, telemetry -->
<svg x="100%" y="0" width="1" height="1" overflow="visible">
${railRight(Y, 22, [[50, C.pw], [132, C.o]])}
${railRight(Y + 28, 8, [[124, C.l], [58, C.pe]])}
<text class="sub" x="-80" y="184" text-anchor="middle">SENSOR ARRAY</text>
<g class="schem"><circle cx="-80" cy="246" r="48"/><circle cx="-80" cy="246" r="30"/><path d="M-136 246H-24M-80 190V302"/></g>
<g class="spin"><path class="schem" d="M-80 198A48 48 0 0 1 -32 246" stroke="${C.o}"/><circle cx="-32" cy="246" r="4" fill="${C.o}"/></g>
<text class="sub" x="-14" y="324" text-anchor="end">TELEMETRY</text>
<g clip-path="url(#cr)"><g class="tele scrollR">${tR.out}</g></g>
${bigChart(-196, 790, 9, 14, 6, 110)}
</svg>
<svg x="100%" y="100%" width="1" height="1" overflow="visible">
${railRight(-32, 22, [[30, C.co], [110, C.o], [24, C.pe, 'blink2'], [140, C.l]])}
</svg>
</svg>`
fs.writeFileSync(process.argv[2], '// Generated console scene for the bridge-theme look.\nexport const SCENE = ' + JSON.stringify(svg) + '\n')
console.log('svg chars', svg.length, 'midTop', midTop, 'midBottom', midBottom)
