# Bridge Theme

An original console look for the Claude desktop and mobile apps, in the spirit of early-90s optimistic sci-fi terminals.

- **Pitch black, 100% flat:** no glow, shadows, gradients or frosted glass. Accents are tangerine, peach, lilac, periwinkle and coral.
- **Your messages** are solid pastel blocks with black text, rounded on one side, cycling through four colours. **Claude's replies** sit on black inside a small lilac elbow (bar down the left, arm along the top). **Tool rows** are periwinkle blocks with black text. Headings are bold and tangerine.
- **Left frame:** a wide segmented console bar just right of the app's sidebar, labelled BRIDGE, SENSORS, OVERRIDE, STATUS, SYSTEMS, POWER, COMMS and AUX 07. It sweeps through a rounded elbow into a thin top arm that fades out, under an NCC-1701 header, and ends three-quarters of the way down on a square block.
- **Right column:** two short rails; a STARDATE block with today's UTC date and live clocks for Sydney, Bangalore, San Francisco and UTC (redrawn each minute); an ON CALL block with the primary and secondary on-call and open high-urgency incidents from PagerDuty; a SENSOR ARRAY dial that turns once a minute with a dot that beats each second; and a bracketed bar graph whose bars slowly rise and fall.
- **Stars:** a faint drifting star-field behind everything.
- **Console rail:** a thin, square-cornered tangerine rail that fades out to the right, in the band just above the message box. It stays in front of the chat while messages scroll behind it.
- **Font:** backdrop labels ask for Swiss 911 Ultra Compressed and fall back to DIN Condensed, which ships with macOS.
- Always dark. A light variant is built in: remove `overrideColorScheme: 'dark'` in `hooks/register.tsx`.

## PagerDuty on-call (optional)

The ON CALL block reads PagerDuty through **your own** PagerDuty MCP server, so no token or account detail lives in this plugin. On-call is checked every 15 minutes (overrides are already applied by PagerDuty), and open high-urgency incidents every 5.

Set it up in `~/.claude/settings.json` (use `bridge-theme@inline` instead of, or as well as, `bridge-theme` if you load the plugin from a folder):

```json
"pluginConfigs": {
  "bridge-theme": {
    "options": {
      "pagerdutyServer": "pagerduty",
      "primarySchedule": "P1ABCDE",
      "secondarySchedule": "P2FGHIJ",
      "incidentScope": "teams"
    }
  }
}
```

`pagerdutyServer` is the server's name as `claude mcp list` shows it; the schedule IDs are in each schedule's PagerDuty URL; `incidentScope` is `teams`, `all` or `assigned`. With no schedule IDs the block reads NOT CONFIGURED. It shows ACQUIRING while the PagerDuty server is still connecting at the start of a session, NOT CONNECTED if the server never connects in that session (for example, it was added after the session started), and NO SIGNAL if a lookup fails. Type `/oncall` to refresh it at once and see exactly what PagerDuty returned. Overrides can't be flagged as overrides for legacy (v2) schedules, because the PagerDuty MCP server lists overrides only for shift-based (v3) ones.

## Editing the backdrop

`hooks/scene.ts` is generated. Change sizes and colours in `scripts/gen-scene.cjs`, then run:

    node scripts/gen-scene.cjs hooks/scene.ts

## Third-party files

`hooks/make-colors.js` and `hooks/make-colors.d.ts` are copied unchanged from the theme kit that ships with Claude Code's plugin-authoring tools. They are not covered by this repository's MIT license.
