// Stands in for the engine beneath the mod in UI tests: nothing sits beneath a
// plugin in a test, so each call it makes on `$` needs an answer. Records what
// the mod asked for, for the test to check.

import type { On } from 'claude-code'

export function stubEngine(on: On) {
  const seen = { store: new Map<string, unknown>(), looks: [] as string[], played: [] as string[], opened: [] as string[] }
  on('store.get', (_, e) => ({ value: seen.store.get(e.key) }))
  on('store.set', (_, e) => {
    seen.store.set(e.key, e.value)
    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    seen.looks.push(String(e.colors?.label ?? ''))
    return { value: { isDrawn: true, requestId: 'look' } }
  })
  on('audio.play', (_, e) => {
    seen.played.push('asset' in e.clip ? String(e.clip.asset) : '?')
    return { value: undefined }
  })
  on('ui.open', (_, e) => {
    seen.opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-11-24T10:00:00Z') }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  return seen
}
