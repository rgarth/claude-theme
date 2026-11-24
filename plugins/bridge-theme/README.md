# Bridge Theme

A sci-fi starship console theme for the Claude desktop and mobile apps. It's always dark, and the terminal and editors aren't themed.

## Commands

- **`/lowpower`**, or the **WARP / IMPULSE** button above the message box, freezes the backdrop animations to save CPU. The clocks keep updating. The setting is remembered.
- **`/bridge-crew`** refreshes the PagerDuty panel. **`/bridge-crew off`** hides it and stops all PagerDuty lookups; **`/bridge-crew on`** brings it back.

## PagerDuty panel

The right-hand column can show the primary and secondary on-call and any open high-urgency incidents. It reads them through **your own PagerDuty MCP server**, so no token lives in this plugin.

It's off until you give it schedule IDs. If you don't use PagerDuty, do nothing: the panel stays hidden and nothing is called.

To turn it on, add the PagerDuty MCP server to Claude Code, then add this to `~/.claude/settings.json`:

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

- **`pagerdutyServer`** is the MCP server's name, as `claude mcp list` shows it.
- **`primarySchedule` and `secondarySchedule`** are the schedule IDs, which are in each schedule's PagerDuty URL.
- **`incidentScope`** is `teams`, `all` or `assigned`.

If you load the plugin from a folder, the key is `bridge-theme@inline`. On-call is checked every 15 minutes and incidents every 5.

## Editing the backdrop

`hooks/scene.ts` is generated. Edit `scripts/gen-scene.cjs`, then run `node scripts/gen-scene.cjs hooks/scene.ts`.

## License

MIT. `hooks/make-colors.js` and `hooks/make-colors.d.ts` are copied from Claude Code's plugin-authoring kit and aren't covered by it.
