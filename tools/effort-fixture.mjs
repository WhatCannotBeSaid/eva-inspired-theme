import vm from 'node:vm'
import { readFileSync } from 'node:fs'

// Minimal DOM-operation fixture, NOT a layout engine or host-performance proxy.
// Executes the entire production effort constructor; counts actual option creation.
export function effortFixture() {
  let created = 0, placements = 0, clears = 0, lang = 'en'
  let state = { current: {provider:'p', model:'m', reasoningEffort:'low'}, pending:false,
    groups:[{id:'p', models:[{id:'m', reasoning:{defaultEffort:'low', efforts:[{id:'low',name:'Low'},{id:'high',name:'High'}]}}]}] }
  const document = {activeElement:null}
  function node() {
    const attrs = new Map(), events = new Map()
    let text = ''
    return { children:[], tabIndex:-1, disabled:false, scrollTop:0,
      get textContent() {return text}, set textContent(v) {text=v; this.children=[]; clears++},
      setAttribute(n,v) {attrs.set(n,v)}, getAttribute(n) {return attrs.get(n) ?? null},
      appendChild(child) {child.parentElement=this; this.children.push(child); return child},
      addEventListener(n,fn) {events.set(n,fn)}, click() {events.get('click')?.()},
      focus() {document.activeElement=this},
      contains(el) {return el===this || this.children.some(c=>c.contains(el))},
      querySelector(selector) {const key=selector.match(/data-eva-mep-effort="([^"]+)"/)?.[1]; return this.children.flatMap(c=>[c,...c.children]).find(c=>c.getAttribute('data-eva-mep-effort')===key) || null},
    }
  }
  const shell = {anchor:node(),trigger:node(),value:node(),panel:node(),pop:node()}
  const source = readFileSync(new URL('../src/model-effort-picker.js', import.meta.url), 'utf8')
  const start = source.indexOf('  function createEffortSelect('), end = source.indexOf('  function createPair(', start)
  if(start<0 || end<0) throw Error('missing effort constructor')
  const create = vm.runInNewContext(source.slice(start,end)+'; createEffortSelect', {
    document, makeT:()=>key=>lang+':'+key,
    createShell:()=>shell,
    h(tag, cls, label) {if(cls==='eva-mep__option') created++; const n=node(); if(label)n.textContent=label; return n},
    attachCommon(instance) {instance.snapshot=()=>state; instance.place=()=>{placements++}; instance.setOpen=value=>{instance.open=value}},
    icon:()=>node(), PATH_CHECK:'check', slug:key=>key.replace(/[^a-z0-9]/g,'_'),
    rove(rows, active) {rows.forEach(r=>{r.tabIndex=r===active?0:-1}); active.focus()},
  })
  const instance = create({select(){}})
  return {instance, shell, document, counts:()=>({created,placements,clears}),
    state:()=>state, setState(next){state=next}, language(next){lang=next},
    rows:()=>shell.panel.children[0].children.filter(r=>r.getAttribute('role')==='menuitemradio') }
}
