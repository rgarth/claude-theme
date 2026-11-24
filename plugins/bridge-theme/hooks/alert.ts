// Red alert: the console turns red and a klaxon sounds. For this session only.

import type { EngineInterface, Register } from 'claude-code'

import { applyLook } from './looks'

type On = Parameters<Register>[0]

export const RED_ALERT_COMMAND = { name: 'red-alert', description: 'Sound the klaxon and turn the console red; again to stand down' }

let isOn = false

export function isRedAlert(): boolean {
  return isOn
}

export async function setRedAlert($: EngineInterface, value: boolean): Promise<void> {
  isOn = value
  if (value) {
    void $.audio.play({ asset: 'sounds/klaxon.wav' }).catch(error => $.ui.log(`bridge-theme: klaxon: ${String(error)}`))
  }
  $.ui.invalidate('ui.render') // the backdrop and rail switch at once
  await applyLook($, value)
}

// /red-alert: the same as the rail's button, and as silent.
export function registerRedAlert(on: On): void {
  on('command.run', { command: 'red-alert' }, async $ => {
    await setRedAlert($, !isOn)
    return {}
  })
}
