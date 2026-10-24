# EVA-Inspired-Theme

[![Licence: MIT + CC BY-NC-SA 4.0](https://img.shields.io/badge/licence-MIT%20%2B%20CC--BY--NC--SA%204.0-yellow.svg)](#licence)
[![Unofficial fan work](https://img.shields.io/badge/project-unofficial_fan_work-blue.svg)](#fan-work-and-attribution)

English | [中文](README.zh.md)

A Neon Genesis Evangelion–inspired skin for **DeepSeek Harness**. Two fully
designed modes over one removable override layer, a wallpaper paint layer whose
alphas are solved against a contrast budget rather than picked by eye, and a boot
mask.

This repository ships **no background picture of its own**: the paint layer is
here, the artwork is not. Instead the tracked wallpaper manifest names two
third-party pictures by URL, so a clone draws a background the browser fetches
from those hosts at paint time. The only pictures in git are the brand marks and
the two preview screenshots, which naturally show the art the app was painting;
the theme's look is otherwise unchanged — the alphas, the boot mask, the brand
mark and the fonts all come from this repository.

**Unofficial fan work.** Not affiliated with, endorsed by, or licensed by
khara, inc., Hypergryph, or DeepSeek. See
[Fan work and attribution](#fan-work-and-attribution).

## Preview

Both modes, captured from a running DeepSeek Harness with this package mounted.
The session list is hidden in both shots; nothing else is retouched.

**Title Card — light**

![Title Card, the light mode](docs/preview-light.jpg)

**Central Dogma — dark**

![Central Dogma, the dark mode](docs/preview-dark.jpg)

The backgrounds are the theme's two third-party pictures — what a clone fetches
at paint time. The light shot was taken before the light default moved to its
page on haowallpaper.com (D83), so that one shows an earlier, lower-resolution
upload of the same artwork; the dark shot is the picture the manifest still
names. Credits are in [Fan work and attribution](#fan-work-and-attribution).

## What it is

| | |
|---|---|
| Modes | **Title Card** (light) and **Central Dogma** (dark) |
| Token layer | 55 measured overrides (41 in the light arm, 14 in the dark arm) on a single removable layer |
| Wallpaper layer | No artwork ships in this repository; the browser fetches it at paint time. The tracked manifest points at two third-party pictures — the light default on haowallpaper.com, the dark one on wallhaven — and the maintainer's own machine embeds local copies instead. Surface alphas are solved against a WCAG contrast budget |
| Boot mask | Plays once per DSH launch — the mark lives in sessionStorage, so a reload inside one run does not replay it and quitting DSH does; `?boot=0` skips one, `?boot=1` forces one. Timings and look unchanged |
| Brand mark | One monochrome SVG illustration, drawn at 28×28 inside the 36×36 slot beside the wordmark |
| Composer row | The model and effort triggers carry no chevrons; on a narrow row both become 28×28 icon buttons level with the add and dictation buttons, and the whole row shares one seam (6px wide, 3px narrow) |
| Also inside | A plugin on/off switch and a session-row status rail, both vendored from MIT plugins; a pin button on every workspace and session row; a switch for the WeChat workspace on the workspace row, shown only while WeChat holds an account |
| Language | All user-facing text goes through the official locale service (zh / en) |

The theme installs one layer and can be removed as one. It ships **no settings panel
of its own** — the look is fixed, not a preference — and the only thing it persists
is the workspace pin set. It does hide and move a few official entries, so read
[What it changes in the interface](#what-it-changes-in-the-interface) before you
install it.

## What it changes in the interface

Removing the package takes the layer away again and every official element comes
back. In between, the theme **hides six official entries, rewrites the sidebar
identity line, replaces one page's heading, and reshapes the composer's control
row**. All of it is CSS plus a few client effects — the official DOM is never
rewritten — but here is where things went.

### The brand row is three click zones

The sidebar brand row reads **[illustration] WHALE-01 [SYSTEM]**; the official
wordmark and its whale glyph are hidden. It is one official button carrying three
zones, decided from the click's x coordinate at click time:

| Click | Opens | Because |
|---|---|---|
| the illustration, left of `WHALE-01` | **Plugins** | the 「插件」/ “Plugins” nav row is hidden |
| the `WHALE-01` text | a **new session** | official behaviour, unchanged |
| the `SYSTEM` chip, right of `WHALE-01` | **Settings** | the 「设置」 row and its launcher button are hidden |

The zones drive the hidden buttons programmatically, so both still open. A Plugins row
that your composition does not have is not intercepted at all — the click falls
through to the official new-session handler instead of becoming a hole. Keyboard
activation (Enter or Space on the focused button) and any click held with a modifier
key are left alone. Collapse the sidebar to a rail and there is no brand button, so
there are no zones either.

While the DeepSeek account plugin is enabled it puts an account card into the
Settings slot, in place of the official Settings button. The theme takes that card
out of the layout entirely — no placeholder, no leftover gap — and `SYSTEM` stays
the one Settings entry on the row. Because the card is gone, the click no longer
goes through a synthesised keystroke (a dead click on the desktop build); it asks the
host's shortcut registry to open settings, which is the door that build answers.

### Hidden official entries

| Entry | Where | Way back |
|---|---|---|
| 「应用」/「编辑」 title-bar menu | desktop shell only; absent in a browser | none from inside the app: 关于 / 检查更新 / dsh 命令 / 退出应用 go with it. Quit is still on the tray menu. |
| the second 「新会话」 button | sidebar, below the brand row | `WHALE-01`, or `Ctrl+N` — it is a duplicate |
| 「插件」/ “Plugins” nav row | sidebar | click the illustration; **no shortcut is left** |
| 「设置」 row and its launcher button | sidebar | click `SYSTEM`, or `Ctrl+,` |
| 「收起侧栏」 button | left sidebar only; the right sidebar's stays visible | the collapse command itself is untouched |
| the session list's bottom fade | sidebar | it only dimmed the last row |
| the account card (only while the DeepSeek account plugin is enabled) | sidebar, in the Settings slot | removed outright, with no gap left where it stood; `SYSTEM` still opens Settings |

Where a way back names a keyboard shortcut, that is the desktop default — `Ctrl+N` for
a new session, `Ctrl+,` for settings, both of them the official ones, unchanged by this
theme. The web build binds the same two commands to `Ctrl+Alt+N` and `Ctrl+Alt+,`.

Nothing else in the sidebar moves. The workspace and session list keeps the official
`flex: 1` scrolling area, and the bottom area still shows whatever a third-party
plugin registers into `sidebar.footer.action` (a ledger card, say) in the position the
host gives it.

### The nav area sits under the title bar (desktop shell only)

The first nav button is level with the 对话 / 轨迹 tab row of the main area instead of
sitting below it, and the Settings row moves underneath the nav instead of above it.
That is the one visible reordering in the sidebar, and it applies to the desktop shell
only — the browser build has no title-bar strip to align to, so its layout stays the
one the host draws.

### The new session page (hero)

Three changes, on that page only:

- the headline is replaced by one fixed German line, exactly as registered:
  `Wovon man nicht sprechen kann, darüber muss man schweigen`;
- the 「预览版」/ “Preview” badge is gone;
- the whale logo above the headline is gone.

That line is set in **Great Vibes** (SIL OFL 1.1, shipped in the package) at
`min(44px, 5.3cqw)` and never wraps. Two costs, stated plainly: it is injected as
generated content, so find-in-page and screen readers do not see it, and it does not
follow the interface language — a Chinese and an English user both read the German.

### The composer's control row

The row above Send belongs to the host; the theme only reshapes it.

- The **model** and **effort** triggers carry no disclosure chevron. Their open state
  is already the trigger's own highlight, so the arrow only repeated it.
- The **permission** trigger loses its arrow as well, and gains back the right padding
  the arrow was holding. Its word is its state — the label changes with the level — so
  nothing is lost by dropping the arrow.
- On a narrow row both triggers become 28×28 icon buttons: same box, same ink as the
  add and dictation buttons beside them. A wide row keeps the text labels.
- The whole row shares one seam — 6px when it has room, 3px when it does not — so the
  four controls read as one strip instead of four drifting groups.

The four official popovers that hang off that row — permission, session stats, token
usage and the context meter — are centred on their triggers instead of left-aligned
with them. The sidebar's own view-options menu is left where the host puts it.

### What the theme adds

- A **pin button** on every workspace and session row (置顶工作区 / Pin workspace,
  following the host's language). The pinned set is kept in browser storage under
  `eva-theme/workspace-pins`; the order it produces is written through the host's own
  insert-before API, so it survives a restart — and, unlike the pin set, it also
  survives removing the theme. On the workspace row it sits in the row's own action
  group, so it takes the same 15px seam as the two official buttons beside it.
- **Channel filters** on the 「工作区」 row, on the same line as Search and the view
  options: one entry per channel `@xmanrui/dsh-im` ships — twelve of them, WeChat,
  Feishu, DingTalk, WeCom, QQ, Slack, Telegram, Discord, WhatsApp, iMessage, Matrix and
  AI Office, in the plugin's own order. One click leaves only that channel's
  conversations and hides every other row; another click puts the official list back. It
  only tags rows and stores nothing. An entry is in the row only while its own channel is
  connected: each asks that channel's status route (`dsh-im/<channel>`, method
  `connection.status`), and a channel with no account has its entry taken away rather
  than offering one that leads nowhere. A failed question keeps the last answer.
- The vendored **non-official plugin switch**, on the installed group's header in the
  official Plugins page: tick which non-official plugins to disable, or to enable
  again. It switches bundle enablement only — it installs and uninstalls nothing.
- The vendored **session status rail**: blue and breathing while a session waits for
  you (an approval, a question, a plan review), red while it is the one open in the
  main area, purple while it finished unread. A pinned row gets a rainbow title
  instead of a rail.
- The **boot mask** once per DSH launch (the mark lives in sessionStorage: a reload
  inside one run does not replay it, quitting DSH does; `?boot=1` forces a replay,
  `?boot=0` skips one).

Settings themselves remain the official dialog. The single change there is that the
dim tint behind it is removed; the panel and click-outside-to-close are untouched.

## Requirements

- DeepSeek Harness with a web profile.
- Node.js >= 18 — only for the build and check tools. The theme itself runs in
  the browser.

## Install

From npm — a versioned tarball with the browser bundle already built in:

```
dsh plugin --profile <profile> add eva-inspired-theme
```

Straight from the public repository, which tracks its default branch:

```
dsh plugin --profile <profile> add github:WhatCannotBeSaid/eva-inspired-theme
```

The package carries a `prepare` script that runs exactly that build, so an
install straight from the Git URL produces the bundle for you before the package
is linked; the npm tarball ships `client.js` ready-made and runs no build. From a
local checkout or a clone of it:

```
npm run build                                              # writes the browser bundle
dsh plugin --profile <profile> add link:<path-to-this-checkout>
```

Run the build once after cloning: `client.js` is generated and deliberately not
tracked (see [Layout](#layout)). A plain `git clone` needs one build — `npm run
build`, or any `npm install` inside the checkout, which triggers `prepare`. A
clone builds the tracked form: the paint layer points at the two pictures named
in `build/wallpapers.json` and the browser fetches them, so the background needs
a network and the host learns the viewer's IP. That is the intended public form.

The package declares `dsh.bundle.patch`, so the profile reconciles its bundle
stack against the installed package and mounts the theme. If it does not appear
after a restart, append `eva-inspired-theme` to `dsh.profile.bundles` in the
profile's `package.json` — a package that is merely a dependency is not mounted.

## Remove

```
dsh plugin --profile <profile> remove eva-inspired-theme
```

Drop the entry from `dsh.profile.bundles` too if you added it there.

## Layout

```
index.js              host half — mounts, registers no route, plays nothing
client.js             GENERATED browser bundle. Not tracked; build it. Do not edit.
src/client.js         service and effect orchestration
src/runtime/          private glass/pins/im/panels mounts
src/theme.css         the token layer
cordis.patch.yml      the bundle-patch mount declaration
build/                shipped assets + the two vendored client halves
build/wallpapers.json the TRACKED wallpaper manifest — art URLs, not image bytes
tools/                build, self-check, token audit
docs/                 design log, recon, audits, render reports, preview shots
NOTICE                upstream licences and third-party credits
LICENSE               this package's layered licence
LICENSE-CC-BY-NC-SA-4.0.txt  the CC licence text for the brand marks
```

`client.js` is generated from `src/` and carries a banner saying so. Edit `src/`
and run `npm run build`; the check gate fails if the two drift apart.

The wallpaper manifest has two layers, and the tracked one names art instead of
carrying it:

- `build/wallpapers.json` — tracked. Two entries, each with a `direct:` URL that
  points at a third party's copy of the picture, plus the `page:` a credit
  belongs on. The build emits `url("https://…")`, so the theme keeps its
  background while this repository still holds no image bytes. An empty list is
  also legal: it publishes `--cp-pick-light: none; --cp-pick-dark: none;`, the
  paint layer's documented no-art state.
- `out/wallpapers.local.json` — ignored by git. The same shape with `dataUrl:`
  entries; if it exists the build reads it instead and embeds the art, which is
  how the maintainer's own machine keeps looking the way it does. `node
  tools/build-client.mjs --public` ignores it and builds the tracked form anyway.

Because `client.js` is ignored too, and the tracked manifest holds no `dataUrl:`,
a bundle that carries artwork has nowhere to be committed. Those facts are
asserted (`wall.2`, `wall.6`, `wall.7`, `wall.8`).

## Checks

```
npm run verify
```

Runs development gates: syntax checks, 25 behavioral/build-contract tests, 127
static assertions, the 55-token audit, and exact artifact/source comparison.
Build and check commands accept the same `--mode auto|public|local`; `--public`
remains an alias. A mismatched artifact/input fails rather than guessing by image format.

Release validation is `npm run verify:release -- --mode public --host-version
<exact-version>`. Fresh target-host evidence, collection time and input hashes
are required; old dumps without provenance yield a partial development audit,
not verified compatibility. `npm run measure:resources` measures local compression
and Node compilation, not browser performance. Build/prepare still default to
auto: release only from a clean isolated checkout without out/, then validate the
packed artifact's public mode. Shipped tools/*.mjs support source builds.

See [S1–S10 implementation and acceptance record](docs/optimization-s1-s10.md)
for limitations and rollback. No host profile was changed; the working artifact
was restored to local mode.

## Licence

This package uses **tiered licensing**. Each licence applies only to the part it
is named against; none of them is an alternative licence for the whole
repository. Images and third-party materials sit outside the blanket grants
unless a row says otherwise, and catalogue data (`build/*.json`) describes assets
without licensing them. No trademark rights are granted here.

| Part | Licence | What it asks of you |
|---|---|---|
| Our code — `index.js`, `src/`, `tools/`, `client.js` | MIT | Keep the copyright and licence notice. Commercial use of the code is fine. |
| Project text — this README, `docs/`, `NOTICE`, `LICENSE` | CC BY-NC-SA 4.0 | Credit, link the licence, note changes, keep it non-commercial, share alike. |
| Brand marks — `build/whale-maid-small-monochrome-diagonal.svg`, `build/brand-mark*.png`, `build/brand-mark.jpg` | CC BY-NC-SA 4.0 | Same terms, and this is third-party artwork: see below. |
| Font — `build/great-vibes-latin.woff2` | SIL OFL 1.1 | Keep the notice; do not sell the font on its own. |
| Vendored halves — `build/plugin-toggle.js`, `build/session-eva-status.js` | MIT (two other plugins, same author) | Keep both notices; they are inlined into `client.js` too. |
| The two background wallpapers | **Hotlinked, not distributed, not licensed here.** | This project grants you no rights in them; the credits below are attribution only. |

Because the brand marks forbid commercial use, **the package as a whole may not
be used commercially**. The MIT code on its own is not restricted; drop the brand
marks if you need a commercial-use build.

Full terms: [LICENSE](LICENSE). Upstream texts and per-file credits:
[NOTICE](NOTICE). The CC BY-NC-SA 4.0 legal text ships as
[LICENSE-CC-BY-NC-SA-4.0.txt](LICENSE-CC-BY-NC-SA-4.0.txt) and is also at
<https://creativecommons.org/licenses/by-nc-sa/4.0/>.

## Fan work and attribution

**Unofficial fan work.** Not affiliated with, endorsed by, or licensed by khara,
inc., Hypergryph, or DeepSeek. The theme is a non-commercial fan work, made under
khara's published fan-work guideline (<https://www.khara.co.jp/guideline/>),
which permits non-commercial fan works and licenses neither the characters nor
the brand. Working outside the limits of that guideline needs a separate licence
from khara. The `EVA` in the package name is a reference, not a claim of origin.

**Brand mark.** Character 溟月 by 上善无形 (original character,
<https://space.bilibili.com/4456176>). DeepSeek-elements second pass by ZipZipPipe
(GPT Image 2, <https://space.bilibili.com/4168597>). Refined repair by QYQCAMIAO.
Licensed CC BY-NC-SA 4.0 — credit, non-commercial, share alike. The illustration
ships as the supplied SVG, `build/whale-maid-small-monochrome-diagonal.svg`, drawn
unmodified: no crop, no recolour, no per-mode variant; the brand row keeps its 36×36
slot and click box, with the SVG drawn at 28×28 inside it. The earlier cropped
256×256 PNGs and the dark variant derived by `tools/make-brand-mark-dark.py` stay in
the tree for rollback only, under the same terms. Commercial use of this artwork
needs permission from the rights holders above.

**Font.** "Great Vibes" by TypeSETit, SIL OFL 1.1.

**Wallpapers — hotlinked with credit, never redistributed.** Two background
images are part of the theme's intended look. Since 2026-10-09 (D79) neither is
in this repository, and since D81 the tracked manifest points at
them instead of embedding them: a build shows the pictures while this repository
carries none of their bytes and grants you no rights in them. The browser fetches
them from the host each entry names when the theme paints, so nothing is mirrored
here and an offline machine simply has no background. The one place they do appear
in git is the two preview screenshots above, which are captures of the app
painting them. Provenance, recorded because it is what a takedown request would be
about:

- Dark — **Central Dogma**, `og33jl`,
  [wallhaven.cc/w/og33jl](https://wallhaven.cc/w/og33jl), 2560×1440. Wallhaven
  credits the artist **YOTA SAKI**, and the entry links to the original posting,
  [pixiv artwork 133258822](https://www.pixiv.net/en/artworks/133258822).
  Uploaded to wallhaven by *Elisban*.
- Light — **Title Card**, `eva01city`,
  [haowallpaper.com/homeViewLook/18703364605463936](https://haowallpaper.com/homeViewLook/18703364605463936),
  1100×775. The page credits no artist, only its uploader, and the same artwork
  also circulates on wallhaven as `x85po3` (uploaded there by *BachoWilson*); the
  artwork's own file is 3066×2160, which anonymous visitors are not served.

We hold no permission from either artist. If you are one of them and object to
being linked this way, say so and the entry will be dropped from
`build/wallpapers.json` and the preview shots with it — nothing here is a copy of
the picture itself.

本仓库图片来自网络流传，具体作者未确认；如原作者认为不妥，请联系删除。
