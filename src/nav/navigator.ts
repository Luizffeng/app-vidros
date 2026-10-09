import { ancestors, formatRoute, parentOf, parseRoute, sameScreen, type Route } from './routes'

/** Screen enter direction (spec 004 `data-nav`). */
export type Nav = 'forward' | 'back' | 'fade'
export type RouteSnapshot = { route: Route; nav: Nav | null }

type Entry = { app: typeof APP; idx: number; layer?: true }
type Layer = { onBack: () => void; done: boolean; pushed: boolean }
type Guard = { message: string }

const APP = 'app-vidros'
const STACK_KEY = 'app-vidros:nav-stack'

let ready = false
let idx = 0
/** Path of each app history entry by index (overlay entries repeat the screen path). */
let stack: string[] = []
let snapshot: RouteSnapshot = { route: { screen: 'home' }, nav: null }
let layers: Layer[] = []
/** popstate events caused by the app itself (overlay closed by UI, jumps); they change nothing. */
let pendingPops = 0
let queue: (() => void)[] = []
const guards = new Set<Guard>()
const listeners = new Set<() => void>()

const entry = (i: number, layer = false): Entry => (layer ? { app: APP, idx: i, layer: true } : { app: APP, idx: i })
const currentPath = () => formatRoute(parseRoute(location.pathname, location.search))

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

function saveStack() {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(0, idx + 1)))
  } catch {
    // private mode / quota: only the arrow fallback gets worse
  }
}

function emit(next: RouteSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

/** Runs now, or after the app's own pending history.back()/go() lands. */
function run(task: () => void) {
  if (pendingPops > 0) queue.push(task)
  else task()
}

function flush() {
  while (pendingPops === 0 && queue.length > 0) queue.shift()!()
}

function expectPop(go: number) {
  pendingPops += 1
  history.go(go)
}

/** Overlays still open when the screen changes lose their entries in one jump. */
function dropLayers(then: () => void) {
  const pushed = layers.filter((l) => l.pushed).length
  for (const layer of layers) layer.done = true
  layers = []
  if (pushed === 0) return then()
  queue.unshift(then)
  expectPop(-pushed)
}

function confirmLeave(): boolean {
  const guard = guards.values().next().value
  return !guard || window.confirm(guard.message)
}

function pushScreen(route: Route, nav: Nav) {
  idx += 1
  const path = formatRoute(route)
  history.pushState(entry(idx), '', path)
  stack[idx] = path
  stack.length = idx + 1
  saveStack()
  emit({ route, nav })
}

/** A tab/filter replaced while an overlay was open wrote the overlay's entry; copy it down. */
function syncScreenUrl() {
  const path = formatRoute(snapshot.route)
  if (path === currentPath() || !sameScreen(parseRoute(location.pathname, location.search), snapshot.route)) return
  history.replaceState(history.state, '', path)
  stack[idx] = path
  saveStack()
}

function onPop(event: PopStateEvent) {
  const state = event.state as Entry | null
  const nextIdx = state?.app === APP ? state.idx : 0
  if (pendingPops > 0) {
    pendingPops -= 1
    idx = nextIdx
    syncScreenUrl()
    flush()
    return
  }
  if (nextIdx < idx && layers.length > 0) {
    const layer = layers.pop()!
    layer.done = true
    idx = nextIdx
    syncScreenUrl()
    layer.onBack()
    return
  }
  const route = parseRoute(location.pathname, location.search)
  if (!sameScreen(route, snapshot.route) && !confirmLeave()) {
    expectPop(idx - nextIdx)
    return
  }
  const nav: Nav = nextIdx < idx ? 'back' : 'forward'
  idx = nextIdx
  stack[idx] = formatRoute(route)
  saveStack()
  emit({ route, nav })
}

/**
 * Boot: a reload keeps its entries; a fresh open on a deep URL gets its parent
 * screens below it, so back walks up to Início and only then leaves the app.
 */
function init() {
  if (ready) return
  ready = true
  history.scrollRestoration = 'manual'
  const route = parseRoute(location.pathname, location.search)
  const path = formatRoute(route)
  const state = history.state as Entry | null
  if (state?.app === APP) {
    idx = state.idx
    stack = readStack().slice(0, idx)
    stack[idx] = path
    history.replaceState(entry(idx), '', path)
  } else {
    const chain = [...ancestors(route), route].map(formatRoute)
    idx = 0
    stack = [chain[0]]
    history.replaceState(entry(0), '', chain[0])
    for (const step of chain.slice(1)) {
      idx += 1
      stack[idx] = step
      history.pushState(entry(idx), '', step)
    }
  }
  saveStack()
  snapshot = { route, nav: null }
  window.addEventListener('popstate', onPop)
}

export function getRoute(): RouteSnapshot {
  init()
  return snapshot
}

export function subscribe(listener: () => void): () => void {
  init()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** New screen on top of the current one. */
export function push(route: Route, nav: Nav = 'forward') {
  run(() => {
    if (!sameScreen(route, snapshot.route) && !confirmLeave()) return
    dropLayers(() => pushScreen(route, nav))
  })
}

/** Same history step, new URL: tabs, filters, redirects. */
export function replace(route: Route, nav: Nav | null = null) {
  run(() => {
    const path = formatRoute(route)
    if (path === currentPath() && sameScreen(route, snapshot.route) && !nav) return
    history.replaceState(history.state ?? entry(idx), '', path)
    stack[idx] = path
    saveStack()
    emit({ route, nav })
  })
}

/** Top-level section (menu, home tiles): drops the path down to Início first. */
export function goTop(route: Route, nav: Nav = 'fade') {
  run(() => {
    if (sameScreen(route, snapshot.route)) return replace(route)
    if (!confirmLeave()) return
    dropLayers(() => {
      const land = () => {
        if (stack[0] !== '/') {
          history.replaceState(entry(0), '', '/')
          stack[0] = '/'
        }
        if (route.screen === 'home') {
          saveStack()
          emit({ route, nav })
        } else pushScreen(route, nav)
      }
      if (idx === 0) return land()
      queue.unshift(land)
      expectPop(-idx)
    })
  })
}

/** Header back arrow: same as the device back; without app history, the parent screen. */
export function up() {
  run(() => {
    if (idx > 0) {
      history.back()
      return
    }
    const parent = parentOf(snapshot.route)
    if (parent && confirmLeave()) replace(parent, 'back')
  })
}

/** One history entry for an open overlay; device back calls `onBack`. */
export function pushLayer(onBack: () => void): (fromUi: boolean) => void {
  const layer: Layer = { onBack, done: false, pushed: false }
  layers.push(layer)
  run(() => {
    if (layer.done) return
    idx += 1
    history.pushState(entry(idx, true), '', stack[idx - 1] ?? currentPath())
    stack[idx] = stack[idx - 1] ?? currentPath()
    layer.pushed = true
  })
  return (fromUi) => {
    if (layer.done) return
    layer.done = true
    layers = layers.filter((l) => l !== layer)
    if (!fromUi) return
    run(() => {
      if (layer.pushed) expectPop(-1)
    })
  }
}

export function addGuard(message: string): () => void {
  const guard: Guard = { message }
  guards.add(guard)
  return () => guards.delete(guard)
}
