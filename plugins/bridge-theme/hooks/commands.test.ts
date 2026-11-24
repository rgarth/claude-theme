import { expect, test } from 'claude-code/testing'

import { COMMANDS } from './register'
import { stubEngine } from './test-engine'

test('every command the mod lists has a handler that answers it', async ($, on) => {
  stubEngine(on)
  on('clock.sleep', () => ({ value: undefined }))
  // Beneath the mod: a command no hook of the mod answered reaches here.
  const unanswered: string[] = []
  on('command.run', (_, e) => {
    unanswered.push(e.command)
    return { text: 'unanswered' }
  })
  for (const { name } of COMMANDS) {
    await $.command.run({ command: name, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  }
  expect(unanswered).toEqual([])
})
