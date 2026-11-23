import type { Register, ThemeMessageRule, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { BAND, BAND_HEIGHT } from './band'
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

const BASE: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'deep-bridge-stars', glass: false },
  overrideColorScheme: 'dark',
}

// Flat pastel block with black words, rounded on one side only.
const block = (backgroundColor: `#${string}`): ThemeMessageRule => ({
  backgroundColor,
  color: '#000000',
  radius: [4, 22, 22, 4],
  padding: 12,
  paddingX: 18,
  shadow: 'none',
})

// Claude's reply: black, framed by a small lilac elbow that sweeps from a
// bar down the left edge into an arm along the top.
const sideBar: ThemeMessageRule = {
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
        { d: 'M0 20A20 20 0 0 1 20 0H72V16H16A12 12 0 0 0 4 28V72H0Z', color: '#cc99cc' },
      ],
    },
  },
}

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    Heading: { fontFamily: ['sans'], fontWeight: 'bold', letterSpacing: 2, color: '#ff9900' },
    UserMessage: [block('#ff9900'), block('#ffcc99'), block('#9999ff'), block('#cc99cc')],
    AssistantMessage: sideBar,
    ToolUse: {
      fontFamily: ['code'],
      color: '#000000',
      backgroundColor: '#9999ff',
      radius: [14, 4, 4, 14],
      paddingX: 12,
      shadow: 'none',
    },
  },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    let set
    try {
      set = await $.theme.set(LOOK)
    } catch (error) {
      $.ui.log(String(error))
      set = await $.theme.set(BASE)
    }
    // Say why only while nothing draws the look; clear any older notice.
    $.ui.status(set.isDrawn ? undefined : set.reason)

    return next(e)
  })

  // A console rail fixed above the message box, in front of the chat.
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.hasSurvey) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={BAND} alt="A solid orange console rail" height={BAND_HEIGHT} isInteractive />
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="Pitch-black console with flat pastel rails, scrolling telemetry and a slow schematic" isInteractive />
  })
}
