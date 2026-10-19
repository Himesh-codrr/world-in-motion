import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { EffectComposer, DepthOfField, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import SceneRig, { captionForTime, input, intro, TL } from './components/SceneRig'
import BigBang from './components/BigBang'
import PortfolioWorld from './components/PortfolioWorld'
import useRevealSections from './hooks/useRevealSections'

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="fallback"><div className="ring" /></div> : this.props.children
  }
}

function useMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const f = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return m
}

const CA_OFFSET = new THREE.Vector2(0.00045, 0.00045)

export default function App() {
  const scrollRef = useRef(null)
  // Keep the baseline renderer free of full-screen framebuffer passes. They were causing
  // one-frame canvas clears on the recorded hardware while the HTML layer stayed visible.
  const [postFx, setPostFx] = useState(false)
  const [introActive, setIntroActive] = useState(!intro.done)
  const mobile = useMobile()
  useRevealSections(scrollRef)
  useLayoutEffect(() => {
    const b = document.body
    let id
    const finish = () => {
      b.classList.remove('intro-on')
      b.dataset.cap = '-1'
      setIntroActive(false)
      clearInterval(id)
    }
    intro.onComplete = finish
    if (intro.done) { finish(); return () => { if (intro.onComplete === finish) intro.onComplete = null } }
    b.classList.add('intro-on')
    const update = () => {
      const t = intro.t
      b.dataset.cap = captionForTime(t)
      if (intro.done) finish()
    }
    update()
    id = setInterval(update, 50)
    return () => {
      clearInterval(id)
      if (intro.onComplete === finish) intro.onComplete = null
      b.classList.remove('intro-on'); b.dataset.cap = '-1'
    }
  }, [])
  const fx = !input.reduced

  return (
    <>
      <div className="stage">
        <Boundary>
          <Canvas shadows dpr={[1, mobile ? 1.15 : 1.25]} frameloop="always"
            camera={{ position: [0.2, 0.2, 10], fov: 34, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => { gl.setClearColor('#080B16', 1); gl.toneMappingExposure = 0.85 }}>
            <Suspense fallback={null}>
              <SceneRig scrollRef={scrollRef} onQuality={setPostFx} />
              <BigBang />
            </Suspense>
            <Suspense fallback={null}>
              <PortfolioWorld />
              {fx && postFx && !introActive ? (
                <EffectComposer multisampling={0} enableNormalPass={false}>
                  <DepthOfField focusDistance={7.5} focusRange={14} bokehScale={mobile ? 0.55 : 0.85} height={480} />
                  <Bloom luminanceThreshold={1.5} mipmapBlur intensity={0.28} radius={0.68} />
                  <ChromaticAberration offset={CA_OFFSET} radialModulation modulationOffset={0.2} />
                </EffectComposer>
              ) : null}
            </Suspense>
          </Canvas>
        </Boundary>
      </div>
      <Loader containerStyles={{ zIndex: 50 }} dataInterpolation={() => 'Loading the world'} />
      <div className="vignette" />
      <div className="intro-caps">
        <p className="c0">In the beginning, nothing.</p>
        <p className="c1">Then everything.</p>
         <p className="c2">Six worlds.</p>
      </div>
      <button className="skip" onClick={() => { if (!intro.done) intro.t = TL.END }}>Skip intro</button>

      <header className="chrome top">
        <span><i className="dot" />World in Motion</span>
        <nav>
          <a href="#academics">Academics</a><a href="#sports">Sports</a><a href="#civiceye">CivicEye</a><a href="#ai-agents">AI Agents</a><a href="#current-project">Current Project</a><a href="#contact">Contact</a>
        </nav>
      </header>

      <main className="scroll" ref={scrollRef}>
        <section className="scene right" id="academics">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--cyan)' }}>01 / Academics</p>
            <h2>NexHack 2.0 — Delhi</h2>
            <p>Hackathon work in Delhi, and the AgenticAI workshop.</p>
          </div>
        </section>
        <section className="scene" id="sports">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--coral)' }}>02 / Sports</p>
            <h2>District powerlifting champion</h2>
            <p>Form, discipline, repeat.</p>
          </div>
        </section>
        <section className="scene right" id="civiceye">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--lime)' }}>03 / Side hustle</p>
            <h2>CivicEye</h2>
            <p>An own project. <a href="https://civiceye.co.in" target="_blank" rel="noopener noreferrer">civiceye.co.in ↗</a></p>
          </div>
        </section>
        <section className="scene" id="ai-agents">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--violet)' }}>04 / AI agents built</p>
            <h2>AI-automated websites.</h2>
            <p>A growing set of intelligent products: <a href="https://agripulse-ai-ten.vercel.app/" target="_blank" rel="noopener noreferrer">Agripulse ↗</a>, <a href="https://civiceye.co.in" target="_blank" rel="noopener noreferrer">CivicEye ↗</a>, and <a href="https://metrik-steel.vercel.app/" target="_blank" rel="noopener noreferrer">MetrikAI ↗</a>.</p>
          </div>
        </section>
        <section className="scene right" id="current-project">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--gold)' }}>Current project</p>
            <h2>Building my own operating system.</h2>
            <p>Designing the foundations, tools, and workflows one layer at a time.</p>
          </div>
        </section>
        <section className="scene" id="contact">
          <div className="copy" data-reveal>
            <p className="eyebrow" style={{ color: 'var(--violet)' }}>Contact</p>
            <h2>Let’s build something precise.</h2>
            <p>Start with <a href="https://civiceye.co.in" target="_blank" rel="noopener noreferrer">CivicEye</a>.</p>
          </div>
        </section>
      </main>

      <footer className="chrome bottom"><span>World in Motion — A Frosted Glass Portfolio Observatory</span></footer>
    </>
  )
}
