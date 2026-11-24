// The world clocks the backdrop shows, and the Clocks pane (/star-date) that
// edits them. The list starts from the `clocks` option; once edited, the
// edited list is kept in the store and wins.

import type { EngineInterface, Register } from 'claude-code'

import { MAX_CLOCKS, formatClocks, moveClock, parseClocks, timeIn } from './clocks'
import type { Clock } from './clocks'

type On = Parameters<Register>[0]

export const STAR_DATE_COMMAND = { name: 'star-date', description: 'Add, remove and reorder the world clocks' }

const PANE = 'bridge-clocks'
let clocks: readonly Clock[] = []
let notice = '' // the pane's last word: a bad zone, or a full list

export function currentClocks(): readonly Clock[] {
  return clocks
}

export async function loadClocks($: EngineInterface, defaults: readonly Clock[]): Promise<void> {
  const edited = await $.store.get('clocks')
  clocks = typeof edited === 'string' ? parseClocks(edited).clocks : defaults
}

async function setClocks($: EngineInterface, next: readonly Clock[], nextNotice = ''): Promise<void> {
  clocks = next
  notice = nextNotice
  $.ui.invalidate('ui.render')
  await $.store.set('clocks', formatClocks(next))
}

function say($: EngineInterface, text: string): void {
  notice = text
  $.ui.invalidate('ui.render')
}

async function addClock($: EngineInterface, text: string): Promise<void> {
  const { clocks: found, problems } = parseClocks(text)
  const room = MAX_CLOCKS - clocks.length
  if (found.length === 0) return say($, problems[0] ?? 'Type a time zone such as Europe/London, or Label=Europe/London.')
  if (room <= 0) return say($, `Only ${MAX_CLOCKS} clocks fit. Remove one first.`)
  await setClocks($, [...clocks, ...found.slice(0, room)], problems.join('; '))
}

async function openPane($: EngineInterface): Promise<void> {
  notice = ''
  await $.ui.open({ id: PANE, title: 'Clocks', focus: true, closeOnEscape: true })
}

export function registerClocksPane(on: On, defaults: readonly Clock[]): void {
  on('command.run', { command: 'star-date' }, async $ => {
    await openPane($)
    return { text: 'Clocks pane opened.' }
  })

  // Each clock with buttons to move or remove it, a field to add one, and a
  // reset to the option's list.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          {clocks.length === 0 && <Text dimColor>No clocks.</Text>}
          {clocks.map((c, i) => (
            <Box flexDirection="row" gap={1} alignItems="center">
              <Text bold>{c.label}</Text>
              <Text dimColor>
                {c.zone} {timeIn(now, c.zone)}
              </Text>
              <Box flexGrow={1} />
              <Button key={`up-${i}`} plain label="↑" onPress={() => setClocks($, moveClock(clocks, i, -1))} />
              <Button key={`down-${i}`} plain label="↓" onPress={() => setClocks($, moveClock(clocks, i, 1))} />
              <Button key={`remove-${i}`} plain label="✕" onPress={() => setClocks($, clocks.filter((_, k) => k !== i))} />
            </Box>
          ))}
        </Box>
        <Input key="add" label="Add" placeholder="Tokyo=Asia/Tokyo, or Asia/Tokyo" submitLabel="add" autoFocus onSubmit={value => addClock($, value)} />
        {notice !== '' && <Text color="warning">{notice}</Text>}
        <Box flexDirection="row" gap={2}>
          <Button key="reset" label="Reset to defaults" onPress={() => setClocks($, defaults)} />
          <Button key="done" variant="primary" label="Done" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
      </Box>
    )
  })
}
