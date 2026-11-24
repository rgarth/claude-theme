import { describe, expect, test } from 'claude-code/testing'

import { backdropAt } from './backdrop'
import { DEFAULT_CLOCKS, parseClocks } from './clocks'
import { SCENE } from './scene'

const NOW = Date.parse('2026-11-24T10:00:00Z')
const { clocks } = parseClocks(DEFAULT_CLOCKS)
const NORMAL = { clocks, onCall: '<text>ON</text>', isLowPower: false, isRedAlert: false }
const rootOf = (svg: string) => svg.slice(0, svg.indexOf('>') + 1)

describe('backdrop', () => {
  test('the generated scene has each place the mod fills in, once', async () => {
    for (const marker of ['{{classes}}', '{{vars}}', '<!-- clocks -->', '<!-- oncall -->']) {
      expect(SCENE.split(marker).length).toBe(2)
    }
  })

  test('the scene is filled in and told the time', async () => {
    const out = backdropAt(NOW, NORMAL)
    expect(out.includes('{{')).toBe(false)
    expect(rootOf(out)).toContain('class="bridge "')
    expect(rootOf(out)).toContain('--t: ')
    expect(rootOf(out)).toContain('--shift: 0px;')
    expect(out).toContain('>21:00<') // Sydney
    expect(out).toContain('<text>ON</text>')
  })

  test('red alert, low power and a hidden ON CALL block are classes on the root', async () => {
    const out = backdropAt(NOW, { ...NORMAL, onCall: null, isLowPower: true, isRedAlert: true })
    expect(rootOf(out)).toContain('class="bridge red-alert low-power no-oncall"')
    // and the scene defines what each class does
    for (const rule of ['.bridge.red-alert {', '.red-alert .ra {', '.low-power * {', '.no-oncall .oncall {']) {
      expect(SCENE).toContain(rule)
    }
  })

  test('more clocks shift what is below them', async () => {
    const six = parseClocks('UTC, UTC, UTC, UTC, UTC, UTC').clocks
    expect(rootOf(backdropAt(NOW, { ...NORMAL, clocks: six }))).toContain('--shift: 52px;')
  })
})
