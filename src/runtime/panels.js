/* Private factory input; concatenated by CLIENT_FILES, not a public module. */
    function mountCentredPanels() {
        if (typeof document === 'undefined') return undefined
        if (typeof window === 'undefined') return undefined

        /* The four panels, as portaled fixed boxes. 'role' is the one attribute all
           three implementations agree on: ContextMeter and the stat dialog each render
           'role="dialog"', the Menu primitive renders 'role="menu"'. */
        var PANEL_SELECTOR = 'body > div[role="dialog"], body > div[role="menu"]'
        /* An open composer trigger. 'aria-haspopup' separates these from the hundreds
           of other aria-expanded buttons in the app. */
        var OPEN_TRIGGER = '[aria-expanded="true"][aria-haspopup]'
        /* The permission button carries no aria-haspopup (see above), so it is
           addressed by slot. */
        var PERMISSION_TRIGGER = "[data-slot='conversation.input.permission'] button"
        /* Same value the official clamp uses (PANEL_MARGIN in stat-dialog, and 'margin'
           at every useAnchoredPosition call site here). */
        var MARGIN = 12
        /* A portaled dialog that is nowhere near a composer trigger is somebody else's
           surface; it must not move. */
        var MAX_GAP = 240
        /* And the placement must PROVE it belongs to that trigger: the official
           useAnchoredPosition writes 'left' equal to the anchor's own left edge (plus at
           most a few px of the theme's own shift), so a panel whose left edge sits
           anywhere else was anchored to something else. This is what keeps the sidebar's
           视图选项 menu -- also a 'role="menu"' portal -- out of the sweep. */
        var ANCHOR_TOLERANCE = 24
        /* Marked, so the write itself can be told apart from the official one. */
        var MARK = 'data-eva-panel-centred'
        var disposed = false
        var owned = new Map()
        var candidates = []

        function release(panel) {
          var state = owned.get(panel)
          if (state !== undefined && panel.style.getPropertyValue('left') === state.written &&
              panel.style.getPropertyPriority('left') === '') {
            if (state.original === '') panel.style.removeProperty('left')
            else panel.style.setProperty('left', state.original, state.priority)
          }
          panel.removeAttribute(MARK)
          owned.delete(panel)
        }

        function isPanel(node) {
          if (node === null || node === undefined || node.nodeType !== 1) return false
          if (node.parentNode !== document.body) return false
          var role = node.getAttribute('role')
          if (role !== 'dialog' && role !== 'menu') return false
          /* Only boxes the placement owns: a static dialog keeps its own flow. */
          var view = window.getComputedStyle(node)
          if (view.position !== 'fixed') return false
          if (view.visibility === 'hidden' || view.display === 'none') return false
          /* The measure pass parks the panel at 0,0 with visibility:hidden; a zero
             width means it is not laid out yet and there is nothing to centre. */
          return node.getBoundingClientRect().width > 0
        }

        /* The trigger a panel belongs to. 'role="menu"' means the permission list, the
           one surface whose anchor is found by slot rather than by state; everything
           else takes the open aria-haspopup trigger nearest the panel's own edge, which
           is exactly what tells three adjacent pills apart. */
        function triggerFor(panel) {
          var box = panel.getBoundingClientRect()
          /* The permission list: a 'role="menu"' portal, whose anchor keeps no state
             attribute of its own, so every slot button is a candidate and the nearest
             one wins -- the composer can render more than one (the hero and the docked
             card are both real composers). */
          var scope = panel.getAttribute('role') === 'menu' ? PERMISSION_TRIGGER : OPEN_TRIGGER
          var all = document.querySelectorAll(scope)
          var best = null
          var bestGap = Infinity
          for (var i = 0; i < all.length; i += 1) {
            var rect = all[i].getBoundingClientRect()
            if (rect.width === 0 && rect.height === 0) continue
            var gap = box.top >= rect.bottom
              ? box.top - rect.bottom
              : (rect.top >= box.bottom ? rect.top - box.bottom : 0)
            if (gap < bestGap) { bestGap = gap; best = rect }
          }
          return bestGap > MAX_GAP ? null : best
        }

        /* Centred on the trigger, clamped into the viewport by the official margin.
           Written as a px 'left' on the same element, because that is the property the
           official placement writes; nothing else about the panel is touched, so its
           width, padding, row layout and line boxes stay the bundle's own. */
        function centre(panel) {
          if (disposed || !isPanel(panel)) return
          var trigger = triggerFor(panel)
          if (trigger === null) return
          var marked = owned.has(panel)
          /* Proof of ownership, and the reason the sidebar's 视图选项 menu is left where
             it is: the two components that lay these boxes out both write 'left' as the
             anchor's own left edge, so an unmarked panel whose left edge is not on its
             trigger was anchored to a different element and is none of our business. A
             marked panel is ours already and is skipped past the check -- after centring,
             its left is nowhere near the trigger by design. */
          if (!marked) {
            var written = parseFloat(panel.style.left)
            if (!isFinite(written)) return
            if (Math.abs(written - trigger.left) > ANCHOR_TOLERANCE) return
          }
          var view = window.innerWidth
          var width = panel.offsetWidth
          if (!width || !view) return
          var left = trigger.left + trigger.width / 2 - width / 2
          var highest = view - width - MARGIN
          if (left > highest) left = highest
          if (left < MARGIN) left = MARGIN
          left = Math.round(left)
          /* Our own write creates an attribute record; this early return is what keeps
             that record from cycling back through schedule(). */
          if (marked && panel.style.left === left + 'px') return
          var state = owned.get(panel)
          var current = panel.style.getPropertyValue('left')
          var priority = panel.style.getPropertyPriority('left')
          if (state === undefined || current !== state.written || priority !== '') {
            state = { original: current, priority: priority, written: '' }
            owned.set(panel, state)
          }
          state.written = left + 'px'
          panel.setAttribute(MARK, '')
          panel.style.setProperty('left', state.written)
        }

        function sweep() {
          if (disposed) return
          var panels = document.querySelectorAll(PANEL_SELECTOR)
          for (var i = 0; i < panels.length; i += 1) centre(panels[i])
        }

        var queued = false
        var frame = null
        var timer = null
        function schedule() {
          if (disposed || queued) return
          queued = true
          var run = function () {
            frame = null
            timer = null
            queued = false
            if (!disposed) sweep()
          }
          if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(run)
          else timer = setTimeout(run, 16)
        }

        var attributes = new MutationObserver(schedule)
        var resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
        function discover() {
          if (disposed) return
          var next = Array.from(document.body.children).filter(function (node) { return node.tagName === 'DIV' })
          owned.forEach(function (state, panel) { if (next.indexOf(panel) === -1) release(panel) })
          attributes.disconnect()
          if (resize !== null) resize.disconnect()
          candidates = next
          for (var i = 0; i < candidates.length; i += 1) {
            /* Direct portal candidates only. Never observe chat subtree style churn. */
            attributes.observe(candidates[i], { attributes: true, attributeFilter: ['style', 'role'] })
            if (resize !== null) resize.observe(candidates[i])
          }
        }
        var observer = new MutationObserver(function () { discover(); schedule() })
        observer.observe(document.body, { childList: true })
        discover()
        window.addEventListener('scroll', schedule, true)
        window.addEventListener('resize', schedule)
        sweep()

        return function () {
          disposed = true
          if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
          if (timer !== null) clearTimeout(timer)
          queued = false
          observer.disconnect()
          attributes.disconnect()
          if (resize !== null) resize.disconnect()
          candidates = []
          window.removeEventListener('scroll', schedule, true)
          window.removeEventListener('resize', schedule)
          owned.forEach(function (state, panel) { release(panel) })
        }
    }
