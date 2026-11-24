import type { EngineInterface, Register, ThemeMessageRule, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { RED, redAlert, redAlertScene } from './alert'
import { BAND, BAND_HEIGHT } from './band'
import { DEFAULT_CLOCKS, MAX_CLOCKS, formatClocks, moveClock, parseClocks, sceneAt, timeIn } from './clocks'
import type { Clock } from './clocks'
import { fetchEscalations, fetchOnCall, onCallSvg } from './pagerduty'
import type { PagerDutyConfig, PagerDutyState } from './pagerduty'
import { SCENE } from './scene'

// Bridge Theme: an early-90s optimistic console. Pitch black, flat pastel
// blocks, no glow; a pale warm day-watch variant kept for later.
const { theme, problems } = makeColors({
  label: 'Bridge Theme',
  roles: { accent: '#ff9900', danger: '#cc6666', success: '#99cc99', warning: '#ffcc99', pro: '#9999ff' },
  light: {
    roles: { accent: '#c4560a', pro: '#7a4fc4' },
    gray: {
      anchors: {
        'surface-0': '#ece6e2',
        'surface-1': '#f3eeea',
        'surface-2': '#faf7f4',
        'text-primary': '#140f0c',
        'text-secondary': '#3d332c',
        'text-muted': '#5c5048',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#000000',
        'surface-1': '#09080b',
        'surface-2': '#100e13',
        'surface-3': '#16131a',
        'text-primary': '#f6ede4',
        'text-secondary': '#d2c3b6',
        'text-muted': '#ab9b8e',
      },
    },
  },
})

// Red alert: the same console in deep reds on a faintly red-black ground.
const { theme: redTheme } = makeColors({
  label: 'Bridge Theme: Red Alert',
  roles: { accent: RED['#ff9900']!, danger: RED['#cc6666']!, success: '#99cc99', warning: RED['#ffcc99']!, pro: RED['#cc99cc']! },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0000',
        'surface-1': '#140304',
        'surface-2': '#1c0607',
        'surface-3': '#25090a',
        'text-primary': '#ffe8e4',
        'text-secondary': '#e6bdb7',
        'text-muted': '#bf8f88',
      },
    },
  },
})

type Palette = { o: `#${string}`; pe: `#${string}`; l: `#${string}`; pw: `#${string}` }
const PASTEL: Palette = { o: '#ff9900', pe: '#ffcc99', l: '#cc99cc', pw: '#9999ff' }
const ALARM: Palette = { o: RED['#ff9900']!, pe: RED['#ffcc99']!, l: RED['#cc99cc']!, pw: RED['#cc6666']! }

const baseOf = (colors: ThemeSetArgs['colors']): ThemeSetArgs => ({
  colors,
  backdrop: { scene: 'deep-bridge-stars', glass: false },
  overrideColorScheme: 'dark',
})

// Flat block with black words, rounded on one side only.
const block = (backgroundColor: `#${string}`): ThemeMessageRule => ({
  backgroundColor,
  color: '#000000',
  radius: [4, 22, 22, 4],
  padding: 12,
  paddingX: 18,
  shadow: 'none',
})

// Claude's reply: black, framed by a small elbow that sweeps from a bar down
// the left edge into an arm along the top.
const sideBar = (color: `#${string}`): ThemeMessageRule => ({
  backgroundColor: '#000000',
  shadow: 'none',
  paddingTop: 30,
  paddingBottom: 10,
  paddingLeft: 20,
  paddingRight: 14,
  fill: {
    vector: {
      viewBox: 72,
      slice: 30,
      paths: [
        { d: 'M0 0H72V72H0Z', color: '#000000' },
        // 4-point bar down the left, 16-point arm along the top,
        // big rounded outer corner, softer inner curve.
        { d: 'M0 20A20 20 0 0 1 20 0H72V16H16A12 12 0 0 0 4 28V72H0Z', color },
      ],
    },
  },
})

const lookOf = (colors: ThemeSetArgs['colors'], p: Palette): ThemeSetArgs => ({
  ...baseOf(colors),
  style: {
    Heading: { fontFamily: ['sans'], fontWeight: 'bold', letterSpacing: 2, color: p.o },
    UserMessage: [block(p.o), block(p.pe), block(p.pw), block(p.l)],
    AssistantMessage: sideBar(p.l),
    ToolUse: {
      fontFamily: ['code'],
      color: '#000000',
      backgroundColor: p.pw,
      radius: [14, 4, 4, 14],
      paddingX: 12,
      shadow: 'none',
    },
  },
})

