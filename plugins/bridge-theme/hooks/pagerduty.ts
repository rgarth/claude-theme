// The ON CALL block: who is primary and secondary on call, and open
// high-urgency incidents, read through the user's own PagerDuty MCP server.
//
// Nothing account-specific lives here: the server name and schedule IDs come
// from the mod's options (settings.json `pluginConfigs`), and the token stays
// in the MCP server's own config.

export type OnCall = { name: string; until: string }
export type Escalation = { number: number; service: string; isAcknowledged: boolean }
export type PagerDutyState = {
  primary?: OnCall
  secondary?: OnCall
  escalations?: Escalation[]
  onCallError?: string
  escalationsError?: string
}

export type PagerDutyConfig = {
  server: string
  primarySchedule: string
  secondarySchedule: string
  incidentScope: 'teams' | 'all' | 'assigned'
}

// What an MCP tool call returns: content blocks, the first holding JSON text.
type McpResult = { content?: readonly { type: string; text?: string }[]; isError?: boolean }
type Call = (server: string, tool: string, args: Record<string, unknown>) => Promise<McpResult>

function responseOf(result: McpResult): unknown[] {
  const text = result.content?.find(c => c.type === 'text')?.text ?? ''
  if (result.isError) throw new Error(text.slice(0, 200) || 'the tool reported an error')
  let json: { response?: unknown }
  try {
    json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { response?: unknown }
  } catch {
    const kinds = (result.content ?? []).map(c => c.type).join(',') || 'none'
    throw new Error(`unexpected reply (content: ${kinds}): ${text.slice(0, 160)}`)
  }
  return Array.isArray(json.response) ? json.response : []
}

// "Ada Lovelace" -> "ADA L."; keeps the panel narrow.
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  const first = (parts[0] ?? '').toUpperCase()
  const last = parts.length > 1 ? ` ${(parts[parts.length - 1] ?? '').charAt(0).toUpperCase()}.` : ''
  return first + last
}

const hhmm = (iso: string) => {
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? '' : `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

type OnCallEntry = { schedule?: { id?: string }; user?: { summary?: string }; start?: string; end?: string }

// Who is on call now for each schedule. PagerDuty's on-call list already has
// any overrides applied, so this is whoever is really carrying the pager.
export async function fetchOnCall(call: Call, cfg: PagerDutyConfig, now: number): Promise<Pick<PagerDutyState, 'primary' | 'secondary'>> {
  const ids = [cfg.primarySchedule, cfg.secondarySchedule].filter(Boolean)
  const entries = responseOf(
    await call(cfg.server, 'browse_schedules', { request: { action: 'list_oncalls', schedule_ids: ids, limit: 20 } }),
  ) as OnCallEntry[]
  const current = (id: string): OnCall | undefined => {
    const e = entries.find(
      x => x.schedule?.id === id && Date.parse(x.start ?? '') <= now && now < Date.parse(x.end ?? '') + 1,
    ) ?? entries.find(x => x.schedule?.id === id)
    return e?.user?.summary ? { name: shortName(e.user.summary), until: hhmm(e.end ?? '') } : undefined
  }
  return { primary: current(cfg.primarySchedule), secondary: current(cfg.secondarySchedule) }
}

type IncidentEntry = { incident_number?: number; status?: string; service?: { summary?: string }; title?: string }

// Open (triggered or acknowledged) high-urgency incidents, newest first.
export async function fetchEscalations(call: Call, cfg: PagerDutyConfig): Promise<Escalation[]> {
  const incidents = responseOf(
    await call(cfg.server, 'browse_incidents', {
      request: { action: 'list', statuses: ['triggered', 'acknowledged'], urgencies: ['high'], request_scope: cfg.incidentScope, limit: 20 },
    }),
  ) as IncidentEntry[]
  return incidents.map(i => ({
    number: i.incident_number ?? 0,
    service: (i.service?.summary ?? i.title ?? 'UNKNOWN').toUpperCase(),
    isAcknowledged: i.status === 'acknowledged',
  }))
}

// NOT CONNECTED when the MCP server never came up in this session; NO SIGNAL for other failures.
const problem = (error: string) => (error.includes('no connected MCP tool') ? 'NOT CONNECTED' : 'NO SIGNAL')
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// The SVG under the ON CALL heading, right-aligned to the column (x = -14),
// labels on the left (x = -196).
export function onCallSvg(state: PagerDutyState | undefined, isConfigured: boolean): string {
  if (!isConfigured) {
    return '<text class="clear" x="-14" y="30">NOT CONFIGURED</text>'
  }
  let out = ''
  const row = (label: string, who: OnCall | undefined, y: number) => {
    out += `<text class="city" x="-196" y="${y}">${label}</text>`
    const name = who ? escape(cut(who.name, 14)) : state?.onCallError ? problem(state.onCallError) : state ? '—' : 'ACQUIRING'
    out += `<text class="who" x="-14" y="${y}">${name}</text>`
    if (who?.until) out += `<text class="until" x="-14" y="${y + 16}">UNTIL ${who.until} UTC</text>`
  }
  row('PRIMARY', state?.primary, 30)
  row('SECONDARY', state?.secondary, 76)

  const list = state?.escalations
  out += `<text class="sub" x="-14" y="126" text-anchor="end">ESCALATIONS${list?.length ? ` ${list.length}` : ''}</text>`
  if (!list) {
    out += `<text class="clear" x="-14" y="150">${state?.escalationsError ? problem(state.escalationsError) : 'ACQUIRING'}</text>`
  } else if (list.length === 0) {
    out += '<text class="clear" x="-14" y="150">ALL CLEAR</text>'
  } else {
    const shown = list.length > 3 ? list.slice(0, 2) : list
    shown.forEach((e, i) => {
      const cls = e.isAcknowledged ? 'esc esc-ack' : 'esc esc-new'
      out += `<text class="${cls}" x="-196" y="${150 + i * 20}">#${e.number}  ${escape(cut(e.service, 15))}</text>`
    })
    if (list.length > 3) out += `<text class="clear" x="-14" y="190">+${list.length - 2} MORE</text>`
  }
  return out
}
