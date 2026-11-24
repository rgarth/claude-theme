// The console's two looks for the chat: the everyday pastel one and red alert.
// Colours come from the generated palettes, shared with the backdrop.

import type { EngineInterface, ThemeMessageRule, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { PALETTES } from './scene'

type Palette = (typeof PALETTES)[keyof typeof PALETTES]

const pastel = makeColors({
  label: 'Bridge Theme',
  roles: { accent: PALETTES.pastel.o, danger: PALETTES.pastel.co, success: '#99cc99', warning: PALETTES.pastel.pe, pro: PALETTES.pastel.pw },
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
const red = makeColors({
  label: 'Bridge Theme: Red Alert',
  roles: { accent: PALETTES.red.o, danger: PALETTES.red.co, success: '#99cc99', warning: PALETTES.red.pe, pro: PALETTES.red.l },
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

// What makeColors warns when the desktop app can't paint the palette, if it does.
export const unpaintedWarning = pastel.problems.find(line => line.startsWith("Desktop won't paint"))

// Flat block with black words, rounded on one side only.
const block = (backgroundColor: `#${string}`): ThemeMessageRule => ({
  backgroundColor,
  color: '#000000',
  radius: [4, 22, 22, 4],
  padding: 12,
  paddingX: 18,
  shadow: 'none',
})

// Claude's reply: black, framed by a small elbow that sweeps from a 4-point bar
// down the left edge into a 16-point arm along the top.
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
        { d: 'M0 20A20 20 0 0 1 20 0H72V16H16A12 12 0 0 0 4 28V72H0Z', color },
      ],
    },
  },
})

const colorsOnly = (colors: ThemeSetArgs['colors']): ThemeSetArgs => ({
  colors,
  backdrop: { scene: 'deep-bridge-stars', glass: false },
  overrideColorScheme: 'dark',
})

const styled = (colors: ThemeSetArgs['colors'], p: Palette): ThemeSetArgs => ({
  ...colorsOnly(colors),
  style: {
    Heading: { fontFamily: ['sans'], fontWeight: 'bold', letterSpacing: 2, color: p.o },
    UserMessage: [block(p.o), block(p.pe), block(p.pw), block(p.l)],
    AssistantMessage: sideBar(p.l),
    ToolUse: { fontFamily: ['code'], color: '#000000', backgroundColor: p.pw, radius: [14, 4, 4, 14], paddingX: 12, shadow: 'none' },
  },
})

const LOOKS = {
  pastel: { styled: styled(pastel.theme, PALETTES.pastel), plain: colorsOnly(pastel.theme) },
  red: { styled: styled(red.theme, PALETTES.red), plain: colorsOnly(red.theme) },
}

// Sets the chat's look, falling back to colours alone if the styled look is refused.
export async function applyLook($: EngineInterface, isRed: boolean): Promise<void> {
  const look = isRed ? LOOKS.red : LOOKS.pastel
  let set
  try {
    set = await $.theme.set(look.styled)
  } catch (error) {
    $.ui.log(String(error))
    set = await $.theme.set(look.plain)
  }
  // Say why only while nothing draws the look; clear any older notice.
  $.ui.status(set.isDrawn ? undefined : set.reason)
}
