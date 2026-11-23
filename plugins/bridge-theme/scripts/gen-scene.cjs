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
const X = 300, Y = 56, YB = 24, V = 72, A = 7, R = 60, r = 36, CW = Math.max(R + 50, V + r + 14), CH = Math.max(R + 44, A + r + 14)

// One elbow drawn at the top-left; the bottom one is the same drawn mirrored.
function elbow(cornerCol, arm, bar, Y = TOPY) {
  let out = `<path d="M${X} ${Y + R}A${R} ${R} 0 0 1 ${X + R} ${Y}H${X + CW}V${Y + A}H${X + V + r}A${r} ${r} 0 0 0 ${X + V} ${Y + A + r}V${Y + CH}H${X}Z" fill="${cornerCol}"/>`
  let cx = X + CW + G
  arm.forEach(([w, col, cls], i) => {
    out += (i === arm.length - 1 ? capR : rect)(cx, Y, w, A, col, cls)
    cx += w + G
  })
  let cy = Y + CH + G
  bar.forEach(([h, col, cls]) => { out += rect(X, cy, V, h, col, cls); cy += h + G })
  return { out, end: cy } // end: where the next bar segment would start
}
const TOPY = Y
const top = elbow(C.o, [[50, C.pe, 'blink1'], [140, C.l], [24, C.co], [60, C.pw], [90, C.o]], [[50, C.pw], [90, C.l], [28, C.pe, 'blink2']])
const bot = elbow(C.l, [[30, C.o, 'blink1'], [120, C.pw], [40, C.pe], [60, C.o]], [[40, C.co], [70, C.pe]], YB)

function telemetry(x, y, rows, cols, col) {
  const lh = 14, lines = []
  for (let i = 0; i < rows; i++) {
    const row = []
    for (let j = 0; j < cols; j++) row.push(String(Math.floor(rnd() * (j % 2 ? 9999 : 99))).padStart(j % 2 ? 4 : 2, '0'))
    lines.push(row.join('  '))
  }
  let out = ''
  for (const dy of [0, rows * lh]) lines.forEach((t, i) => { out += `<text x="${x}" y="${y + dy + i * lh}" fill="${i % 7 === 3 ? C.o : col}">${t}</text>` })
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
function railRight(y, h, items) { // flush to the right edge, pill cap on the outside
  const total = items.reduce((a, [w]) => a + w + G, -G)
  let cx = -10 - total, out = ''
  items.forEach(([w, col, cls], i) => { out += (i === items.length - 1 ? capR : rect)(cx, y, w, h, col, cls); cx += w + G })
  return out
}

const tx = X + V + 18, ty = Y + A + r + 16
const tL = telemetry(tx, ty, 30, 3, C.pe)
const tR = telemetry(-150, 346, 22, 2, C.l)
const midTop = top.end, midBottom = bot.end // px from top, px from bottom

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
.s1 { fill: #ffffff; opacity: 0.55; animation: drift 1200s linear infinite; }
.s2 { fill: #ffe9d6; opacity: 0.7; animation: drift 700s linear infinite; }
@keyframes drift { from { transform: translateX(0px); } to { transform: translateX(-1600px); } }
text { font-family: sans-serif; font-stretch: condensed; font-size: 11px; letter-spacing: 1px; }
.tele { opacity: 0.55; }
.scrollL { animation: upL 110s linear infinite; }
.scrollR { animation: upR 80s linear infinite; }
@keyframes upL { from { transform: translateY(0px); } to { transform: translateY(-${tL.span}px); } }
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
.midbar { x: ${X}px; y: ${midTop}px; width: ${V}px; height: calc(100% - ${midTop + midBottom}px); }
.midcut { x: ${X}px; y: calc(50% - ${G / 2}px); width: ${V}px; height: ${G}px; }
</style>
<defs><clipPath id="cl"><rect x="${tx - 4}" y="${ty - 14}" width="220" height="300"/></clipPath><clipPath id="cr"><rect x="-160" y="332" width="150" height="240"/></clipPath></defs>
<rect width="100%" height="100%" fill="#000000"/>
<svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
${stars(110, 0.5, 0.9, 's1')}
${stars(40, 0.9, 1.5, 's2')}
</svg>
<!-- left frame: top elbow, full-height bar, bottom elbow -->
${top.out}
<rect class="midbar" fill="${C.o}"/>
<rect class="midcut" fill="#000000"/>
<svg x="0" y="100%" width="1" height="1" overflow="visible"><g transform="scale(1 -1)">${bot.out}</g></svg>
<g clip-path="url(#cl)"><g class="tele scrollL">${tL.out}</g></g>
<!-- right side: rails, schematic, chart, telemetry -->
<svg x="100%" y="0" width="1" height="1" overflow="visible">
${railRight(Y, 22, [[30, C.pw], [90, C.pe], [24, C.co, 'blink2'], [110, C.o]])}
${railRight(Y + 28, 8, [[60, C.l], [22, C.o], [110, C.pe]])}
<g class="schem"><circle cx="-80" cy="246" r="48"/><circle cx="-80" cy="246" r="30"/><path d="M-136 246H-24M-80 190V302"/></g>
<g class="spin"><path class="schem" d="M-80 198A48 48 0 0 1 -32 246" stroke="${C.o}"/><circle cx="-32" cy="246" r="4" fill="${C.o}"/></g>
<g opacity="0.8">${chart(-260, 176, 8, 12, 4, 60)}</g>
<g clip-path="url(#cr)"><g class="tele scrollR">${tR.out}</g></g>
</svg>
<svg x="100%" y="100%" width="1" height="1" overflow="visible">
${railRight(-32, 22, [[30, C.co], [110, C.o], [24, C.pe, 'blink2'], [140, C.l]])}
</svg>
</svg>`
fs.writeFileSync(process.argv[2], '// Generated console scene for the deep-bridge look.\nexport const SCENE = ' + JSON.stringify(svg) + '\n')
console.log('svg chars', svg.length, 'midTop', midTop, 'midBottom', midBottom)
