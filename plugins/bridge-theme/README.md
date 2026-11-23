# Bridge Theme

An original console look for the Claude desktop and mobile apps, in the spirit of early-90s optimistic sci-fi terminals.

- **Pitch black, 100% flat:** no glow, shadows, gradients or frosted glass. Accents are tangerine, peach, lilac, periwinkle and coral.
- **Your messages** are solid pastel blocks with black text, rounded on one side, cycling through four colours. **Claude's replies** sit on black inside a small lilac elbow (bar down the left, arm along the top). **Tool rows** are periwinkle blocks with black text. Headings are bold and tangerine.
- **Backdrop:** faint drifting stars; a full-height segmented console frame down the left edge, with rounded elbows into thick top and bottom arms, and flat rails on the right; slowly scrolling telemetry numbers; a pastel bar chart; and a rotating schematic dial.
- **Console rail:** a solid tangerine rail in the band just above the message box, fixed in front of the chat while messages scroll behind it.
- Always dark. A light variant is built in: remove `overrideColorScheme: 'dark'` in `hooks/register.tsx`.

## Editing the backdrop

`hooks/scene.ts` is generated. Change sizes and colours in `scripts/gen-scene.cjs`, then run:

    node scripts/gen-scene.cjs hooks/scene.ts

## Third-party files

`hooks/make-colors.js` and `hooks/make-colors.d.ts` are copied unchanged from the theme kit that ships with Claude Code's plugin-authoring tools. They are not covered by this repository's MIT license.
