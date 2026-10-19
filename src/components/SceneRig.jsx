import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

// Shared mutable input state (read in useFrame, never triggers renders).
export const input = {
  px: 0, py: 0, dragX: 0, dragY: 0, speed: 0, sd: 0,
  reduced: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}
export const scrollState = { value: 0, y: 0, limit: 1 }
const sceneListeners = new Set()
export const sceneState = { phase: 0, index: 0, from: 0, to: 1, local: 0 }
export const subscribeSceneState = (listener) => {
  sceneListeners.add(listener)
  return () => sceneListeners.delete(listener)
}

// Intro timeline (seconds): singularity -> BANG -> constellation -> DIVE toward the first star -> FLASH -> reveal -> END
export const TL = { BANG: 1.6, STAR: 5.2, DIVE: 5.6, FLASH: 7.4, END: 9.2 }
export const CAPTION_WINDOWS = [
  { cap: '0', start: 0, end: TL.BANG - 0.08 },
  { cap: '1', start: TL.BANG - 0.08, end: 3.9 },
  { cap: '2', start: 3.9, end: TL.FLASH - 0.2 },
]
export const captionForTime = (t) => CAPTION_WINDOWS.find(({ start, end }) => t >= start && t < end)?.cap ?? '-1'
const skipIntro = input.reduced || (typeof window !== 'undefined' && (window.scrollY > 10 || !!window.location.hash))
export const intro = { t: skipIntro ? TL.END : 0, done: skipIntro, onComplete: null }

// One camera "station" per portfolio chapter. Each full-screen chapter owns one scroll interval, so
// the camera, its star, its star-lane transition, and its copy share the same boundaries.
const STATIONS = [
  { c: [-1.6, 1.4, 6.6], l: [-2.2, 1.4, -0.4] },   // academics  - card left
  { c: [1.6, -0.6, 5.6], l: [2.3, -1.0, -1.5] },   // sports     - card right
  { c: [-1.4, -1.3, 3.0], l: [-2.0, -1.9, -3.8] }, // civiceye   - card left
  { c: [1.5, 1.1, 1.8], l: [2.3, 1.0, -1.3] },     // ai agents  - card right
  { c: [-1.2, -0.8, -1.8], l: [-1.8, -0.7, -2.6] }, // current    - card left
  { c: [1.0, 0.5, -6.2], l: [1.6, 0.3, -2.0] },    // contact    - behind the world, looking back
]
const VIA = { c: [3.6, 0.4, -2.2], l: [0.45, 0.3, -2.0] } // space lane between current and contact
export const SECTION_COUNT = STATIONS.length
export const SECTION_STARS = STATIONS.map(({ l }) => ({ position: l }))
const seq = [...STATIONS.slice(0, -1), VIA, STATIONS[STATIONS.length - 1]]
const mk = (key) => new THREE.CatmullRomCurve3(seq.map((s) => new THREE.Vector3(...s[key])), false, 'catmullrom', 0.55)
const { clamp, damp } = THREE.MathUtils
export const getScrollPhase = (value) => {
  const scrollValue = Number.isFinite(value) ? clamp(value, 0, 1) : 0
  const s = scrollValue * (SECTION_COUNT - 1)
  const from = Math.min(Math.floor(s), SECTION_COUNT - 2)
  const to = from + 1
  const local = clamp(s - from, 0, 1)
  const e = local * local * (3 - 2 * local)
  const sd = from + e
  const pivot = SECTION_COUNT - 2
  const u = sd <= pivot ? sd / SECTION_COUNT : (pivot + (sd - pivot) * 2) / SECTION_COUNT
  const index = scrollValue >= 1 ? SECTION_COUNT - 1 : Math.max(0, from)
  return { sd, u, index, from, to, local: e }
}

