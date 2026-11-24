// The ON CALL block's data: polling the person's own PagerDuty MCP server, and
// /bridge-crew to refresh it or switch it off. pagerduty.ts does the fetching
// and drawing; this file decides when.

import type { EngineInterface, Register } from 'claude-code'

import { flag, setFlag } from './flags'
import { ACQUIRING, fetchEscalations, fetchOnCall, onCallSvg } from './pagerduty'
import type { OnCall, PagerDutyConfig, Readings } from './pagerduty'

type On = Parameters<Register>[0]
type Part = keyof Readings

export const CREW_COMMAND = {
  name: 'bridge-crew',
  description: 'Refresh the ON CALL panel; "/bridge-crew off" hides it and stops PagerDuty lookups, "/bridge-crew on" brings it back',
}

const PARTS: readonly Part[] = ['onCall', 'escalations']
const EVERY: Record<Part, number> = { onCall: 15 * 60_000, escalations: 5 * 60_000 } // on-call (overrides included) changes rarely
const WHAT: Record<Part, string> = { onCall: 'on-call', escalations: 'incident' }

// The PagerDuty server starts with the session and takes a few seconds to
// connect; until it does, a call finds no tool. That isn't a failure: stay on
// ACQUIRING and try again shortly, for up to four minutes.
const RETRY_EVERY = 15_000
const RETRIES = 16
const isStillConnecting = (error: unknown) => String(error).includes('no connected MCP tool')

// Each lookup has its own slot, so one finishing never touches the other's.
const readings: Readings = { onCall: ACQUIRING, escalations: ACQUIRING }

// The panel's config from the mod's options, or null when no schedule is set
// (then there is no panel and nothing is called).
export function crewConfig(option: (key: string, fallback?: string) => string): PagerDutyConfig | null {
  const scope = option('incidentScope', 'teams')
  const pd: PagerDutyConfig = {
    server: option('pagerdutyServer', 'pagerduty'),
    primarySchedule: option('primarySchedule'),
    secondarySchedule: option('secondarySchedule'),
    incidentScope: scope === 'all' || scope === 'assigned' ? scope : 'teams',
  }
  return pd.primarySchedule || pd.secondarySchedule ? pd : null
}

// The SVG for the ON CALL block, or null when the backdrop should leave it out.
export function onCallPanel(pd: PagerDutyConfig | null): string | null {
  return pd !== null && !flag('isOnCallOff') ? onCallSvg(readings) : null
}

// Looks one part up and stores the answer in its slot.
async function fetchInto($: EngineInterface, pd: PagerDutyConfig, part: Part): Promise<void> {
  const call = (server: string, tool: string, args: Record<string, unknown>) => $.mcp.call(server, tool, args)
  if (part === 'onCall') readings.onCall = { status: 'ok', value: await fetchOnCall(call, pd, await $.clock.now()) }
  else readings.escalations = { status: 'ok', value: await fetchEscalations(call, pd) }
}

async function read($: EngineInterface, pd: PagerDutyConfig, part: Part, retry = true, attempt = 0): Promise<void> {
  try {
    await fetchInto($, pd, part)
  } catch (error) {
    if (retry && isStillConnecting(error) && attempt < RETRIES) {
      $.clock.after(RETRY_EVERY, () => void read($, pd, part, true, attempt + 1))
      return
    }
    const message = String(error).slice(0, 300)
    readings[part] = { status: 'failed', message }
    $.ui.log(`bridge-theme: ${WHAT[part]} lookup failed: ${message}`)
  }
  $.ui.invalidate('ui.render')
}

// Reads both now and then on their own schedules, skipping while the panel is off.
export function startCrew($: EngineInterface, pd: PagerDutyConfig): void {
  for (const part of PARTS) {
    if (!flag('isOnCallOff')) void read($, pd, part)
    $.clock.every(EVERY[part], () => void (flag('isOnCallOff') || read($, pd, part)))
  }
}

const who = (label: string, o?: OnCall) => `${label}: ${o ? `${o.name} until ${o.until} UTC` : 'none found'}`

// What /bridge-crew says about what came back.
function report(): string {
  const { onCall, escalations } = readings
  const unanswered = (part: Part, r: { status: 'acquiring' } | { status: 'failed'; message: string }) =>
    r.status === 'failed' ? `The ${WHAT[part]} lookup failed: ${r.message}` : `The ${WHAT[part]} lookup hasn't answered yet.`
  return [
    onCall.status === 'ok' ? `${who('Primary', onCall.value.primary)}; ${who('Secondary', onCall.value.secondary)}` : unanswered('onCall', onCall),
    escalations.status === 'ok' ? `Open high-urgency escalations: ${escalations.value.length}` : unanswered('escalations', escalations),
  ].join('\n')
}

// /bridge-crew [on|off]: refresh and say what came back, or switch the panel.
async function bridgeCrew($: EngineInterface, pd: PagerDutyConfig | null, args: string): Promise<{ text: string }> {
  const action = args.trim().toLowerCase() || 'refresh'
  if (action === 'off') {
    await setFlag($, 'isOnCallOff', true)
    return { text: 'ON CALL panel off; no more PagerDuty lookups. "/bridge-crew on" brings it back.' }
  }
  if (action === 'on') await setFlag($, 'isOnCallOff', false)
  else if (action !== 'refresh') return { text: 'Use /bridge-crew to refresh, /bridge-crew off to hide the panel, or /bridge-crew on to show it.' }
  if (pd === null) return { text: 'The ON CALL panel needs PagerDuty schedule IDs: see "PagerDuty" in the bridge-theme README.' }
  if (flag('isOnCallOff')) return { text: 'The ON CALL panel is off. "/bridge-crew on" brings it back.' }

  // A command must answer within 10 seconds: give the lookups 7, without
  // retries, and if the server isn't connected yet leave them retrying.
  await Promise.race([Promise.all(PARTS.map(part => read($, pd, part, false))), $.clock.sleep(7_000)])
  const isConnecting = PARTS.some(part => {
    const r = readings[part]
    return r.status === 'failed' && isStillConnecting(r.message)
  })
  if (isConnecting) {
    for (const part of PARTS) void read($, pd, part)
    return {
      text: `The "${pd.server}" MCP server isn't connected in this session. If you added it after this session started, start a new session; otherwise it may still be connecting, and the panel will keep trying for four minutes.`,
    }
  }
  return { text: report() }
}

export function registerCrew(on: On, pd: PagerDutyConfig | null): void {
  on('command.run', { command: 'bridge-crew' }, ($, e) => bridgeCrew($, pd, e.args))
}
