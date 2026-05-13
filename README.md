# Claude Chat Exporter

<img src="icons/icon-128.png" alt="Claude Chat Exporter icon" width="96" align="right">

A minimal Firefox extension that adds a button to [Claude.ai](https://claude.ai) for exporting the current conversation to a plain-text `.txt` file.

> ⚠️ This is an unofficial third-party extension. Not affiliated with, endorsed by, or sponsored by Anthropic. "Claude" is a trademark of Anthropic PBC.

## Screenshots

The "导出 .txt" button is injected into the top-right of any Claude.ai conversation page:

![Export button location](screenshots/button.png)

Clicking it downloads a plain-text `.txt` file with speaker-labelled sections:

![Exported .txt output](screenshots/output.png)

## Features

- **One-click export** — A floating button on Claude.ai turns the open conversation into a downloaded `.txt`.
- **Plain text output** — Paste into any editor, chat, note app, or email. No Markdown, no HTML.
- **Speaker separation** — Each turn is wrapped in a Unicode box labeled `USER` or `ASSISTANT`, easy to scan.
- **Code preserved** — Fenced code blocks are kept with 4-space indentation for monospace readability.
- **No data collection** — Everything happens in your browser. Nothing is uploaded.
- **Tiny footprint** — A single ~210-line content script, no background page, no remote dependencies.

## Sample output

```
═════════════════════════════════════════════════════════
  CLAUDE 对话导出
  Why nutrition labels can say "0 sugar" with sugar in
  the ingredients list
  导出时间 · 2026-05-11 14:22
═════════════════════════════════════════════════════════


┌─ USER ────────────────────────────────────────────────

  Why does the ingredients list have sugar but the
  nutrition label shows 0?

└──────────────────────────────────────────────────────


┌─ ASSISTANT ───────────────────────────────────────────

  Not contradictory — this is a regulated "zero
  threshold" rule. GB 28050 (China) allows labelling
  sugar as 0 g when actual content is below 0.5 g/100 mL...

└──────────────────────────────────────────────────────
```

## Install

### Temporary (for testing)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on**.
3. Pick a built `.xpi` (see [Building from source](#building-from-source) below).
4. Open any Claude.ai conversation. Click the orange **导出 .txt** button (top-right).

Temporary add-ons are removed when Firefox restarts.

### Permanent

Submission to [addons.mozilla.org](https://addons.mozilla.org) is planned. Until the listed release is approved, you can either:

- Self-host an [unlisted AMO signature](https://extensionworkshop.com/documentation/publish/distribute-sideloading/) for personal use, or
- Use Firefox Developer Edition / Nightly with `xpinstall.signatures.required` set to `false` in `about:config`.

## Building from source

```sh
cd ClaudeChatExporter
zip -j dist/ClaudeChatExporter.xpi manifest.json content.js
```

No build tools, no dependencies. The `.xpi` is just a zip with `manifest.json` and `content.js` at the root.

## Compatibility

| Browser | Status |
|---|---|
| Firefox 115+ | Tested |
| Chrome | Untested — likely works (same MV3 manifest; Chrome ignores the `browser_specific_settings.gecko` block) |

## Limitations (v0.3)

Only the **conversation text** is exported. The following are skipped, intentionally, in this version:

- Tool calls
- Extended-thinking traces
- Artifacts (canvas, web previews)
- Message timestamps and model metadata

Each may become an opt-in toggle in a future release.

The selectors rely on Claude.ai's current DOM structure. If Claude redesigns the UI, the extension may break — see [Diagnostics](#diagnostics) below.

## Diagnostics

If the export button finds no messages, open DevTools (F12) → Console and run:

```js
cceDebug()
```

It prints selector hit counts and a reference to the first matched node. If both counts are 0 on a real conversation page, the DOM contract has changed — please [open an issue](https://github.com/vanawaker/claude-chat-exporter/issues) with the console output.

## License

[MIT](LICENSE) © vanawaker
