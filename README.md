# claude-theme

Themes for Claude Code, packaged as plugins.

## bridge-theme

An original console look in the spirit of early-90s optimistic sci-fi terminals, for the Claude desktop and mobile apps:

- Pitch-black background, completely flat: no glow, gradients or frosted glass.
- Tangerine, peach, lilac, periwinkle and coral accents.
- A segmented console frame down the left of the window, with rounded elbows into thin top and bottom arms.
- A drifting star-field, scrolling telemetry numbers, a pastel bar chart and a slowly turning schematic dial.
- Your messages as solid pastel blocks; Claude's replies framed by a small lilac elbow; a solid tangerine rail fixed above the message box.

It is always dark and draws nothing in the terminal or editors, which don't draw themes. The left frame is placed to sit just right of the desktop app's sidebar when the sidebar is open.

See [plugins/bridge-theme/README.md](plugins/bridge-theme/README.md) for details and how to edit the backdrop.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install bridge-theme --marketplace rgarth/claude-theme
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

Or from a shell:

```
claude plugin install bridge-theme --marketplace rgarth/claude-theme
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `rgarth/claude-theme`, then **Add plugin**.

## License

[MIT](LICENSE)

The MIT license covers this repository's own code. `make-colors.js` and `make-colors.d.ts` in `plugins/bridge-theme/hooks/` come from Claude Code's plugin-authoring kit.
