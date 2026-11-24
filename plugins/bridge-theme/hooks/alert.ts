// Red alert: the console's pastel palette swapped for deep reds, and a slow
// red pulse over the backdrop.

export const RED: Readonly<Record<string, `#${string}`>> = {
  '#ff9900': '#ff2b1c', // tangerine -> alarm red
  '#ffcc99': '#ff8c7f', // peach -> pale red
  '#cc99cc': '#b3202a', // lilac -> crimson
  '#9999ff': '#e0564c', // periwinkle -> warm red
  '#cc6666': '#ff4f4f', // coral -> bright red
}

// The same drawing in red-alert colours.
export function redAlert(svg: string): string {
  return svg.replace(/#[0-9a-f]{6}/gi, hex => RED[hex.toLowerCase()] ?? hex)
}

// A full-window red wash that pulses, laid over the backdrop.
export const PULSE =
  '<style>@keyframes ra { 0%, 100% { opacity: 0; } 50% { opacity: 0.16; } } .ra { animation: ra 1.6s ease-in-out infinite; }</style>' +
  '<rect class="ra" width="100%" height="100%" fill="#ff0000"/>'

// The backdrop at red alert: recoloured, with the pulse on top.
export function redAlertScene(scene: string): string {
  const red = redAlert(scene)
  const end = red.lastIndexOf('</svg>')
  return `${red.slice(0, end)}${PULSE}${red.slice(end)}`
}
