// Switches the person flips that are kept between sessions in the mod's store.
// Read with flag(); change only with setFlag(), which also redraws and saves.

import type { EngineInterface } from 'claude-code'

export type Flag = 'isLowPower' | 'isOnCallOff'

const flags: Record<Flag, boolean> = { isLowPower: false, isOnCallOff: false }

export function flag(name: Flag): boolean {
  return flags[name]
}

export async function loadFlags($: EngineInterface): Promise<void> {
  const [isLowPower, isOnCallOff] = await Promise.all([$.store.get('isLowPower'), $.store.get('isOnCallOff')])
  flags.isLowPower = isLowPower === true
  flags.isOnCallOff = isOnCallOff === true
}

export async function setFlag($: EngineInterface, name: Flag, value: boolean): Promise<void> {
  flags[name] = value
  $.ui.invalidate('ui.render')
  await $.store.set(name, value)
}
