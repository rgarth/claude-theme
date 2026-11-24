import { describe, expect, test } from 'claude-code/testing'

import { redAlert, redAlertScene } from './alert'

describe('red alert', () => {
  test('swaps the pastel palette for reds and leaves other colours', async () => {
    expect(redAlert('<rect fill="#FF9900"/><circle fill="#ffffff"/>')).toBe('<rect fill="#ff2b1c"/><circle fill="#ffffff"/>')
  })

  test('the scene gets a pulsing wash as its last layer', async () => {
    const out = redAlertScene('<svg><svg></svg><rect fill="#cc99cc"/></svg>')
    expect(out.endsWith('fill="#ff0000"/></svg>')).toBe(true)
    expect(out.includes('#b3202a')).toBe(true)
  })
})
