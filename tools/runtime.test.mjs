import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { effortFixture } from './effort-fixture.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = path => readFileSync(join(root, path), 'utf8')
// Execute production closures, not reimplementations. Moving a closure requires an
// explicit fixture update; missing boundaries fail rather than silently testing a fake.
function clientSource() {
  return ['src/client.js', ...['glass', 'pins', 'panels'].map(n => `src/runtime/${n}.js`)]
    .filter(p => existsSync(join(root, p))).map(read).join('\n')
}
function between(source, start, end) {
  const a = source.indexOf(start)
  const b = source.indexOf(end, a + start.length)
  assert.ok(a >= 0 && b > a, `production boundaries: ${start} / ${end}`)
  return source.slice(a, b)
}
function mountEffect(label, bindings) {
  const effects = new Map()
  const context = { get: () => ({}), inject() {}, effect(fn, name) { effects.set(name, fn) } }
  const exports = vm.runInNewContext(`(function () { var module = {exports:{}}; var exports = module.exports; ${clientSource()} })()`, {
    PLUGIN_ID: 'eva-inspired-theme', TOKENS: {}, MANIFEST: {},
    applySessionEvaStatus() {}, ...bindings,
  })
  exports.apply(context)
  assert.ok(effects.has(label), label)
  return effects.get(label)()
}
test('S10: built artifact registers one loader with unchanged public exports', () => {
  const registrations=[]
  vm.runInNewContext(read('client.js'), {window:{__ModuleLoader__:{load:value=>registrations.push(value)}}})
  assert.equal(registrations.length,1)
  assert.equal(registrations[0].id,'eva-inspired-theme')
  const exported=registrations[0].factory(name=>{throw Error('unexpected eager require: '+name)})
  assert.equal(exported.name,'eva-inspired-theme')
  assert.equal(typeof exported.apply,'function')
  assert.deepEqual(Array.from(exported.inject),['theme','remote','locale','uiSession','sessions','workspaces'])
})

test('S4: glass cancels queued scan and rejects late observer delivery after disposal', () => {
  let callback, frame, cancelled=0, queries=0, removed=0, disconnected=0
  const element=()=>({setAttribute(){},appendChild(){},remove(){removed++}})
  const context={document:{body:{appendChild(){}},createElementNS:element,querySelectorAll(){queries++;return []}},
    window:{requestAnimationFrame(fn){frame=fn;return 1},cancelAnimationFrame(){cancelled++}},
    MutationObserver:class{constructor(fn){callback=fn}observe(){}disconnect(){disconnected++}},
    ResizeObserver:class{observe(){throw Error('observe after disposal')}disconnect(){disconnected++}}}
  const dispose=vm.runInNewContext(read('src/runtime/glass.js')+'\nmountLiquidGlass()',context)
  const records=[{addedNodes:[{matches:()=>true}],removedNodes:[]}]
  assert.equal(queries,2)
  callback(records)
  const late=frame
  dispose();assert.equal(cancelled,1);assert.equal(removed,1);assert.equal(disconnected,2)
  late();callback(records)
  assert.equal(queries,2)
})

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve() }
function clocks() {
  const timers = new Map()
  let next = 1
  return {
    timers,
    setTimeout(fn) { const id = next++; timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
    fire() { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()) },
  }
}

function panelFixture(useFrame = true) {
  const clock = clocks(), frames = clocks(), observers = []
  const listeners = new Map()
  const body = { children: [] }
  const trigger = { getBoundingClientRect: () => ({ left: 100, width: 80, top: 200, bottom: 220, height: 20 }) }
  const attrs = new Map([['role', 'dialog']])
  const panel = {
    nodeType: 1, tagName: 'DIV', parentNode: body, parentElement: body, isConnected: true,
    style: { left: '100px', getPropertyValue(n) { return this[n] || '' }, getPropertyPriority() { return '' }, setProperty(n, v) { this[n] = v }, removeProperty(n) { delete this[n] } }, offsetWidth: 200,
    getAttribute: n => attrs.get(n) ?? null, hasAttribute: n => attrs.has(n),
    setAttribute: (n, v) => attrs.set(n, v), removeAttribute: n => attrs.delete(n),
    getBoundingClientRect: () => ({ width: panel.offsetWidth, top: 160, bottom: 190, left: parseFloat(panel.style.left), height: 30 }),
  }
  body.children.push(panel)
  const document = { body, querySelectorAll(selector) { return selector.includes('aria-expanded') ? [trigger] : selector.includes('permission') ? [] : [panel] } }
  class Observer {
    constructor(fn) { this.fn = fn; this.targets = new Map(); observers.push(this) }
    observe(target, options) { this.targets.set(target, options) }
    disconnect() { this.targets.clear() }
    emit(record) {
      if ([...this.targets].some(([target, o]) =>
        (record.target === target || o.subtree && record.target.parentNode === target) &&
        (record.type === 'attributes' ? o.attributes && (!o.attributeFilter || o.attributeFilter.includes(record.attributeName)) : o.childList))) this.fn([record])
    }
  }
  const window = { innerWidth: 600, getComputedStyle: () => ({position:'fixed'}),
    addEventListener: (n, fn) => listeners.set(n, fn), removeEventListener: n => listeners.delete(n) }
  if (useFrame) { window.requestAnimationFrame = frames.setTimeout; window.cancelAnimationFrame = frames.clearTimeout }
  const dispose = mountEffect('evangelion: centred panels', { document, window, MutationObserver: Observer,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    requestAnimationFrame: useFrame ? frames.setTimeout : undefined,
    cancelAnimationFrame: useFrame ? frames.clearTimeout : undefined })
  clock.fire() // deferEffect initialization
  return {panel, body, dispose, frames, clock, observers, listeners, emit(record) { observers.forEach(o => o.emit(record)) }}
}