const BASE = baseOf(theme)
const LOOK = lookOf(theme, PASTEL)
const RED_BASE = baseOf(redTheme)
const RED_LOOK = lookOf(redTheme, ALARM)

// Sets the console's look, falling back to colours alone if the styled look is refused.
async function applyLook($: EngineInterface, isRed: boolean): Promise<void> {
  let set
  try {
    set = await $.theme.set(isRed ? RED_LOOK : LOOK)
  } catch (error) {
    $.ui.log(String(error))
    set = await $.theme.set(isRed ? RED_BASE : BASE)
  }
  // Say why only while nothing draws the look; clear any older notice.
  $.ui.status(set.isDrawn ? undefined : set.reason)
}

// Red alert: on for this session only, with the klaxon when it goes on.
let isRedAlert = false

async function setRedAlert($: EngineInterface, value: boolean): Promise<void> {
  isRedAlert = value
  if (value) {
    void $.audio.play({ asset: 'sounds/klaxon.wav' }).catch(error => $.ui.log(`bridge-theme: klaxon: ${String(error)}`))
  }
  await applyLook($, value)
  $.ui.invalidate('ui.render')
}


// The latest PagerDuty readings; the backdrop draws from these.
let state: PagerDutyState | undefined

// Low power: every animation frozen. Kept in the mod's store between sessions.
let isLowPower = false

// ON CALL panel switched off with `/bridge-crew off`: hidden, and PagerDuty left alone.
let isOnCallOff = false

// The world clocks. Start from the `clocks` option; once edited in the Clocks
// pane, the edited list is kept in the store and wins.
let clocks: Clock[] = []
let clockNotice = '' // the pane's last word: a bad zone, or a full list
const CLOCKS_PANE = 'bridge-clocks'

async function setClocks($: EngineInterface, next: Clock[], notice = ''): Promise<void> {
  clocks = next
  clockNotice = notice
  await $.store.set('clocks', formatClocks(next))
  $.ui.invalidate('ui.render')
}

async function addClock($: EngineInterface, text: string): Promise<void> {
  const { clocks: found, problems } = parseClocks(text)
  if (found.length === 0) {
    clockNotice = problems[0] ?? 'Type a time zone such as Europe/London, or Label=Europe/London.'
    $.ui.invalidate('ui.render')
    return
  }
  const room = MAX_CLOCKS - clocks.length
  if (room <= 0) {
    clockNotice = `Only ${MAX_CLOCKS} clocks fit. Remove one first.`
    $.ui.invalidate('ui.render')
    return
  }
  await setClocks($, [...clocks, ...found.slice(0, room)], problems.join('; '))
}

async function openClocks($: EngineInterface): Promise<void> {
  clockNotice = ''
  await $.ui.open({ id: CLOCKS_PANE, title: 'Clocks', focus: true, closeOnEscape: true })
}

async function setLowPower($: EngineInterface, value: boolean): Promise<void> {
  isLowPower = value
  await $.store.set('isLowPower', value)
  $.ui.invalidate('ui.render')
}

// The PagerDuty server starts with the session and takes a few seconds to
// connect; until it does, a call finds no tool. That isn't a failure: stay on
// ACQUIRING and try again shortly.
const RETRY_EVERY = 15_000
const RETRIES = 16 // four minutes
const isStillConnecting = (error: unknown) => String(error).includes('no connected MCP tool')

async function readOnCall($: EngineInterface, pd: PagerDutyConfig, attempt = 0): Promise<void> {
  try {
    const found = await fetchOnCall((s, t, a) => $.mcp.call(s, t, a), pd, await $.clock.now())
    state = { ...state, ...found, onCallError: undefined }
  } catch (error) {
    if (isStillConnecting(error) && attempt < RETRIES) {
      $.clock.after(RETRY_EVERY, () => void readOnCall($, pd, attempt + 1))
      return
    }
    state = { ...state, onCallError: String(error).slice(0, 300) }
    $.ui.log(`bridge-theme: on-call lookup failed: ${state.onCallError}`)
  }
  $.ui.invalidate('ui.render')
}

