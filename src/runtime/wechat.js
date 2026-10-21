/* Private factory input; concatenated by CLIENT_FILES, not a public module. */
    function mountWechatEntry(ctx) {
        if (typeof document === 'undefined') return undefined

        var BUTTON_ATTR = 'data-eva-wx-button'
        var STATE_ATTR = 'data-eva-wx-state'
        var GROUP_ATTR = 'data-eva-wx-group'
        var WX_TREE_ATTR = 'data-eva-wx-tree'
        var HEAD_ATTR = 'data-eva-wx-head'
        var WORKSPACE_PREFIX = 'workspace:'
        /* The workspace dsh-wechat-plugin creates and names. Its title is enforced by that
           plugin on every start (lib/host.js:72 WORKSPACE_TITLE = '微信会话', written back at
           :2632-2633 await workspace.setTitle(title)), so it does not follow the locale, and
           it is matched against the GROUP ROW'S OWN TEXT rather than a hard-coded workspace
           id -- a uuid would break on another machine, a reinstall or a second profile, while
           the title is what the user reads on that row. A missing match costs this entry its
           effect and nothing else. */
        var WX_GROUP_LABEL = '微信会话'
        /* Round 62: the 'Yu' alias added in round 61 is gone. It made this entry treat the
           user's own Yu workspace as the WeChat group, so that workspace vanished whenever
           the button was off (theme.css: [data-eva-wx-tree='off'] [data-eva-wx-group='on']
           hides the group) and was the only group left whenever the button was on. The WeChat
           group must own exactly its own workspace (C:\Users\Axiom\.dsh\dsh_wechat, titled
           微信会话 by dsh-wechat-plugin), and Yu must never be matched here. */
        /* The host's own names for the 工作区 area and for the empty marker that is a
           direct child of that row -- both are slots, not CSS-Modules classes. */
        var SLOT_SELECTOR = "[data-slot='sidebar.workspaces']"
        var MARK_SELECTOR = "[data-slot='sidebar.workspaces.directoryFlow']"
        /* The entry's id: what the button carries in BUTTON_ATTR, which is also the value the
           sheet's own attribute selectors never have to name -- there is one entry now. */
        var WX_ENTRY_ID = 'weixin'

        /* Round 60: the two names below belong to dsh-wechat-plugin, not to this theme, and both
           are read straight out of the installed package rather than guessed. Its host half
           registers a prefix route (lib/host.js:3622 webServer.register({ kind: 'prefix', path:
           '/.dsh-wechat-plugin' }) whose ROUTE_STATUS branch answers with runtime.status(), and
           that status is exactly { enabled, accounts, needsLogin, errors, diagnostics }
           (lib/host.js:477-497). Its client half is where PREFIX comes from (client.js:33
           const PREFIX = '/.dsh-wechat-plugin') and asks the same route on mount and on every poll
           (client.js:618 request(PREFIX + "/status")).
             A version of that plugin which renames the prefix costs this entry its gate: the
           request answers 404, that is no answer at all, and the last word stands -- so a rename
           can only ever leave the entry as it was, never take it away. That is the direction this
           gate is built to fail in. */
        var WX_STATUS_PATH = '/.dsh-wechat-plugin/status'
        /* One question a minute while the page is on screen, plus one whenever it comes back.
           The answer changes only when the user binds or unbinds the account in the plugin's own
           settings panel, so a minute of lag on a button is not worth a watcher -- and nothing is
           asked at all while the page is off screen. */
        var STATUS_INTERVAL = 60000

        /* The row's own icons are 16x16 in a 16 viewBox, 1px stroke, currentColor, and this
           one is drawn to that box. The artwork is the outline the user supplied rather than
           a copy of the IM plugin's filled 24-unit logo, at their instruction: 参考这个画一个.
           The file it came from -- _work/wx-ref.html in the working tree, a 204x184 JPEG --
           was measured, not traced by eye: the ink is ONE closed contour (5 086 px, one
           enclosed hole) plus four filled eye disks, so the drawing is two ellipses whose
           mutual overlap is erased on the back bubble only, two tail triangles, and four
           dots. The two centre-lines were fitted to the outline pixels (least squares on an
           iteratively re-assigned boundary set) and land here at A(5.799, 6.142, 5.502x4.488)
           and B(11.075, 9.405, 4.620x3.817); the eyes at (3.899, 4.681), (7.720, 4.672),
           (9.606, 8.524), (12.618, 8.528); the tails from (2.561, 9.771) to a tip at
           (1.850, 11.200) and from (11.632, 13.194) to (14.337, 14.088). Re-drawing that
           geometry scores 0.827 IoU against the source ink at its own resolution, which is
           the check that this is the same drawing and not a lookalike.
             Two deliberate departures from a literal transcription: the back bubble is
           drawn as its visible ARC rather than a full ellipse (the fit puts its hidden
           span between t=1.409 and t=6.161 rad, and drawing it whole would put a line
           through the front bubble the reference does not have); and the stroke stays at
           ONE user unit like every other icon in this row, where the reference's own
           proportion would be 0.63 and read as a hairline at 16px.
             Measured the same way: at 16px the two bubbles and all four eyes resolve; the
           same artwork at 32px is unambiguous. Inline SVG, never a bitmap, so the icon keeps
           its vector edge on a scaled display. */
        var ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<ellipse cx="11.075" cy="9.405" rx="4.62" ry="3.817"/>' +
          '<path d="M6.684 10.572A5.502 4.488 0 1 1 11.26 5.593"/>' +
          '<path d="M2.561 9.771L1.85 11.2L4.287 10.458Z M11.632 13.194L14.337 14.088L13.374 12.716Z"/>' +
          '<path fill="currentColor" stroke="none" d="M3.155 4.681a0.744 0.744 0 1 0 1.488 0a0.744 0.744 0 1 0 -1.488 0M6.976 4.672a0.744 0.744 0 1 0 1.488 0a0.744 0.744 0 1 0 -1.488 0M9.018 8.524a0.589 0.589 0 1 0 1.178 0a0.589 0.589 0 1 0 -1.178 0M12.029 8.528a0.589 0.589 0 1 0 1.178 0a0.589 0.589 0 1 0 -1.178 0"/>' +
          '</svg>'

        /* Two labels through the official locale service, the door the pin control and the
           vendored switch already use. A missing or throwing seat costs the wording only.
           A key is a name, and the wording names the action rather than a view, because
           that is what the control does: bring the workspace up, and put it back. */
        var NS = 'eva-wechat-workspace'
        var DICT = {
          zh: { weixin: '显示「微信会话」工作区', hidewx: '隐藏「微信会话」工作区' },
          en: { weixin: 'Show the WeChat workspace', hidewx: 'Hide the WeChat workspace' },
        }
        var translate = null
        var locale = ctx.get('locale')
        if (locale !== undefined && locale !== null) {
          if (typeof locale.register === 'function') {
            try { locale.register(NS, DICT) } catch (error) { /* an already-registered namespace keeps its first dictionary */ }
          }
          if (typeof locale.bind === 'function') {
            try { translate = locale.bind(NS) } catch (error) { translate = null }
          }
        }

        function label(key) {
          if (translate !== null) {
            try {
              var text = translate(key)
              if (typeof text === 'string' && text !== '') return text
            } catch (error) { /* a translator that throws falls back to the dictionary below */ }
          }
          return DICT.en[key]
        }

        var scheduled = false
        var disposed = false
        /* Whether the entry is lit. The group itself is looked up again on every pass rather
           than remembered across one, because React remounts the tree and a node remembered
           from the last pass may already be gone. */
        var wxOn = false
        /* Round 60: whether the 微信 channel holds an account. Hidden until an answer says
           otherwise -- the entry has to be shown, not merely not hidden, and every way of not
           answering (no plugin, a renamed route, a call that throws or rejects, a snapshot of a
           shape this build cannot read) leaves the entry hidden rather than handing the row a
           button that leads nowhere. statusPending is the one-request-at-a-time latch;
           statusTimer is the minute the whole thing costs. */
        var wxLive = false
        var statusPending = false
        var statusTimer = 0
        var statusRequest = null
        var statusGeneration = 0
        var STATUS_TIMEOUT_MS = 10000

        function schedule() {
          if (scheduled || disposed) return
          scheduled = true
          queueMicrotask(() => {
            scheduled = false
            if (disposed) return
            paint()
          })
        }

        function stop(event) {
          event.stopPropagation()
          event.preventDefault()
        }

        /* The workspaces slot, remembered while it stays attached so the pass does not walk
           the document for it once per batch. The TREE is still looked up fresh below: React
           remounts the tree, and a node remembered from the last pass may already be gone --
           but it remounts into the same slot. */
        var slotHost = null
        function slotNode() {
          if (slotHost !== null && slotHost.isConnected) return slotHost
          slotHost = document.querySelector(SLOT_SELECTOR)
          return slotHost
        }

        /* The session tree. The host renders exactly one role=tree, inside the workspaces
           slot, and every row -- group headers included -- lives in it. */
        function tree() {
          var slot = slotNode()
          if (slot === null) return null
          var host = slot.querySelector("[role='tree']")
          if (host === null) return null
          if (host.querySelector('[data-row-key]') === null) return null
          return host
        }

        function keyOf(node) {
          var key = node.getAttribute('data-row-key')
          return typeof key === 'string' ? key : null
        }

        /* The group container that holds the 微信 workspace, or null. Every row of the list is
           a treeitem whose data-row-key carries its kind, so the walk finds the header
           wherever it sits, and the title is what it is matched on: dsh-wechat-plugin enforces
           微信会话 on that workspace at every start, while a workspace uuid would break on
           another machine, a reinstall or a second profile. The Ungrouped header is excluded
           by its empty suffix.

           The node returned is the tree's OWN child, found by walking up rather than by
           counting parentElements: the live list wraps a header as tree > groupSection >
           wrapper > row, but the Ungrouped header hangs straight off its group section. The
           walk makes both shapes land on the container the sheet has to tag, and the middle
           of a wrapper is never returned by mistake. */
        function wxGroup(host) {
          var row = wxHead(host)
          if (row === null) return null
          var node = row
          while (node.parentElement !== null && node.parentElement !== host) node = node.parentElement
          return node.parentElement === host ? { group: node, head: row } : null
        }

        /* The 微信 workspace's own header row, wherever it sits. The 分组标题 is hidden
           through this row's wrapper, so the search lives here and wxGroup() is built on top
           of it. */
        function wxHead(scope) {
          var rows = scope.querySelectorAll('[data-row-key^="' + WORKSPACE_PREFIX + '"]')
          var i
          var row
          var key
          for (i = 0; i < rows.length; i++) {
            row = rows[i]
            key = keyOf(row)
            if (key === null || key.indexOf(WORKSPACE_PREFIX) !== 0) continue
            if (key === WORKSPACE_PREFIX) continue
            var title = row.textContent.replace(/^[ \t\r\n]+/, '').replace(/[ \t\r\n]+$/, '')
            if (title !== WX_GROUP_LABEL) continue
            return row
          }
          return null
        }

        /* What gets hidden to take the 分组标题 off the list: the header row's own container.
           The live list wraps that row in a SPAN that holds exactly it, so hiding the wrapper
           hides the title and nothing else; a header hanging straight off its group (the
           Ungrouped shape) has the group as its parent and is returned as-is, and the caller
           only tags it when it is not the group itself. */
        function wxHeadBox(group, row) {
          var node = row
          while (node.parentElement !== null && node.parentElement !== group) node = node.parentElement
          return node
        }

        /* Three attributes in the shape the sheet reads: one on the tree, one on the group it
           found, one on the group's own header container. Nothing is inserted, moved or
           deleted: while the switch is off the group is out of the list with display: none,
           and while it is on every OTHER group is out of the list instead, so the list holds
           the 微信 conversations and nothing else. The group's own header is hidden with them,
           which is what leaves its Session titles showing bare.

           Every write is differenced: this pass runs from a MutationObserver and a write that
           happens unconditionally would schedule the next pass forever. */
        function wxView(host) {
          var match = wxGroup(host)
          var group = match === null ? null : match.group
          if (group === null) {
            if (host.getAttribute(WX_TREE_ATTR) !== null) host.removeAttribute(WX_TREE_ATTR)
            var lost = host.querySelector('[' + HEAD_ATTR + ']')
            if (lost !== null) lost.removeAttribute(HEAD_ATTR)
            return
          }
          var head = match.head
          var box = head === null ? null : wxHeadBox(group, head)
          /* The header is hidden through the box that holds exactly it. A header hanging
             straight off its group has no such box, and then the row itself is tagged. */
          var target = box === null ? null : box === group ? head : box
          if (target !== null && target.getAttribute(HEAD_ATTR) !== 'on') target.setAttribute(HEAD_ATTR, 'on')
          if (group.getAttribute(GROUP_ATTR) !== 'on') group.setAttribute(GROUP_ATTR, 'on')
          var state = wxOn ? 'on' : 'off'
          if (host.getAttribute(WX_TREE_ATTR) !== state) host.setAttribute(WX_TREE_ATTR, state)
          /* A folded group renders no Session rows at all -- only its header -- and that
             header is hidden while the switch is on, so lighting the entry on a folded group
             would leave an empty list. Its own header click is the unfold, the same official
             control the user would press; it is pressed only while folded, so it cannot fight
             a fold the user makes twice. */
          if (wxOn && head !== null && head.getAttribute('aria-expanded') === 'false') head.click()
        }

        /* The switch itself. It flips the flag and lets one ordinary pass do the writing, so
           a press and a re-render take exactly the same path and cannot disagree. The scroll
           nudge that follows is the only scroll this side touches: the list can be scrolled
           deep when the switch is pressed, and a shorter list that keeps that offset would
           open on blank space. */
        function setWx(on) {
          wxOn = on
          paint()
          var host = tree()
          if (host !== null && wxOn && host.scrollTop !== 0) host.scrollTop = 0
        }

        /* One stable handler: what was pressed is this entry, and dispose can unhook it
           without having kept a closure per button. A bubble-phase stopPropagation keeps the
           host's own onClick out -- React delegates at #root, below document, the same
           measurement the brand row zones effect relies on. */
        function onWxToggle(event) {
          stop(event)
          setWx(!wxOn)
        }

        /* The button wears the official header icon-box contract the sheet sizes at 28x28,
           and its on state answers to its own switch rather than to a selected view. The name
           lives in aria-label only -- which is not drawn -- so hovering shows no wording in
           either state; a title left by an earlier build is taken off rather than left to pop
           up on hover. */
        function decorateWx(button) {
          var on = wxOn
          var text = label(on ? 'hidewx' : 'weixin')
          var state = on ? 'on' : 'off'
          if (button.getAttribute(BUTTON_ATTR) !== WX_ENTRY_ID) button.setAttribute(BUTTON_ATTR, WX_ENTRY_ID)
          if (button.getAttribute('aria-label') !== text) button.setAttribute('aria-label', text)
          if (button.getAttribute('title') !== null) button.removeAttribute('title')
          if (button.getAttribute(STATE_ATTR) !== state || button.firstElementChild === null) {
            button.setAttribute(STATE_ATTR, state)
            button.setAttribute('aria-pressed', on ? 'true' : 'false')
            button.innerHTML = ICON
          }
        }

        function create() {
          var button = document.createElement('button')
          button.type = 'button'
          button.setAttribute(BUTTON_ATTR, WX_ENTRY_ID)
          /* The row's own click opens its group and its mousedown starts a drag; neither
             belongs to this control. */
          button.addEventListener('mousedown', stop)
          button.addEventListener('pointerdown', stop)
          button.addEventListener('click', onWxToggle)
          return button
        }

        /* The search slot's own row, looked for inside the sidebar first and anywhere
           second: the slot NAME is a stable contract, its nesting is not -- so the scoped
           query is a shortcut and the document query is what still makes it correct. */
        function markerNode() {
          var slot = slotNode()
          if (slot !== null) {
            var near = slot.querySelector(MARK_SELECTOR)
            if (near !== null) return near
          }
          return document.querySelector(MARK_SELECTOR)
        }

        /* The entry, in the row's own document order: immediately before the search slot.
           Created only when missing, so a re-render that drops it puts it back.

           Round 60: the entry is in the row only while the channel holds an account. A button an
           earlier pass built comes out here when the account is unbound while the page is open,
           which is also what keeps the row's order -- the slot it occupied is simply empty again. */
        function entry() {
          var marker = markerNode()
          if (marker === null || marker.parentElement === null) return
          var host = marker.parentElement
          var existing = host.querySelector('[' + BUTTON_ATTR + "='" + WX_ENTRY_ID + "']")
          if (!wxLive) {
            if (existing !== null && existing.parentElement !== null) existing.parentElement.removeChild(existing)
            return
          }
          var slot = null
          for (var i = 0; i < host.children.length; i++) {
            if (host.children[i].querySelector('input') !== null) { slot = host.children[i]; break }
          }
          var button = existing
          if (button === null) {
            button = create()
            /* The node this entry has to sit before to keep the row's order: the search
               slot, whose own margin-left: auto keeps every official control where it was,
               right of the 工作区 label. */
            if (slot === null) host.appendChild(button)
            else host.insertBefore(button, slot)
          }
          decorateWx(button)
        }

        /* Round 60. What counts as a bound account is the plugin's own test, not this theme's
           invention: its settings page branches on status.accounts.length === 0 for 未连接
           (plugin client.js:1080 renders the empty-list hint on it and :1117 the disconnect
           block), so an accounts array with at least one record is exactly what turns that page
           from 未连接 into a connected account. Anything this build cannot read -- a non-object,
           a body without an accounts array, a JSON parse that failed -- is no answer rather than a
           negative one. A 404 (a renamed prefix) lands here too and is deliberately not treated
           as "no account": the plugin being unreadable is not the channel being unbound. */
        function holdsAccount(result) {
          if (result === null || typeof result !== 'object') return null
          var accounts = result.accounts
          if (!Array.isArray(accounts)) return null
          return accounts.length > 0
        }

        /* Only a real answer moves the entry, and only a CHANGED answer costs a pass: a probe
           that fails keeps the last word, so a hiccup in the route cannot take a live entry away.
           If the account goes while the switch is lit, the switch goes with it -- the tree would
           otherwise stay filtered with no entry left to press, so the official list is put back
           on the same path the switch's own off state takes. */
        function acceptStatus(answer) {
          if (disposed || typeof answer !== 'boolean' || answer === wxLive) return
          wxLive = answer
          if (!answer) wxOn = false
          schedule()
        }

        /* The one question this effect asks of another plugin, asked of the route that plugin's
           own settings half reads. A page that is not on screen is not asked: the answer cannot
           change the entry the user is looking at, and it keeps the timer free. */
        /* The deadline owns the latch, even when fetch ignores abort or json() hangs.
           Identity checks fence old completions off from a newer request's state. */
        function finishStatus(request, abort) {
          if (statusRequest !== request) return false
          statusRequest = null
          statusPending = false
          clearTimeout(request.timer)
          if (abort && request.controller !== null) {
            try { request.controller.abort() } catch (error) { /* optional platform support */ }
          }
          return !disposed && request.generation === statusGeneration
        }

        function cancelStatus() {
          statusGeneration += 1
          if (statusRequest !== null) finishStatus(statusRequest, true)
        }

        function refreshStatus() {
          if (disposed || statusPending) return
          if (typeof document !== 'undefined' && document.hidden === true) return
          if (typeof fetch !== 'function') return
          var controller = typeof AbortController === 'function' ? new AbortController() : null
          var request = { generation: ++statusGeneration, controller: controller, timer: 0 }
          statusRequest = request
          statusPending = true
          request.timer = setTimeout(function () { finishStatus(request, true) }, STATUS_TIMEOUT_MS)
          var init = { cache: 'no-store', headers: { accept: 'application/json' } }
          if (controller !== null) init.signal = controller.signal
          var pending
          try { pending = fetch(WX_STATUS_PATH, init) }
          catch (error) { finishStatus(request, false); return }
          Promise.resolve(pending).then(function (response) {
            if (statusRequest !== request || disposed) return null
            if (response === null || response === undefined || response.ok !== true) return null
            return response.json()
          }).then(function (body) {
            if (finishStatus(request, false)) acceptStatus(holdsAccount(body))
          }, function () {
            /* Failure is no answer, never an unbound account. */
            finishStatus(request, false)
          })
        }

        function onVisible() {
          if (typeof document !== 'undefined' && document.hidden === true) return
          refreshStatus()
        }

        function paint() {
          if (disposed) return
          entry()
          var host = tree()
          if (host === null) return
          wxView(host)
        }

        function dispose() {
          if (disposed) return
          disposed = true
          if (observer !== null && observer !== undefined) observer.disconnect()
          observer = null
          if (offSessions !== null && typeof offSessions === 'function') offSessions()
          offSessions = null
          if (offLocale !== null && typeof offLocale === 'function') offLocale()
          offLocale = null
          /* Stop the whole request, including its body/deadline and any late result. */
          cancelStatus()
          if (statusTimer !== 0) clearInterval(statusTimer)
          statusTimer = 0
          if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
            document.removeEventListener('visibilitychange', onVisible)
          }
          if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
            window.removeEventListener('focus', refreshStatus)
          }
          var host = tree()
          if (host !== null && host.getAttribute(WX_TREE_ATTR) !== null) host.removeAttribute(WX_TREE_ATTR)
          if (host !== null) {
            var tagged = host.querySelector('[' + GROUP_ATTR + ']')
            if (tagged !== null) tagged.removeAttribute(GROUP_ATTR)
            var headTagged = host.querySelector('[' + HEAD_ATTR + ']')
            if (headTagged !== null) headTagged.removeAttribute(HEAD_ATTR)
          }
          var buttons = document.querySelectorAll('[' + BUTTON_ATTR + ']')
          for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i]
            button.removeEventListener('mousedown', stop)
            button.removeEventListener('pointerdown', stop)
            button.removeEventListener('click', onWxToggle)
            if (button.parentElement !== null) button.parentElement.removeChild(button)
          }
        }

        /* A new Session, a retitled one, a row React re-rendered: the pass has to run again.
           Only data-row-key is watched, exactly as the pin effect watches it -- class is
           rewritten on every render, the key moves only when the row does, and a filter on
           that attribute is also what keeps this effect's own data-eva-wx* writes from
           scheduling another pass.

           Round 47 (2026-10-11) -- WHICH batches reach the pass: the same rule the pin
           effect above already applies. Before this filter the pass ran for every childList
           batch in the document, so a streaming answer in the conversation pane paid for a
           sidebar walk. Measured on the 6563-element session page: 120 conversation-only
           mutations cost 601 queries inside the sidebar (markerNode, tree, entry's own
           input scan, wxHead's row walk) plus one textContent build per batch -- the same
           shape the round-1 fix removed from the status rail. A batch that provably misses
           the workspaces slot is not this pass's business: the pass reads no row outside
           it. Three things still schedule, and they are the whole of the rule -- a target
           inside the slot, a node added or removed CONTAINING it (React replacing the
           sidebar is the remount this watch exists for), and a remembered host that is no
           longer attached. */
        function touches(records) {
          var host = slotHost
          if (host === null || !host.isConnected) return true
          for (var i = 0; i < records.length; i++) {
            var record = records[i]
            var target = record.target
            if (target !== null && target !== undefined && (target === host || host.contains(target))) return true
            var bags = [record.addedNodes, record.removedNodes]
            for (var b = 0; b < bags.length; b++) {
              var bag = bags[b]
              if (bag === undefined || bag === null) continue
              for (var n = 0; n < bag.length; n++) {
                var node = bag[n]
                if (node === host || (typeof node.contains === 'function' && node.contains(host))) return true
              }
            }
          }
          return false
        }

        var observer = null
        if (document.body !== undefined && document.body !== null) {
          observer = new MutationObserver(function (records) {
            if (!touches(records)) return
            schedule()
          })
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-row-key'],
          })
        }
        var sessions = ctx.get('sessions')
        var list = sessions === undefined || sessions === null ? null : sessions.list
        var offSessions = null
        if (list !== undefined && list !== null && typeof list.subscribe === 'function') {
          try { offSessions = list.subscribe(schedule) } catch (error) { offSessions = null }
        }
        var offLocale = null
        if (locale !== undefined && locale !== null && typeof locale.subscribe === 'function') {
          try { offLocale = locale.subscribe(schedule) } catch (error) { offLocale = null }
        }
        /* Round 60: the 微信 question, asked once now and then on the interval above -- and again
           whenever the page comes back on screen or the window is focused, which is the moment
           the user has most likely just bound or unbound the account. All three are dropped again
           in dispose. Note that no pass runs until the first answer lands: paint() below draws the
           tree as the plugin has it, and the entry appears with the truthful answer rather than
           for a frame before it. */
        if (typeof setInterval === 'function') statusTimer = setInterval(refreshStatus, STATUS_INTERVAL)
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
          document.addEventListener('visibilitychange', onVisible)
        }
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('focus', refreshStatus)
        }
        refreshStatus()
        paint()

        return dispose
    }