test('S4: direct panel attributes schedule correction; disposal restores owned left', () => {
  const f = panelFixture()
  assert.equal(f.panel.style.left, '40px')
  f.panel.style.left = '105px'
  f.emit({ type: 'attributes', target: f.panel, attributeName: 'style' })
  f.frames.fire()
  assert.equal(f.panel.style.left, '40px')
  f.dispose()
  assert.equal(f.panel.style.left, '105px')
  assert.equal(f.panel.hasAttribute('data-eva-panel-centred'), false)
  assert.equal(f.observers.every(o => o.targets.size === 0), true)
})

for (const frame of [true, false]) test(`S4: disposal cancels queued ${frame ? 'frame' : 'timer'} and respects host writes`, () => {
  const f = panelFixture(frame)
  f.listeners.get('resize')()
  f.panel.style.left = '177px'
  f.dispose()
  f.frames.fire(); f.clock.fire()
  assert.equal(f.panel.style.left, '177px')
  assert.equal(f.panel.hasAttribute('data-eva-panel-centred'), false)
  assert.equal(f.frames.timers.size + f.clock.timers.size, 0)
})

test('S2: queued workspace moves cannot start after disposal', async () => {
  let release
  const first = new Promise(resolve => { release = resolve })
  const sent = []
  const api = vm.runInNewContext(`var disposed = false; ${between(clientSource(), '        function step(id, beforeId)', '        /* Walk the pinned ids')}; ({step, dispose() { disposed = true }})`, {
    workspaces: { insertBefore(id) { sent.push(id); return first } },
  })
  let chain = Promise.resolve()
  for (const id of ['one', 'two', 'three']) chain = chain.then(api.step(id))
  await flush()
  assert.deepEqual(sent, ['one'])
  api.dispose(); release(); await chain
  assert.deepEqual(sent, ['one'])
})

test('S5: keyboard group action retains raw provider ID', () => {
  const source = read('src/model-effort-picker.js')
  const code = between(source.slice(source.indexOf('  function createModelSelect(')), '    function onKey(event)', '    searchInput.addEventListener')
  for (const id of ['a.b', 'a/b', '中文', 'a_b', 'x'.repeat(500)]) {
    let toggled
    const node = { getAttribute: () => 'slug-collision', evaGroupId: id }
    vm.runInNewContext(`${code}; onKey({key:'ArrowLeft', target:node, preventDefault(){}})`, {
      node, toggleGroup(value) { toggled = value },
    })
    assert.equal(toggled, id)
  }
})

test('S5/S8: identical effort notifications keep nodes and pending updates in place', () => {
  const f = effortFixture(), rows = f.rows()
  rows[1].focus()
  for (let i = 0; i < 1000; i++) f.instance.sync()
  assert.deepEqual(f.rows(), rows)
  assert.equal(f.counts().created, 2)
  assert.equal(f.document.activeElement, rows[1])
  f.state().pending = true; f.instance.sync()
  assert.equal(f.rows()[0].disabled, true)
  assert.equal(f.rows()[1], rows[1])
  f.state().pending = false; f.instance.sync()
  assert.equal(rows[0].disabled, false)
  assert.equal(f.counts().placements, 0)
})

