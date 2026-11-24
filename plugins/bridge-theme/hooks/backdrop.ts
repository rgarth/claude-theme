// Fills in the generated backdrop (scene.ts) for one moment. The drawing
// marks the four places it changes; see scripts/gen-scene.cjs.

import { clockShift, clocksSvg } from './clocks'
import type { Clock } from './clocks'
import { SCENE, WRAP_SECONDS } from './scene'

export type BackdropState = {
  clocks: readonly Clock[]
  // The SVG for the ON CALL block, or null to leave the block out and close the gap.
  onCall: string | null
  isLowPower: boolean
  isRedAlert: boolean
}

export function backdropAt(now: number, state: BackdropState): string {
  const classes = [state.isRedAlert && 'red-alert', state.isLowPower && 'low-power', state.onCall === null && 'no-oncall']
    .filter(Boolean)
    .join(' ')
  // Seconds since the epoch, wrapped (a whole number of minutes, so the minute
  // dial stays on the real second hand): every animation is told the time, so
  // a redraw carries on instead of restarting.
  const seconds = ((now / 1000) % WRAP_SECONDS).toFixed(2)
  return SCENE
    .replace('{{classes}}', classes)
    .replace('{{vars}}', `--t: ${seconds}; --shift: ${clockShift(state.clocks.length)}px;`)
    .replace('<!-- clocks -->', clocksSvg(now, state.clocks))
    .replace('<!-- oncall -->', state.onCall ?? '')
}
