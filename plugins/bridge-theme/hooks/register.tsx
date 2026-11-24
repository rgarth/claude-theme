// Bridge Theme: a sci-fi starship console for the Claude desktop and mobile
// apps. This file wires the features together; each lives in its own module:
//   looks.ts        the chat's pastel and red-alert looks
//   backdrop.ts     the console drawing behind the chat (generated scene.ts)
//   band.ts         the rail above the message box
//   alert.ts        red alert
//   flags.ts        low power and the on-call switch, kept between sessions
//   clocks-pane.tsx the world clocks and /star-date
//   crew.ts         the PagerDuty ON CALL block and /bridge-crew

import type { Register } from 'claude-code'

import { RED_ALERT_COMMAND, isRedAlert, registerRedAlert, setRedAlert } from './alert'
import { backdropAt } from './backdrop'
import { BAND_HEIGHT, band } from './band'
import { DEFAULT_CLOCKS, parseClocks } from './clocks'
import { STAR_DATE_COMMAND, currentClocks, loadClocks, registerClocksPane } from './clocks-pane'
import { CREW_COMMAND, crewConfig, onCallPanel, registerCrew, startCrew } from './crew'
import { flag, loadFlags, setFlag } from './flags'
import { applyLook, unpaintedWarning } from './looks'
import { PALETTES } from './scene'

const LOW_POWER_COMMAND = { name: 'lowpower', description: 'Switch the bridge backdrop between warp (animated) and impulse (frozen, low power)' }

// Each feature's slash command, defined beside its handler in the feature's
// own module. Handlers match on the name written out, so `claude plugin
// validate` can see them; commands.test.ts checks every listed command answers.
export const COMMANDS = [RED_ALERT_COMMAND, LOW_POWER_COMMAND, STAR_DATE_COMMAND, CREW_COMMAND]

export const register: Register = (on, options) => {
  const option = (key: string, fallback = '') => {
    const v = options[key]
    return typeof v === 'string' && v.trim() ? v.trim() : fallback
  }
  const pd = crewConfig(option)
  const defaultClocks = parseClocks(option('clocks', DEFAULT_CLOCKS))

  on('session.start', async ($, e, next) => {
    // What the person chose last time, before anything is drawn.
    await Promise.all([loadFlags($), loadClocks($, defaultClocks.clocks)])
    await applyLook($, false) // red alert lasts one session, so a session starts pastel
    if (unpaintedWarning !== undefined) $.ui.toast(unpaintedWarning)
    if (defaultClocks.problems.length > 0) $.ui.toast(`bridge-theme clocks: ${defaultClocks.problems.join('; ')}`)

    // Redraw the backdrop on each new minute so the clocks stay current.
    const now = await $.clock.now()
    $.clock.after(60_000 - (now % 60_000) + 250, () => {
      $.ui.invalidate('ui.render')
      $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    })

    await Promise.all(COMMANDS.map(command => $.command.register(command)))
    if (pd !== null) startCrew($, pd)
    return next(e)
  })

  registerRedAlert(on)
  registerClocksPane(on, defaultClocks.clocks)
  registerCrew(on, pd)

  on('command.run', { command: 'lowpower' }, async $ => {
    const isLowPower = !flag('isLowPower')
    await setFlag($, 'isLowPower', isLowPower)
    return { text: isLowPower ? 'Impulse power: backdrop animations frozen.' : 'Warp power: backdrop animations running.' }
  })

  // The rail above the message box, with the red alert and power toggles at its end.
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.hasSurvey) return next(e)
    const { Box, Button, Svg, Text } = $.ui.resolve(e)
    const isRed = isRedAlert()
    const isLowPower = flag('isLowPower')
    return (
      <Box flexDirection="row" alignItems="center">
        <Box flexGrow={1}>
          <Svg source={band((isRed ? PALETTES.red : PALETTES.pastel).o)} alt="A console rail fading out to the right" height={BAND_HEIGHT} />
        </Box>
        <Button key="red-alert" plain dimColor={!isRed} onPress={() => setRedAlert($, !isRed)}>
          {isRed ? '▲ STAND DOWN' : '▲ RED ALERT'}
        </Button>
        <Text> </Text>
        <Button key="power" plain dimColor={!isLowPower} onPress={() => setFlag($, 'isLowPower', !isLowPower)}>
          {isLowPower ? '◐ IMPULSE' : '● WARP'}
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    const source = backdropAt(await $.clock.now(), {
      clocks: currentClocks(),
      onCall: onCallPanel(pd),
      isLowPower: flag('isLowPower'),
      isRedAlert: isRedAlert(),
    })
    return <Svg source={source} alt="Pitch-black console with flat pastel rails, world clocks, on-call status and a minute dial" isInteractive />
  })
}
