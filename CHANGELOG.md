# Changelog

All notable changes to `eva-inspired-theme` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] — 2026-10-25

### Fixed

- **`README.zh.md` was never published.** It is referenced from `README.md`'s language
  switch and from `README.zh.md`'s own header, but it was missing from `files` in
  `package.json`, so every tarball pointed the Chinese link at a path that did not exist.
  Added; the package now ships both editions.

No runtime change: `client.js`, `src/`, `build/` and the patch are untouched
(16/16 tests, 125/125 selfcheck assertions, build in sync).

## [1.2.0] — 2026-10-25

### Removed

- **The channel-entry buttons on the 「工作区」 row**, and everything that only existed to
  serve them. They now live in their own plugin,
  [`dsh-im-workspace-buttons`](https://github.com/WhatCannotBeSaid/dsh-im-workspace-buttons),
  so the behaviour survives on its own and stops depending on a theme being installed.

  Gone from this package:

  | File | What left |
  | --- | --- |
  | `src/runtime/im.js` | The whole module (842 lines): the twelve-channel table, the twelve inline SVG marks, the account gate, the row filter, the unfold pump |
  | `src/client.js` | The Round 64 comment block and the `'evangelion: im channel filters'` effect (`ctx.effect()` count 11 → 10) |
  | `src/theme.css` | The 84-line `data-eva-im-*` block: the four entry rules and the one filtering rule |
  | `tools/build-contract.mjs` | `src/runtime/im.js` out of `CLIENT_FILES` |
  | `tools/selfcheck.mjs` | `css.12` and `cli.26` (their contracts went with the code), the label assertion in `cli.11d`, and its effect count 11 → 10 |
  | `tools/runtime.test.mjs` | `statusHarness` and the S3/S7 cases built on it; `'im'` out of the vendored-module list |
  | `README.md` / `README.zh.md` | The channel-filters bullet and the `还包含` table row cell |

### Notes

- **Nothing else changed.** Every other visual and behavioural feature of the theme is
  byte-identical to 1.1.0; the gates agree — `npm test` 16/16, `npm run selfcheck`
  125/125, `npm run verify` all green, `build-client --check` in sync.
- **`docs/design.md` and `docs/render-report.md` keep their history.** They are append-only
  round logs, so their existing `data-eva-im-*` entries stay as written — that is the record
  of what those rounds did, not a description of the current tree.
- **Installing both.** If you ran the theme before 1.2.0 and want the buttons back, install
  the plugin; the two packages do not collide (different attribute names, different locale
  namespace, each removes its own `<style>` on unload). Nothing needs to be configured in
  the theme.

## [1.1.0] — 2026-10-24

### Added

- Channel-entry buttons on the 「工作区」 row: one per channel `@xmanrui/dsh-im` ships
  (twelve), each asking its own `connection.status` route and staying in the row only while
  that channel has an account. One view lit at a time; a view tags the rows it keeps and
  stores nothing.
- Adaptation to DSH `0.2.1-rc.3`.

### Changed

- The 微信 workspace switch (`data-eva-wx-*`) retired in favour of the channel entries.

## [1.0.0]

- First public release: Title Card (light) and Central Dogma (dark) modes over one removable
  override layer, the wallpaper paint layer, the workspace pin control, the vendored
  plugin toggle and session status rail, the boot mask, centred composer panels.
