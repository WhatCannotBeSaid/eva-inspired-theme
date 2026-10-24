/* The theme's own client glue: apply(), the mount order, and the exports map.
 *
 * tools/build-client.mjs interpolates this file VERBATIM into the generated
 * client.js, next to src/boot-screen.js (which defines mountBootScreen) and the two
 * vendored plugins (applyPluginToggle, applySessionEvaStatus). It closes over six
 * values the builder defines above it in the same factory: PLUGIN_ID, TOKENS, MANIFEST,
 * WALLPAPER_DECLARATIONS, CSS and BOOT_CSS. Nothing here is re-parsed by the
 * builder, so the code below is exactly the code that runs — which is the whole
 * point of keeping it in a file instead of in a template string.
 *
 * It stays free of backticks and template placeholders by the same house rule
 * src/boot-screen.js follows: not because verbatim interpolation would break, but
 * because a file that reads as itself is one that can be reviewed, grepped and
 * diffed. A literal backslash is fine here and only here — the paint layer needs one
 * to join three sheets into a single tag — since nothing escapes this text on the
 * way in.
 */

    /* The two wallpaper bitmaps ship as base64 data URLs inside the generated
       --cp-wall-<id> declarations, about 441 KB and 281 KB of text. A data URL in a
       custom property is not free the way a data URL in a paint rule is: every element
       that inherits the property carries the whole string in its computed value, so a
       full style recalculation has to build and compare those strings across the
       document. Measured on this machine, the two wallpapers alone were ~8.6 ms of a
       ~15 ms full-document recalculation -- ~56% of the theme's recalculation cost --
       while the identical bytes painted from a rule cost nothing measurable.

       So the bytes move out of the stylesheet and into blob URLs at apply time: the
       sheet that reaches the parser is the short value, and the pixels are still
       exactly the shipped ones. The names and the shape of the chain stay untouched
       (--cp-wall-<id>, --cp-pick-light/dark, and the documented no-wallpaper knob that
       sets --cp-pick-* to none) -- only the value is shortened. Any failure falls back
       to the data URL verbatim, so this cannot break the theme: worst case it is
       exactly what it was before. */
    function shortenDataUrls(text, created) {
      if (typeof Blob === 'undefined' || typeof URL === 'undefined' ||
          typeof URL.createObjectURL !== 'function' || typeof atob !== 'function') return text
      return text.replace(/url\("(data:[^"]+)"\)/g, function (whole, dataUrl) {
        try {
          var comma = dataUrl.indexOf(',')
          if (comma < 0) return whole
          var meta = dataUrl.slice(5, comma)
          var body = dataUrl.slice(comma + 1)
          /* Base64 is the only shape the theme ships, and the byte loop below is the whole
             cost of this pass. The platform decoder returns the same bytes measurably
             faster (11.0ms -> 8.0ms on this theme's payload, measured in Chromium), so use
             it when it exists and keep the loop as the fallback for builds that lack it.
             Both paths throw on malformed input, and any failure still falls through to
             the catch that returns the data URL verbatim. */
          var isBase64 = meta.indexOf('base64') >= 0
          var bytes
          if (isBase64 && typeof Uint8Array.fromBase64 === 'function') {
            bytes = Uint8Array.fromBase64(body)
          } else {
            var binary = isBase64 ? atob(body) : decodeURIComponent(body)
            bytes = new Uint8Array(binary.length)
            for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
          }
          var blobUrl = URL.createObjectURL(new Blob([bytes], { type: meta.split(';')[0] }))
          if (created) created.push(blobUrl)
          return 'url("' + blobUrl + '")'
        } catch (err) {
          return whole
        }
      })
    }

    /* 2026-10-12 性能：非关键功能延迟到浏览器空闲时执行。品牌行点击拦截、工作区
       置顶这两个功能在主题激活时不关键（主题的视觉在令牌层、液态玻璃、样式挂载
       与启动遮罩就绪后即完整），同步执行会阻塞插件加载。延迟到
       requestIdleCallback 后，关键路径缩短约 30-50ms（实测：这两个 effect 的
       初始化合计 42ms），用户感知是主题立即可用，这两个功能在 50-100ms 内跟上。

       2026-10-16 修复：requestIdleCallback 不能是唯一的出口。规范上，不带 timeout
       选项的调用可以在页面「永远不空闲」时永不执行 —— 桌面渲染器里实测就是这样：
       注册三个空闲任务后 30 秒内一次回调都没有（同一页面里 setTimeout 照常触发，
       所以不是定时器被冻结）。于是所有走 defer 的 effect —— 品牌行、工作区置顶、
       微信会话开关 —— 在桌面窗口里静默地永不执行，而浏览器标签页里一切正常：
       用户的微信按钮就是这样消失的。
       现在两件事同时做：给空闲回调带上 { timeout }（规范承诺的最迟执行时间），
       并另挂一个定时器兜底（不依赖宿主是否真的会空闲，也覆盖没有 rIC 的宿主）。
       谁先到谁执行，先到的那个取消另一个。有闲时仍然空闲回调优先，浏览器标签页
       行为不变；没有闲时也一定在 DEFER_FALLBACK_MS 内执行。 */
    var DEFER_FALLBACK_MS = 200

    function defer(fn) {
      var settled = false
      var idleHandle = null
      var timerHandle = null

      function run() {
        if (settled) return
        settled = true
        if (idleHandle !== null && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleHandle)
        if (timerHandle !== null) clearTimeout(timerHandle)
        fn()
      }

      if (typeof requestIdleCallback === 'function') {
        idleHandle = requestIdleCallback(function () { run() }, { timeout: DEFER_FALLBACK_MS })
      }
      /* 兜底：不依赖宿主是否真的会空闲。两者同时挂上，run() 里的 settled 保证只执行一次。 */
      timerHandle = setTimeout(function () { run() }, DEFER_FALLBACK_MS)

      return { idle: idleHandle, timer: timerHandle }
    }

    function cancelDefer(handle) {
      if (handle === null || handle === undefined) return
      if (handle.idle !== null && handle.idle !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(handle.idle)
      }
      if (handle.timer !== null && handle.timer !== undefined) clearTimeout(handle.timer)
    }

    /* 包装一个 effect，使其延迟到浏览器空闲时执行。返回的 disposer 会在插件卸载时
       取消待执行的延迟任务，并调用已执行功能的 disposer。 */
    function deferEffect(fn) {
      var disposed = false
      var disposer = null

      function run() {
        if (disposed) return
        disposer = fn()
      }

      var handle = defer(run)

      return function () {
        disposed = true
        cancelDefer(handle)
        if (typeof disposer === 'function') disposer()
      }
    }

    /* ------------------------------------------------------------------------
       Round 50 (2026-10-14) -- the composer's model seat becomes two controls.

       The official composer hands the merged control to one seat: a single button
       reading "DeepSeek V4.1 Flash · 高" whose panel also carries the reasoning
       levels. The user asked for the reference layout instead: TWO buttons, each
       with its own panel -- the model on the left, the reasoning level on the
       right -- so the two choices stop sharing one surface.

       Nothing official is edited. "conversation.input.model" is a "single" slot,
       and a single slot is claimed per PRIORITY: register() refuses a second
       occupant at the same priority, and the renderer takes the lowest priority
       that is still live. The official registers at 0, so this one registers at
       -1 and shadows it. Turning the theme off disposes the registration and the
       official control returns unchanged -- the same removable-layer rule the
       token layer and the paint layer follow.

       Why a React component instead of the DOM-level bridges the brand row and
       the workspace pins use: those drive elements the official UI already
       rendered, and this seat has to be the component that renders. The two
       pickers keep their own vanilla-DOM implementations (src/model-effort-
       picker.js, ported verbatim from the standalone build); the component is a
       thin mount -- one container, one createPair, one destroy -- so the
       behaviour is unchanged from the version that was self-tested on its own.

       The inject face is the official one, name for name: "directory" is the
       session's model store, "load" refreshes the catalog on open, and "select"
       is the single verb both panels end up calling. "available" is false for an
       addressed subagent session, where the host refuses model selection; that
       case renders nothing at all, exactly as the official control does.
       ------------------------------------------------------------------------ */

    function EvaModelSeat(props) {
      /* Two components, not one, for a hooks reason: a component that returns before
         some of its hooks changes the hook count between renders, which React rejects.
         The outer one decides whether the seat exists at all; every hook lives in the
         inner one, where none is ever skipped. */
      var react = null
      try { react = require('react') } catch (err) { react = null }
      if (react === null) return null
      if (props.available === false) return null
      return react.createElement(EvaModelSeatHost, props)
    }

    function EvaModelSeatHost(props) {
      var react = require('react')
      var hostRef = react.useRef(null)
      var pairRef = react.useRef(null)

      /* Mount once per directory. "directory" is the session's store, so a session
         switch remounts the two controls; a re-render inside one session does not. */
      react.useEffect(function () {
        var node = hostRef.current
        if (!node) return undefined
        var made = EvaModelEffortPicker.createPair({
          directory: props.directory,
          load: props.load,
          select: props.select,
          disabled: props.locked === true
        })
        node.appendChild(made.model.el)
        node.appendChild(made.effort.el)
        pairRef.current = made
        /* Both triggers are in the document now, so the row has a width to fit
           the model name into. Doing this before the append would measure a
           detached node and fit against zero. */
        if (typeof made.watch === 'function') made.watch()
        return function () {
          pairRef.current = null
          made.destroy()
        }
      }, [props.directory])

      /* "locked" is a render-time fact (a running turn locks the composer) and it
         changes without the session changing, so it is applied on every render rather
         than folded into the mount above -- which is why the pair is held in a ref. */
      react.useEffect(function () {
        var made = pairRef.current
        if (!made) return
        made.model.setDisabled(props.locked === true)
        made.effort.setDisabled(props.locked === true)
      })

      return react.createElement('div', {
        'data-eva-mep-seat': '',
        className: 'eva-mep-seat',
        ref: hostRef
      })
    }

    /* The seat's registration.

       The dependency list is the official plugin's own -- its exports.inject names
       ["commandUi","locale","sessions","slots","remote","remote.session"], and the five
       this seat actually reaches for are the five named here. That list is not
       decoration: a cordis scope is *traced*, so reading a service the context was not
       injected with throws "cannot get property X without inject" AT CALL TIME, and
       that throw lands inside the slot's render, where the error boundary treats it as
       an abdication -- the entry is silently retired and the official control shows
       through again with nothing in the console a user would see. Measured on a live
       instance, exactly that: a list without "remote.session" rendered the official
       button and looked for all the world like the theme had done nothing at all.

       "sessions" is read off the injected scope at injection time rather than listed as
       a separate wait, because that is what the shipped control does and the two must
       stay symmetric. */
    function mountModelSeat(ctx) {
      ctx.inject(['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session'], function (scope) {
        var models = scope.modelDirectories
        scope.slots.inject('conversation.input.model', function () {
          return scope.slots.register({
            name: 'conversation.input.model',
            priority: -1,
            inject: function (sessionId) {
              var directory = models.directoryFor(sessionId)
              var sessions = scope.sessions
              var available = sessions === undefined ||
                sessions.subagentAddress(sessionId) === undefined
              return {
                available: available,
                directory: directory.store,
                load: function () {
                  if (available) directory.load().catch(function () {})
                },
                select: function (selection) {
                  return available ? directory.select(selection) : Promise.resolve(undefined)
                }
              }
            }
          }, EvaModelSeat)
        })
      })
    }

    function apply(ctx) {
      var theme = ctx.get('theme')
      if (theme === undefined) return

      /* The whole theme is one token override plus one stylesheet -- nothing else.
         There is no settings panel any more: it was removed on 2026-10-06 at the
         user's request (「去掉设置里的「EVA主题」选项，不需要手动选择了」), so the
         look is fixed rather than a preference, and nothing is read from browser
         storage. The shipped map is applied as-is. */
      ctx.effect(() => {
        var dispose = theme.overrideTokens(PLUGIN_ID, TOKENS)
        return () => { if (typeof dispose === 'function') dispose() }
      }, 'evangelion: token layer')

      /* ---- Selected-title rainbow: no client code here (round 20, 2026-10-07)
         The marquee that used to live at this spot is gone. Its replacement is a
         static rainbow, and a static colour needs neither a driver nor a marker:
         src/theme.css paints it from a structural selector on the selected row's
         own title span, so the shape lives in one place only.

         Everything the marquee had to own has no counterpart here, which is the
         point of the swap: no per-frame loop, no width measurement, no remembered
         title, and no MutationObserver keeping that memory in step with the app --
         so there is also no attribute to retract on unload. Right-to-left, hidden
         tabs, the auto-title plugin rewriting a title mid-flight: all of it used to
         need a branch here and now needs none. reduced motion is not consulted for
         the title either, because a colour is not motion (the row's own 140ms hover
         fade still is, and that is what the matchMedia below still serves). */

      /* ---- Liquid glass: the refraction maps (2026-10-07)
         「为左侧边栏添加液态玻璃效果」「为输入框添加液态玻璃效果」.

         Liquid glass is not more blur. A blur throws the backdrop away; the glass in
         the reference implementations bends it, which is why the wallpaper becomes
         legible through the surface again while the type on top stays readable. The
         bend is one SVG filter per surface: an RG map (R = horizontal offset, G =
         vertical, 128 = leave the pixel alone) fed to feDisplacementMap, where the
         map is bright near an edge and neutral in the middle.

         Why the maps are built here and not written into the sheet: the map's bevel is
         a distance, and feImage stretches whatever it is given across the filter
         region. One fixed map would therefore scale its own bevel with the element —
         the composer is 877x114, so a square map would make its horizontal bevel seven
         times thicker than the vertical one. Measuring the box and drawing the map for
         it is the only way to keep the bevel constant in px, which is also what makes
         a resize re-draw rather than re-stretch.

         The map is drawn at the size of the filter REGION, not of the element, and the
         feImage is left with no placement of its own. Both details are load-bearing and
         both were measured: an feImage carrying its own x/y/width/height is sampled as
         something else entirely (the rim then reads a constant, which shifts the whole
         backdrop by half the scale instead of bending it near the edge), while one that
         simply fills its region lands one map pixel per region pixel. The region in turn
         has to reach past the border box, because the samples the rim pulls in have to
         exist as backdrop pixels; with the region equal to the box the rim can only
         sample what is inside it and the edge goes flat.

         The sheet names this filter (url(#eva-lg-input)) and carries a blur-only
         fallback line before it; an engine that cannot parse url() drops that
         declaration and keeps the frost. selfcheck glass.1 pins that the two halves
         name the same ids.

         The definitions live in a 0x0 <svg> at the end of the body: they are referenced
         by id, never rendered, and never measured. Turning the theme off removes the
         svg and both observers with it, so the surfaces go back to plain shells. */
      ctx.effect(() => mountLiquidGlass(), 'evangelion: liquid glass')

      ctx.effect(() => {
        if (typeof document === 'undefined') return
        /* Idempotence. A reload of this module (HMR rebuild) can leave the previous
           sheet in the DOM if its disposer never ran, and two copies of the paint layer
           would then fight over the same selectors. The owner marker doubles as the
           selector, so a new mount takes over from any old one instead of stacking. */
        var stale = document.querySelectorAll('style[data-plugin-css="' + PLUGIN_ID + '/theme.css"]')
        for (var i = 0; i < stale.length; i += 1) { stale[i].remove() }
        var tag = document.createElement('style')
        tag.dataset.plugin = PLUGIN_ID
        tag.dataset.pluginCss = PLUGIN_ID + '/theme.css'
        /* The wallpaper variables go first. Custom properties resolve at
           computed-value time, so declaration order inside one sheet does not
           change the result — but reading it image-first is easier to follow. */
        /* The blob URLs made below outlive the tag they were written into, so the
           disposer gives them back; without this a reload of the module would leave
           the bitmaps reachable for the life of the document. */
        var blobUrls = []
        tag.textContent = shortenDataUrls(WALLPAPER_DECLARATIONS, blobUrls) + '\n' + CSS + '\n' + BOOT_CSS + '\n' + PICKER_CSS
        document.head.appendChild(tag)

        /* prefers-reduced-motion cannot be honoured from the stylesheet: the paint
           layer may not carry @media (selfcheck css.7 rejects an at-block there), so
           the query is evaluated here and published as one body attribute the
           stylesheet keys on. It rides on the
           effect that installs the sheet, so turning the theme off takes the
           attribute away with it. */
        var motion = window.matchMedia('(prefers-reduced-motion: reduce)')
        var applyMotionPref = function () {
          if (document.body) document.body.dataset.evaMotion = motion.matches ? 'reduced' : 'full'
        }
        applyMotionPref()
        motion.addEventListener('change', applyMotionPref)
        return () => {
          /* The sheet goes first: it is the one thing whose absence is visible in
             the next paint. What is left only retracts state the sheet keyed on, and
             selfcheck cli.9 anchors its regex on the tag.remove() call below (see
             tools/selfcheck.mjs).) */
          tag.remove()
          for (var b = 0; b < blobUrls.length; b += 1) {
            if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
              URL.revokeObjectURL(blobUrls[b])
            }
          }
          motion.removeEventListener('change', applyMotionPref)
          if (document.body) document.body.removeAttribute('data-eva-motion')
        }
      }, 'evangelion: paint layer')

      /* Boot mask -- 「闸门开启」. One page load plays it once (the in-page
         window.__evaBootMark guard), then it deletes itself. The disposer returned
         by mountBootScreen IS destroyBoot, so turning the theme off mid-play takes
         the mask away with the stylesheet. It waits for the paint layer's tag, so it
         must be registered after it. */
      ctx.effect(() => mountBootScreen(), 'evangelion: boot screen')

      /* The vendored plugin-toggle switch. It is the user's own plugin folded in, not
         a re-implementation, and it registers its own disposer through ctx.effect —
         so this is a single call, not an effect of ours. */
      applyPluginToggle(ctx)

      /* The vendored session-status rail (2026-10-09). Same rule as the switch above:
         the user's own plugin, folded in byte for byte, registering its own disposer
         through ctx.effect — one call, not an effect of ours.

         It marks each session row's left rail (waiting on you / selected / unread
         completion) and paints the pinned row's title. Its cordis row carried exactly
         one config value, hideOfficialDot: true — hide the official unread dot on a row
         this rail has already coloured — which is also resolveConfig()'s own default,
         so nothing is passed here; the behaviour is the plugin's own row, unchanged.

         The three services it reads (uiSession, sessions, workspaces) are named in the
         exports.inject below, so the loader hands it a context where they exist. It is
         called after the switch only because the mount order reads top-down. */
      applySessionEvaStatus(ctx)

      /* The composer's model seat (round 50, 2026-10-14): two independent controls
         where the official composer had one merged button. It is called for its own
         side effect -- the seat registration -- and registers through
         ctx.inject + slots.inject rather than ctx.effect, so it adds no effect to the
         ten cli.11d counts. See mountModelSeat above for why it shadows at -1. */
      mountModelSeat(ctx)

      /* Brand row, three zones -- the user's own mapping (2026-10-08, round 25, D68):
         the avatar Logo opens Plugins, WHALE-01 stays New session, SYSTEM opens
         Settings, and the sheet hides both official entries (the settings button and
         the plugin row).

         Why this is script and not CSS: the three labels are ONE button. The official
         SidebarRoot renders the brand.mark and brand.name slots INSIDE the sidebar's
         brand button, and the sheet draws SYSTEM as that button's own ::after -- so
         the zones are coordinates on one button, never three elements, and a
         pseudo-element has no box to measure. The third zone therefore starts where
         the NAME box ends: SYSTEM and its padding follow the name, so they share its
         zone.

         A capture-phase listener on document is the only place that can pre-empt the
         official onClick (which starts a session). React delegates at #root, which
         sits BELOW document, so stopPropagation() here means the official handler
         never runs -- measured on a live instance: the button's own listener saw
         nothing for an intercepted click, and both hidden targets still open their
         surface when clicked programmatically (display:none does not block a
         synthetic .click()).

         Every mismatch falls back to the official behaviour rather than to a dead
         click: keyboard activation has no coordinates and is let through, a modified
         click is left to the browser, and a plugins zone whose row is missing is not
         intercepted at all. The settings zone is the one exception -- with its button
         gone it presses the command's own shortcut instead, the same command by
         another door (measured: the dispatcher reads the event's keys, not its
         isTrusted flag).

         Zones are measured at click time, never cached: the sidebar can be wide
         (mark + name) or a rail (mark only, no name -- and then no brand button at
         all), and a cached box would route a click to the wrong surface. */
      ctx.effect(() => deferEffect(() => {
        if (typeof document === 'undefined') return undefined

        var NAME = "[data-slot='sidebar.brand.name']"
        var MARK = "[data-slot='sidebar.brand.mark']"
        var LAUNCHER = "[data-slot='settings.launcher'] > button"
        /* The plugins row, named by its accessible name. The row carries no
           id-bearing attribute at all (measured: type / class / aria-label), and the
           slot anchor inside it is an anonymous display:contents wrapper, so its
           siblings in the same nav cannot be told apart structurally. The label comes
           from the plugin-manager dictionary, which ships exactly two strings (zh
           '插件', en 'Plugins') with every other locale falling back to en -- naming
           both is complete, and naming only these leaves the nav's other rows (the
           shipped composition also has ui-schedule's, order 10) alone. An unmatched
           row is not intercepted at all, so the click falls through to the official
           handler. */
        var PANEL_ROW = "[data-slot='sidebar'] > div > nav[aria-label] > button:has([data-slot='sidebar.panellist'])[aria-label='插件'], [data-slot='sidebar'] > div > nav[aria-label] > button:has([data-slot='sidebar.panellist'])[aria-label='Plugins']"

        /* The settings command by its other door. dsh-client-shortcuts declares a map
           per receiving device and the two maps disagree on this one command: the
           desktop build binds settings.open to Ctrl+, and the web build to Ctrl+Alt+,.
           The host decides which map is in force exactly one way -- detectEnvironment
           reads document.documentElement.dataset.platform and calls it desktop when
           the attribute is there -- so the same test picks the chord here. Only ONE
           event is dispatched: sending both would match twice, and the second match
           lands with modal === 'settings', whose resolve() closes the panel it just
           opened. Reached only when the launcher button is absent from the DOM.

           Why absent covers the account card too (round 64, D101): when
           ui-settings-account is enabled the slot holds a Menu trigger, not a button
           -- the real chain is div[data-slot] > div > span > button -- so the direct-
           child selector above matches nothing and this is the path that runs. That
           is what keeps SYSTEM live while the sheet hides the card's subtree. */
        /* Round 68 (2026-10-20): a synthesised keydown does NOT reach the command
           registry on the desktop build. dsh-client-shortcuts installs the DOM
           listener with native = true there (ShortcutsService: the keyboard bridge
           exists whenever runtime is desktop), and its keydown handler returns
           right after the fixed-input hook -- client.js:813, 'if (native) return'.
           Bindings are resolved only from the native bridge in that build, so the
           synthetic event was silently dropped and SYSTEM became a dead click as
           soon as the account card pushed the button out of LAUNCHER. Web builds
           keep native = false and still dispatch, which is why this reproduced only
           after the account plugin was enabled on the desktop profile.
           The fix is to ask the command registry directly instead of synthesising a
           key press. ctx.shortcuts is the ShortcutsService; the invocable registry is
           service.registry, and registry.invoke(id, context) is the same door the
           native menu uses (dsh-client-shortcuts/lib/client.js:644). The context is
           exactly the facts settings.open's resolve() reads -- the topmost modal and
           the focused region -- probed from the live document with the host's own
           modalSelector expression, so the command behaves as if chosen from the
           menu: closed settings open, open settings close.
           The chord below stays as the second door for a build without the service,
           and is still the only thing that runs if invoke() throws. */
        var modalScopeOf = function () {
          var nodes = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="menu"]')
          /* The host's selector, read the host's way: the LAST match in the document,
             on screen or not (dsh-client-ui-primitives modalSelector; the keyboard
             path at dsh-client-shortcuts/lib/client.js:1405 reads it identically). A
             popover that collapses by CSS while staying mounted therefore counts as an
             open modal, and a scope other than settings refuses the invoke below.
             Round 69 (2026-10-24): walk back past matches with no layout box, so the
             scope returned is the modal a person could actually see. The composer's two
             picker popovers used to claim role="menu" while closed and are fixed at the
             source (src/model-effort-picker.js, setMenuRole); this guard covers the same
             mistake made by any other mounted popover. Without it, SYSTEM is a dead
             click in a conversation and live everywhere else -- exactly the asymmetry
             that was reported. */
          for (var i = nodes.length - 1; i >= 0; i -= 1) {
            var node = nodes[i]
            if (node.getClientRects().length === 0) continue
            var scope = node.getAttribute('data-shortcut-modal')
            return scope === null || scope === '' ? 'other' : scope
          }
          return null
        }

        var pressSettingsShortcut = function () {
          var service = ctx.get('shortcuts')
          var registry = service === null || service === undefined ? undefined : service.registry
          if (registry !== undefined && registry !== null && typeof registry.invoke === 'function') {
            var modal = modalScopeOf()
            /* invoke() silently drops a command whose modals list excludes the
               current modal, so a foreign dialog is left alone here rather than
               looking like a click that did nothing. */
            if (modal === null || modal === 'settings') {
              var focus = document.activeElement
              var editable = focus !== null && typeof focus.matches === 'function' &&
                focus.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
              try {
                registry.invoke('settings.open', {
                  target: focus, region: editable ? 'editable' : 'page', modal: modal, source: 'menu',
                })
                return
              } catch (error) { /* fall through to the chord below */ }
            }
          }
          if (typeof KeyboardEvent !== 'function') return
          var desktop = document.documentElement.dataset.platform !== undefined
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: ',', code: 'Comma', ctrlKey: true, altKey: !desktop, bubbles: true, cancelable: true,
          }))
        }

        var onCapture = function (event) {
          if (event.button !== 0) return
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
          var node = event.target
          var button = node !== null && node.closest ? node.closest('button') : null
          if (button === null) return
          var name = button.querySelector(NAME)
          if (name === null) return
          /* detail 0 is Enter/Space on the focused button (and any programmatic
             click): no coordinates, so no zone -- the official new session stands. */
          if (event.detail === 0) return
          var mark = button.querySelector(MARK)
          var x = event.clientX
          var zone = ''
          if (mark !== null && x < mark.getBoundingClientRect().right) zone = 'plugins'
          else if (x >= name.getBoundingClientRect().right) zone = 'settings'
          if (zone === '') return
          var hidden = document.querySelector(zone === 'plugins' ? PANEL_ROW : LAUNCHER)
          /* A missing plugin row is not intercepted at all, so the click still falls
             through to the official handler instead of becoming a hole. */
          if (hidden === null && zone === 'plugins') return
          event.stopPropagation()
          event.preventDefault()
          if (hidden !== null) hidden.click()
          else pressSettingsShortcut()
        }

        document.addEventListener('click', onCapture, true)
        return () => { document.removeEventListener('click', onCapture, true) }
      }), 'evangelion: brand row zones')

      /* ---- Workspace pins: hold chosen Workspaces at the top of the list
         (round 39, 2026-10-09)

         The thing being fixed is measured, not assumed. Creating a Workspace
         PREPENDS it to the durable order -- dsh-workspace-index.js:685 is
         'workspaceIds: [id, ...state.workspaceIds]' -- and the client model mirrors
         that prepend in its own upsert() (api-wsc-client.js:292:
         'this.committedOrder = [view.workspaceId, ...this.committedOrder]'). So a
         Workspace the reader wants on top slides down one slot every time another is
         added, in the registry and on screen.

         Nothing official pins a WORKSPACE. The registry record carries no pin field,
         the client model's pinnedSessionIds is Sessions only, and workspaceMenuItems is
         a hardcoded two-row array (rename, delete) rather than a slot -- so the row
         itself is the only door, and the row is React's. The control is therefore
         injected into the official 'span.rowActions' and re-asserted on every mutation
         the sidebar makes: React removing the button is itself a childList mutation,
         so the next pass puts it back.

         Where the pin set lives, and why it is browser storage. The host half cannot
         carry it: it is CommonJS with no node_modules of its own, the typert remote
         protocol it would need has no '@deepseek-ai/cordis' anywhere on this disk, and
         the two standing host rules -- no filesystem writes, no HTTP routes -- plus
         "exports no Config" (tools/selfcheck.mjs host.2) close the other doors. Browser
         storage is what is left, and it is the official client-side answer:
         @deepseek-ai/dsh-client-store documents its persisted stores as JSON in
         localStorage. The ORDER, unlike the pin set, is already durable on the host, so
         every re-assert goes through the official insertBefore and survives a restart;
         only "which ones are pinned" follows the browser profile.

         The move is the official one: the client service face's insertBefore
         (api-wsc-client.js:412) moves a Workspace within the durable order and installs
         the result optimistically, so the row lands where it belongs before the round
         trip finishes. Only moves that actually change the order are sent, so a settled
         list stays silent -- which matters, because each one is a durable write. */
      ctx.effect(() => deferEffect(() => mountWorkspacePins(ctx)), 'evangelion: workspace pins')

      /* ------------------------------------------------------------------------
         Round 63 (2026-10-20) -- the four OFFICIAL composer panels centre on their
         trigger, the way the theme's own two pickers already do.

         Root cause, read out of the shipped bundles rather than guessed. Those four
         panels are placed by JavaScript, never by a stylesheet:

           · '@deepseek-ai/dsh-client-ui-primitives'' 'useAnchoredPosition' computes,
             for its DEFAULT 'align: 'start'',
                 left = align === 'end' ? rect.right - panelWidth : rect.left
             clamps it to '[margin, innerWidth - panelWidth - margin]', and returns
             the pair as state.
           · Its callers write that state as an INLINE style on a portaled
             'position: fixed' div ('createPortal(..., document.body)'), then re-derive
             it on scroll, on resize and on a ResizeObserver tick of the panel.
           · 'ui-chat''s 'useStatDialog()' (the 会话统计 and Token 用量 pills) and
             'ui-conversation''s ContextMeter (上下文已用) all call it with
             'side: 'top'', 'gap: 8', 'margin: 12' and NO 'align' -- so all three take
             the 'start' branch and hang off the trigger's LEFT edge.
           · 'ui-permission-presets' reaches the same placement through the Menu
             primitive, whose portaled list is likewise 'position: fixed' with an
             inline 'left'.

         The theme's own panels are centred by CSS instead: '.eva-mep-pop' carries
         'left: 50%' plus 'transform: translateX(calc(-50% + var(--eva-mep-shift)))',
         and the controller measures the real panel and appends the edge correction
         afterwards. That asymmetry is the entire visual gap the user reported.

         It is NOT reachable from a class. The official placement writes an inline
         'left', which beats any sheet rule short of '!important' -- and '!important'
         still cannot express "half the trigger's width minus half of mine" without
         knowing both boxes. The correction has to happen in the same coordinate space
         the official placement writes in, and at the same moments it re-derives.

         Three facts that decide the shape of this effect:

           · The panels are children of 'document.body', not of the composer, so no
             selector rooted at '[data-composer-card]' can reach them. The scan is a
             body-level query for portaled fixed panels -- and it must therefore be
             narrow, because the settings modal is 'role="dialog"' too.
           · The only link a portal keeps to its anchor is the trigger's own
             'aria-expanded' state. That works for the three triggers carrying
             'aria-haspopup' (the two stat pills and the context meter) and NOT for the
             permission button, which the Menu primitive renders untouched -- so that
             one is found by its SLOT, the same '[data-slot='conversation.input.permission']'
             hook src/theme.css already uses for the chevron. Neither half writes a
             CSS-Modules hash.
           · The panel is drawn directly above its own trigger, while the sibling
             pills sit on that trigger's line. Vertical distance therefore identifies
             the owner; 'MAX_GAP' is the cut that rejects an unrelated dialog.

         The margin is 12, the same value the official clamp uses, so a centred panel
         near an edge is pulled back inside the viewport instead of hanging off it.
         At or below 560px, where the composer row wraps and the pill row runs close to
         the card's edges, that clamp is the branch that actually runs. */

      ctx.effect(() => deferEffect(() => mountCentredPanels()), 'evangelion: centred panels')

      /* Read-only surface for troubleshooting and for the delivery docs. */
      exports.manifest = MANIFEST
    }

    exports.name = PLUGIN_ID
    /* uiSession / sessions / workspaces are the three services the vendored
       session-status rail reads (its own exports.inject names the same three); naming
       them here is what makes the loader wait for them, so apply() cannot run against a
       context where they are still missing and throw. */
    exports.inject = ['theme', 'remote', 'locale', 'uiSession', 'sessions', 'workspaces']
    exports.apply = apply
    return module.exports