test('S5/S8: changed effort content repositions once, including empty and translation', () => {
  const f = effortFixture()
  f.instance.open = true
  f.rows()[1].focus()
  f.state().current.reasoningEffort = 'high'; f.instance.sync()
  assert.equal(f.rows()[1].getAttribute('aria-checked'), 'true')
  assert.equal(f.document.activeElement, f.rows()[1])
  assert.equal(f.counts().placements, 1)
  f.language('zh'); f.instance.sync()
  assert.equal(f.counts().placements, 2)
  f.setState({current:null,groups:[],pending:false}); f.instance.sync()
  assert.equal(f.rows().length, 0)
  assert.equal(f.counts().placements, 3)
  assert.equal(f.instance.paint(), false)
  f.instance.destroyed=true; f.instance.sync()
  assert.equal(f.counts().placements, 3)
})

test('S6: pin and status fallback admit outside mutations until scoped rows return', () => {
  const source = clientSource()
  const pin = between(source, '        function touches(records)', '        /* Only the row key')
  const status = between(read('build/session-eva-status.js'), '      function touches(records)', '      const observer =')
  for (const code of [pin, status]) {
    const api = vm.runInNewContext(`var scopeHost = {isConnected:true, contains(){return false}}, scopeMissed = true;
      ${code}; ({touches, scoped() {scopeMissed = false}})`)
    const records = [{ target: {}, addedNodes: [], removedNodes: [] }]
    assert.equal(api.touches(records), true)
    api.scoped(); assert.equal(api.touches(records), false)
  }
})

/* The boot mask's one-shot rule. The user's requirement (2026-10-21): the mask plays
   once per DSH process -- quitting and reopening DSH replays it, a reload inside one
   running instance does not. That is exactly sessionStorage's lifetime: it survives a
   reload of the same window and dies with it. The previous rule keyed the same mark
   into localStorage, so "once per build" meant "once ever" and the mask simply stopped
   appearing; every refresh looked like a missing animation. These three cases pin the
   new rule and the storage that implements it, driving the real mountBootScreen. */
function bootFixture({ session = new Map(), local = new Map(), search = '' } = {}) {
  const makeEl = () => {
    const el = {
      style: { setProperty() {} }, attrs: {}, children: [], parentNode: null, textContent: '',
      setAttribute(k, v) { el.attrs[k] = String(v) },
      getAttribute(k) { return el.attrs[k] ?? null },
      appendChild(c) { el.children.push(c); c.parentNode = el; return c },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); c.parentNode = null; return c },
      querySelector: () => makeEl(),
    }
    return el
  }
  const body = makeEl()
  const storage = (map) => ({
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
    removeItem: k => { map.delete(k) },
  })
  const context = {
    PLUGIN_ID: 'eva-inspired-theme',
    document: {
      body,
      querySelector: sel => (sel.indexOf('style[data-plugin-css=') === 0 ? makeEl() : null),
      createElement: makeEl,
    },
    window: {
      localStorage: storage(local),
      sessionStorage: storage(session),
      matchMedia: () => ({ matches: false }),
      setTimeout: () => 1,
      setItem: () => {},
    },
    location: { search },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setInterval: () => 1,
    clearInterval() {},
  }
  const mount = vm.runInNewContext(
    `${read('src/boot-screen.js')}\nmountBootScreen`, context)
  const masks = () => body.children.filter(c => c.attrs['data-eva-boot'] !== undefined).length
  return { mount, masks, session, local }
}

test('S11: the boot mask plays once per run and replays only after DSH restarts', () => {
  const seenKey = 'eva-inspired-theme/boot/seen'
  const mark = 'eva-boot/@BUILD@'

  const first = bootFixture()
  first.mount()
  assert.equal(first.masks(), 1, 'a fresh run must play the mask')
  assert.equal(first.session.get(seenKey), '1', 'the run mark must be recorded in sessionStorage')
  assert.equal(first.local.has(seenKey), false, 'the run mark must not be written to localStorage')

  // A reload inside the same run: same sessionStorage, a brand-new document.
  const reload = bootFixture({ session: first.session })
  reload.mount()
  assert.equal(reload.masks(), 0, 'a reload inside one run must not replay the mask')

  // ?boot=1 still forces one replay inside a run, without touching the record.
  const forced = bootFixture({ session: first.session, search: '?boot=1' })
  forced.mount()
  assert.equal(forced.masks(), 1, '?boot=1 must force a replay')

  // A stale mark left by the old localStorage rule must not suppress the mask:
  // the leftover key from before this change is what made the animation vanish.
  const stale = bootFixture({ local: new Map([[seenKey, mark]]) })
  stale.mount()
  assert.equal(stale.masks(), 1, 'an old localStorage mark must not suppress the mask')
})

