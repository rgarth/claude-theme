import { expect, test } from 'claude-code/testing'

import { stubEngine } from './test-engine'

const OPTIONS = { pagerdutyServer: 'pagerduty', primarySchedule: 'PRIMARY', secondarySchedule: 'SECONDARY', incidentScope: 'teams' }
const shift = (schedule: string, name: string) => ({
  schedule: { id: schedule },
  user: { summary: name },
  start: '2026-11-24T09:00:00Z',
  end: '2026-11-24T17:00:00Z',
})
const reply = (response: unknown[]) => ({ value: { content: [{ type: 'text' as const, text: JSON.stringify({ response }) }], isError: false } })

test('on-call names survive the incident lookup finishing second', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  on('clock.sleep', () => new Promise(() => {})) // the command's 7-second limit never runs out here

  // Answer the on-call list first and the incidents just after it: the order
  // that used to lose the names.
  let onCallAnswered!: () => void
  const onCallDone = new Promise<void>(resolve => (onCallAnswered = resolve))
  on('mcp.call', async (_, e) => {
    if (e.tool === 'browse_schedules') {
      onCallAnswered()
      return reply([shift('PRIMARY', 'Ada Lovelace'), shift('SECONDARY', 'Grace Hopper')])
    }
    await onCallDone
    await Promise.resolve()
    return reply([{ incident_number: 7, status: 'triggered', service: { summary: 'Warp core' } }])
  })

  const typed = { command: 'bridge-crew', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const
  const { text } = await $.command.run(typed)
  expect(text).toContain('Primary: ADA L. until 17:00 UTC')
  expect(text).toContain('Secondary: GRACE H. until 17:00 UTC')
  expect(text).toContain('Open high-urgency escalations: 1')
})
