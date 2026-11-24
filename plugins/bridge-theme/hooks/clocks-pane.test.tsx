import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'bridge-theme',
  component: 'Pane',
  requestId: 'bridge-clocks',
  props: {
    title: 'Clocks',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the Clocks pane adds, moves, removes and resets clocks, on every surface', async ($, on) => {
  // Nothing sits beneath the plugin: each hook here stands for the engine.
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'look' } }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-11-24T10:00:00Z') }))
  on('clock.after', () => ({ value: undefined }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    store.delete('clocks')
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'reset' })
    // Each clock is its label (bold) then its zone and time (dim): the labels are the texts without digits.
    const labels = async () => (await ui.findAll({ type: 'Text' })).map(t => t.text ?? '').filter(t => /^[A-Z ]+$/.test(t))
    expect(await labels()).toEqual(['SYDNEY', 'BANGALORE', 'SAN FRANCISCO', 'UTC'])

    await ui.input({ key: 'add', text: 'Home=Europe/London' })
    expect(await labels()).toEqual(['SYDNEY', 'BANGALORE', 'SAN FRANCISCO', 'UTC', 'HOME'])
    expect(store.get('clocks')).toContain('HOME=Europe/London')

    await ui.press({ key: 'up-4' })
    await ui.press({ key: 'remove-0' })
    expect(await labels()).toEqual(['BANGALORE', 'SAN FRANCISCO', 'HOME', 'UTC'])

    await ui.input({ key: 'add', text: 'Mars/Olympus' })
    expect((await ui.find({ type: 'Text', text: /unknown time zone/ }))?.text).toContain('Mars/Olympus')
    expect((await labels()).length).toBe(4)

    await ui.unmount()
  }
})