export default function SceneRig({ scrollRef, onQuality }) {
  const { camera, gl, size } = useThree()
  const setDpr = useThree((s) => s.setDpr)
  const camCurve = useMemo(() => mk('c'), [])
  const lookCurve = useMemo(() => mk('l'), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const lookNow = useMemo(() => new THREE.Vector3(...STATIONS[0].l), [])
  const baseFov = useRef(34)
  const lenisRef = useRef(null)
  const st = useRef({ sd: 0, roll: 0, index: -1, n: 0, sum: 0, hi: 0, good: 0, low: false })

  useEffect(() => { baseFov.current = size.width < 768 ? 39 : size.width < 1100 ? 36 : 34 }, [size.width])

  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: input.reduced ? 1 : 0.1, smoothWheel: !input.reduced, syncTouch: true })
    let pendingHash = null
    const scrollToHash = (hash, immediate = false) => {
      const targetEl = document.querySelector(hash)
      if (!targetEl) return
      lenis.scrollTo(targetEl, { immediate, offset: 0 })
      history.replaceState(null, '', hash)
    }
    const requestHash = (hash) => {
      if (!hash || hash === '#') return
      if (!intro.done) { pendingHash = hash; intro.t = TL.END; return }
      scrollToHash(hash)
    }
    const onAnchorClick = (event) => {
      const link = event.target?.closest?.('a[href^="#"]')
      if (!link) return
      const hash = link.getAttribute('href')
      if (!hash || !document.querySelector(hash)) return
      event.preventDefault()
      requestHash(hash)
    }
    const onLocationChange = () => { if (window.location.hash) requestHash(window.location.hash) }
    const onScroll = ({ scroll, limit }) => {
      const y = Number.isFinite(scroll) ? scroll : 0
      const max = Number.isFinite(limit) ? limit : (Number.isFinite(lenis.limit) ? lenis.limit : 0)
      scrollState.y = y
      scrollState.limit = Math.max(1, max)
      scrollState.value = clamp(y / scrollState.limit, 0, 1)
      ScrollTrigger.update()
    }
    lenis.on('scroll', onScroll)
    lenisRef.current = lenis
    if (!intro.done) lenis.stop() // no scrolling during the intro
    const tick = (t) => {
      lenis.raf(t * 1000)
      if (pendingHash && intro.done) { const hash = pendingHash; pendingHash = null; scrollToHash(hash) }
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    const refreshId = requestAnimationFrame(() => {
      lenis.resize?.()
      onScroll({ scroll: lenis.scroll, limit: lenis.limit })
      ScrollTrigger.refresh()
    })
    const refresh = () => { lenis.resize?.(); ScrollTrigger.refresh() }
    window.addEventListener('click', onAnchorClick)
    window.addEventListener('hashchange', onLocationChange)
    window.addEventListener('popstate', onLocationChange)
    window.addEventListener('resize', refresh)
    window.visualViewport?.addEventListener('resize', refresh)
    const initialHashId = requestAnimationFrame(() => { if (window.location.hash) scrollToHash(window.location.hash, true) })
    return () => {
      cancelAnimationFrame(refreshId)
      cancelAnimationFrame(initialHashId)
      window.removeEventListener('click', onAnchorClick)
      window.removeEventListener('hashchange', onLocationChange)
      window.removeEventListener('popstate', onLocationChange)
      window.removeEventListener('resize', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
      lenis.off?.('scroll', onScroll)
      gsap.ticker.remove(tick); lenis.destroy()
    }
  }, [scrollRef])

  useEffect(() => {
    const el = gl.domElement
    let drag = false, lx = 0, ly = 0
    const move = (e) => { input.px = (e.clientX / window.innerWidth - 0.5) * 2; input.py = (e.clientY / window.innerHeight - 0.5) * 2 }
    const down = (e) => { drag = true; lx = e.clientX; ly = e.clientY }
    const dragMove = (e) => {
      if (!drag) return
      input.dragY = clamp(input.dragY + (e.clientX - lx) * 0.005, -0.5, 0.5)
      input.dragX = clamp(input.dragX + (e.clientY - ly) * 0.005, -0.3, 0.3)
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { drag = false }
    window.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', dragMove)
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); window.addEventListener('blur', up)
    return () => {
      window.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', dragMove)
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('blur', up)
    }
  }, [gl])

  useFrame((_, delta) => {
    const m = st.current
    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 1 / 60
    m.sum += dt
    if (++m.n === 30) {
      const avg = m.sum / 30
      m.sum = 0; m.n = 0
      if (avg > 0.018 && !m.low) { m.low = true; setDpr(1); onQuality?.(false) }
    }
    if (!intro.done) {
      intro.t += dt
      const t = intro.t
      if (t >= TL.END) {
        intro.done = true
        lenisRef.current?.start()
        intro.onComplete?.()
      }
      else if (t < TL.FLASH) {
        // scripted camera: slow push-in, bang shake, then the dive into the star
        const dive = clamp((t - TL.DIVE) / (TL.FLASH - TL.DIVE), 0, 1), d3 = dive * dive * dive
        const push = clamp(t / TL.STAR, 0, 1)
        const preBangShake = (t / TL.BANG) * 0.05
        const bangIn = clamp((t - TL.BANG) / 0.18, 0, 1)
        const bangEnvelope = bangIn * bangIn * (3 - 2 * bangIn) * Math.exp(-(t - TL.BANG) * 2.2)
        const shake = preBangShake + bangEnvelope * 0.34 + d3 * 0.15
        camera.position.set(
          0.2 + 0.25 * dive + Math.sin(t * 47) * shake,
          0.2 + 0.1 * dive + Math.sin(t * 61 + 1) * shake,
          10 - 2.8 * (1 - Math.pow(1 - push, 3)) - d3 * 8.4
        )
        lookNow.set(...SECTION_STARS[0].position)
        camera.lookAt(lookNow)
        m.roll = d3 * 0.9
        camera.rotateZ(m.roll)
        camera.fov = baseFov.current + d3 * 30
        camera.updateProjectionMatrix()
        return
      }
    }
    // The camera, HTML reveal hook, section stars, and star lane all consume this same mapped phase.
    const { sd, u, index, from, to, local } = getScrollPhase(scrollState.value)
    if (!Number.isFinite(scrollState.value)) scrollState.value = 0
    sceneState.phase = sd
    sceneState.from = from
    sceneState.to = to
    sceneState.local = local
    if (sceneState.index !== index) {
      sceneState.index = index
      sceneListeners.forEach((listener) => listener(index))
    }
    camCurve.getPoint(u, target)
    lookCurve.getPoint(u, lookTarget)

    // travel speed drives FOV kick, camera roll and spin on the sculpture
    const raw = Math.abs(sd - m.sd) / Math.max(dt, 0.001)
    m.sd = sd
    input.sd = sd
    const speed = Number.isFinite(input.speed) ? input.speed : 0
    input.speed = input.reduced ? 0 : damp(speed, clamp(raw / 2, 0, 1), 4, dt)

    const px = Number.isFinite(input.px) ? input.px : 0
    const py = Number.isFinite(input.py) ? input.py : 0
    target.x += px * 0.42 + input.dragY
    target.y += -py * 0.28 + input.dragX
    const rev = clamp((intro.t - TL.FLASH) / (TL.END - TL.FLASH), 0, 1) // slow, cinematic pull-back out of the star
    const kPos = input.reduced ? 1 : 1 - Math.exp(-dt * (42 + 12 * rev))
    const kLook = input.reduced ? 1 : 1 - Math.exp(-dt * 42)
    const lat = clamp((target.x - camera.position.x) * -0.05, -0.15, 0.15)
    m.roll = damp(m.roll, input.reduced ? 0 : lat, 8, dt)
    camera.position.lerp(target, kPos)
    lookNow.lerp(lookTarget, kLook)
    camera.lookAt(lookNow)
    camera.rotateZ(m.roll)
    camera.fov = damp(camera.fov, baseFov.current + input.speed * 14, 4, dt)
    camera.updateProjectionMatrix()

  })

  return null
}
