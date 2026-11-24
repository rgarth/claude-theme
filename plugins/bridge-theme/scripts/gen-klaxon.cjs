// Synthesises the red-alert klaxon: three rising whoops, 16-bit mono WAV.
// Usage: node scripts/gen-klaxon.cjs sounds/klaxon.wav
const fs = require('fs')
const RATE = 22050, WHOOP = 0.62, GAP = 0.18, COUNT = 3, GAIN = 0.32
const total = Math.round(RATE * (WHOOP + GAP) * COUNT)
const data = Buffer.alloc(total * 2)
let phase = 0
for (let n = 0; n < total; n++) {
  const t = n / RATE, inCycle = t % (WHOOP + GAP)
  let v = 0
  if (inCycle < WHOOP) {
    const k = inCycle / WHOOP
    const freq = 320 + 560 * Math.pow(k, 0.8) // rising sweep
    phase += freq / RATE
    const p = phase % 1
    const saw = 2 * p - 1
    const square = p < 0.5 ? 1 : -1
    const env = Math.min(1, inCycle / 0.03) * Math.min(1, (WHOOP - inCycle) / 0.08)
    v = (0.55 * saw + 0.45 * square) * env * GAIN
  }
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), n * 2)
}
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
h.write('data', 36); h.writeUInt32LE(data.length, 40)
fs.mkdirSync(require('path').dirname(process.argv[2]), { recursive: true })
fs.writeFileSync(process.argv[2], Buffer.concat([h, data]))
console.log('wrote', process.argv[2], (44 + data.length) + ' bytes')
