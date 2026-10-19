import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const url = (p) => new URL(p, import.meta.url)
const read = (p) => readFileSync(url(p), 'utf8')

describe('component structure', () => {
  for (const f of ['App.jsx', 'main.jsx', 'input.css', 'components/FloatingCard.jsx', 'components/PortfolioWorld.jsx', 'components/SceneRig.jsx', 'hooks/useRevealSections.js'])
    it(f, () => expect(existsSync(url('./' + f))).toBe(true))
})

describe('required systems', () => {
  it('camera path, GSAP and Lenis', () => {
    const rig = read('./components/SceneRig.jsx')
    for (const s of ['CatmullRomCurve3', 'ScrollTrigger', 'Lenis', 'scrollState.value', 'pointercancel']) expect(rig).toContain(s)
  })
  it('pointer-driven lights and fog', () => {
    const w = read('./components/PortfolioWorld.jsx')
    for (const s of ['pointLight', 'directionalLight', 'fogExp2', 'Environment']) expect(w).toContain(s)
    expect(w).toMatch(/const \{ px, py \} = input/)
  })
  it('post-processing and error boundary', () => {
    const a = read('./App.jsx')
    for (const s of ['EffectComposer', 'Bloom', 'DepthOfField', 'ChromaticAberration', 'Suspense', 'getDerivedStateFromError']) expect(a).toContain(s)
  })
  it('scroll rendering safeguards', () => {
    const a = read('./App.jsx')
    const rig = read('./components/SceneRig.jsx')
    const world = read('./components/PortfolioWorld.jsx')
    expect(a).toContain('focusRange={14}')
    expect(rig).toContain('scrollState.value = clamp(y / scrollState.limit, 0, 1)')
    expect(rig).toContain('Number.isFinite(scrollState.value)')
    expect(rig).toContain('getScrollPhase')
    expect(rig).toContain('sceneState.phase = sd')
    expect(world).toContain('clamp(camera.position.z - 10, -5, 0)')
  })
  it('uses the same mapped phase for HTML reveals', () => {
    const hook = read('./hooks/useRevealSections.js')
    expect(hook).toContain("sceneState, subscribeSceneState")
    expect(hook).toContain('return subscribeSceneState(update)')
    expect(hook).toContain('index === activeIndex')
  })
  it('includes the new AI and current-project chapters', () => {
    const a = read('./App.jsx')
    const world = read('./components/PortfolioWorld.jsx')
    for (const s of ['ai-agents', 'current-project', 'Agripulse', 'CivicEye', 'MetrikAI', 'operating system']) expect(a).toContain(s)
    for (const s of ['id: \'ai-agents\'', 'id: \'current-project\'', 'SECTION_COUNT']) expect(world).toContain(s)
  })
  it('uses section stars and a phase-driven space transition', () => {
    const rig = read('./components/SceneRig.jsx')
    const world = read('./components/PortfolioWorld.jsx')
    expect(rig).toContain('SECTION_STARS')
    expect(rig).toContain('sceneState.local')
    for (const s of ['starNodes', 'warpPositions', 'warpPoints.current.geometry.attributes.position.needsUpdate', 'WARP_PARTICLES', 'Six worlds.']) {
      expect(world + read('./App.jsx')).toContain(s)
    }
  })
})
