import { expect, test } from 'claude-code/testing'

import { stubEngine } from './test-engine'

const RAIL = {
  plugin: 'bridge-theme',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

test('RED ALERT on the rail turns the console red, sounds the klaxon, and stands down', async ($, on) => {
  const { played, looks } = stubEngine(on)


  for (const surface of ['desktop', 'mobile'] as const) {
    played.length = 0
    looks.length = 0
    const rail = await $.ui.mount({ ...RAIL, surface })
    expect((await rail.find({ type: 'Button', key: 'red-alert' }))?.text).toBe('▲ RED ALERT')

    await rail.press({ key: 'red-alert' })
    expect(looks).toEqual(['Bridge Theme: Red Alert'])
    expect(played).toEqual(['sounds/klaxon.wav'])
    expect((await rail.find({ type: 'Button', key: 'red-alert' }))?.text).toBe('▲ STAND DOWN')

    await rail.press({ key: 'red-alert' })
    expect(looks).toEqual(['Bridge Theme: Red Alert', 'Bridge Theme'])
    expect(played.length).toBe(1)
    await rail.unmount()
  }
})

test('/red-alert toggles silently, like the button', async ($, on) => {
  const { looks } = stubEngine(on)

  const typed = { command: 'red-alert', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const
  expect((await $.command.run(typed)).text).toBeUndefined()
  await $.command.run(typed)
  expect(looks).toEqual(['Bridge Theme: Red Alert', 'Bridge Theme'])
})