async function readEscalations($: EngineInterface, pd: PagerDutyConfig, attempt = 0): Promise<void> {
  try {
    const escalations = await fetchEscalations((s, t, a) => $.mcp.call(s, t, a), pd)
    state = { ...state, escalations, escalationsError: undefined }
  } catch (error) {
    if (isStillConnecting(error) && attempt < RETRIES) {
      $.clock.after(RETRY_EVERY, () => void readEscalations($, pd, attempt + 1))
      return
    }
    state = { ...state, escalationsError: String(error).slice(0, 300) }
    $.ui.log(`bridge-theme: incident lookup failed: ${state.escalationsError}`)
  }
  $.ui.invalidate('ui.render')
}

const ON_CALL_EVERY = 15 * 60_000 // on-call changes rarely; overrides included
const ESCALATIONS_EVERY = 5 * 60_000

export const register: Register = (on, options) => {
  const str = (key: string, fallback = '') => {
    const v = options[key]
    return typeof v === 'string' && v.trim() ? v.trim() : fallback
  }
  const scope = str('incidentScope', 'teams')
  const pd: PagerDutyConfig = {
    server: str('pagerdutyServer', 'pagerduty'),
    primarySchedule: str('primarySchedule'),
    secondarySchedule: str('secondarySchedule'),
    incidentScope: scope === 'all' || scope === 'assigned' ? scope : 'teams',
  }
  const isConfigured = Boolean(pd.primarySchedule || pd.secondarySchedule)
  const fromOption = parseClocks(str('clocks', DEFAULT_CLOCKS))
  const clockProblems = fromOption.problems

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    await applyLook($, isRedAlert)
    if (clockProblems.length > 0) {
      $.ui.toast(`bridge-theme clocks: ${clockProblems.join('; ')}`)
    }
    isLowPower = (await $.store.get('isLowPower')) === true
    isOnCallOff = (await $.store.get('isOnCallOff')) === true
    const edited = await $.store.get('clocks')
    clocks = typeof edited === 'string' ? parseClocks(edited).clocks : fromOption.clocks

    // Redraw the backdrop on each new minute so the clocks stay current.
    const now = await $.clock.now()
    const toNextMinute = 60_000 - (now % 60_000) + 250
    $.clock.after(toNextMinute, () => {
      $.ui.invalidate('ui.render')
      $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    })

    // PagerDuty, through the user's own MCP server: on-call every 15 minutes,
    // open high-urgency incidents every 5, unless the panel is off.
    await $.command.register({ name: 'bridge-crew', description: 'Refresh the ON CALL panel; "/bridge-crew off" hides it and stops PagerDuty lookups, "/bridge-crew on" brings it back' })
    await $.command.register({ name: 'star-date', description: 'Add, remove and reorder the world clocks' })
    await $.command.register({ name: 'red-alert', description: 'Sound the klaxon and turn the console red; again to stand down' })
    await $.command.register({ name: 'lowpower', description: 'Switch the bridge backdrop between warp (animated) and impulse (frozen, low power)' })
    if (isConfigured) {
      if (!isOnCallOff) {
        void readOnCall($, pd)
        void readEscalations($, pd)
      }
      $.clock.every(ON_CALL_EVERY, () => void (isOnCallOff || readOnCall($, pd)))
      $.clock.every(ESCALATIONS_EVERY, () => void (isOnCallOff || readEscalations($, pd)))
    }

    return next(e)
  })

  on('command.run', { command: 'star-date' }, async $ => {
    await openClocks($)
    return { text: 'Clocks pane opened.' }
  })

  // The Clocks pane: each clock with buttons to move or remove it, a field to
  // add one, and a reset to the option's list.
  on('ui.render', { component: 'Pane', requestId: CLOCKS_PANE }, async ($, e) => {
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
        <Input
          key="add"
          label="Add"
          placeholder="Tokyo=Asia/Tokyo, or Asia/Tokyo"
          submitLabel="add"
          autoFocus
          onSubmit={value => addClock($, value)}
        />
        {clockNotice !== '' && <Text color="warning">{clockNotice}</Text>}
        <Box flexDirection="row" gap={2}>
          <Button key="reset" label="Reset to defaults" onPress={() => setClocks($, fromOption.clocks)} />
          <Button key="done" variant="primary" label="Done" onPress={() => $.ui.close({ id: CLOCKS_PANE })} />
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'red-alert' }, async $ => {
    // Silent, like the rail's button: the console turning red says it all.
    await setRedAlert($, !isRedAlert)
    return {}
  })

  on('command.run', { command: 'lowpower' }, async $ => {
    await setLowPower($, !isLowPower)
    return { text: isLowPower ? 'Impulse power: backdrop animations frozen.' : 'Warp power: backdrop animations running.' }
  })

  // /bridge-crew: refresh now and say what came back (or why it failed).
  // /bridge-crew off | on: hide the panel and stop lookups, or bring it back.
  on('command.run', { command: 'bridge-crew' }, async ($, e) => {
    const NOT_SET = 'The ON CALL panel needs PagerDuty schedule IDs: see "PagerDuty" in the bridge-theme README.'
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') {
      isOnCallOff = true
      await $.store.set('isOnCallOff', true)
      $.ui.invalidate('ui.render')
      return { text: 'ON CALL panel off; no more PagerDuty lookups. "/bridge-crew on" brings it back.' }
    }
    if (arg === 'on') {
      isOnCallOff = false
      await $.store.set('isOnCallOff', false)
      $.ui.invalidate('ui.render')
      if (!isConfigured) return { text: NOT_SET }
    } else if (arg !== '') {
      return { text: 'Use /bridge-crew to refresh, /bridge-crew off to hide the panel, or /bridge-crew on to show it.' }
    }
    if (!isConfigured) return { text: NOT_SET }
    if (isOnCallOff) return { text: 'The ON CALL panel is off. "/bridge-crew on" brings it back.' }
    // A command must answer within 10 seconds: give the lookups 7, and if the
    // server isn't connected yet, leave the panel retrying in the background.
    await Promise.race([Promise.all([readOnCall($, pd, RETRIES), readEscalations($, pd, RETRIES)]), $.clock.sleep(7_000)])
    if (isStillConnecting(state?.onCallError) || isStillConnecting(state?.escalationsError)) {
      void readOnCall($, pd)
      void readEscalations($, pd)
      return {
        text: `The "${pd.server}" MCP server isn't connected in this session. If you added it after this session started, start a new session; otherwise it may still be connecting, and the panel will keep trying for four minutes.`,
      }
    }
    const who = (label: string, o?: { name: string; until: string }) => `${label}: ${o ? `${o.name} until ${o.until} UTC` : 'none found'}`
    const lines = [
      state?.onCallError ? `On-call lookup failed: ${state.onCallError}` : `${who('Primary', state?.primary)}; ${who('Secondary', state?.secondary)}`,
      state?.escalationsError ? `Escalations lookup failed: ${state.escalationsError}` : `Open high-urgency escalations: ${state?.escalations?.length ?? 0}`,
    ]
    return { text: lines.join('\n') }
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.hasSurvey) {
      return next(e)
    }
    // A console rail fixed above the message box, with the power toggle at its end.
    const { Box, Button, Svg, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="center">
        <Box flexGrow={1}>
          <Svg source={isRedAlert ? redAlert(BAND) : BAND} alt="A console rail fading out to the right" height={BAND_HEIGHT} />
        </Box>
        <Button key="red-alert" plain dimColor={!isRedAlert} onPress={() => setRedAlert($, !isRedAlert)}>
          {isRedAlert ? '▲ STAND DOWN' : '▲ RED ALERT'}
        </Button>
        <Text> </Text>
        <Button key="power" plain dimColor={!isLowPower} onPress={() => setLowPower($, !isLowPower)}>
          {isLowPower ? '◐ IMPULSE' : '● WARP'}
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const scene = sceneAt(SCENE, await $.clock.now(), {
      clocks,
      onCall: isConfigured && !isOnCallOff ? onCallSvg(state) : undefined,
      isLowPower,
    })
    const source = isRedAlert ? redAlertScene(scene) : scene
    return <Svg source={source} alt="Pitch-black console with flat pastel rails, world clocks, on-call status and a minute dial" isInteractive />
  })
}
