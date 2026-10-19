import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Float } from '@react-three/drei'
import * as THREE from 'three'
import FloatingCard, { GLASS } from './FloatingCard'
import { input, intro, sceneState, SECTION_COUNT, SECTION_STARS, TL } from './SceneRig'

const { damp, clamp } = THREE.MathUtils
const eob = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2) // ease-out-back

const CARDS = [
  { id: 'academics', position: [-3.4, 1.6, -0.4], mobile: [-2.1, 1.45, -0.2], accent: '#8AFFF0', eyebrow: '01 / ACADEMICS', title: 'NEXHACK 2.0', detail: 'HACKATHON / DELHI · AGENTICAI WORKSHOP' },
  { id: 'sports', position: [3.55, -1.35, -1.5], mobile: [2.1, -1.15, -1.4], accent: '#FF7655', eyebrow: '02 / SPORTS', title: 'DISTRICT CHAMPION', detail: 'POWERLIFTING · FORM / DISCIPLINE / REPEAT' },
  { id: 'civiceye', position: [-3.15, -2.2, -3.8], mobile: [-1.8, -2.0, -3.4], accent: '#D5FF6C', eyebrow: '03 / SIDE HUSTLE', title: 'CIVICEYE', detail: 'OWN PROJECT · CIVICEYE.CO.IN ↗', url: 'https://civiceye.co.in' },
  { id: 'ai-agents', position: [3.25, 1.55, -1.5], mobile: [2.05, 1.35, -1.5], accent: '#A991FF', eyebrow: '04 / AI AUTOMATION', title: 'AI AGENTS', detail: 'AGRIPULSE · CIVICEYE · METRIKAI' },
  { id: 'current-project', position: [-3.35, -1.15, -2.7], mobile: [-2.0, -1.35, -2.6], accent: '#F0C76A', eyebrow: 'CURRENT PROJECT', title: 'MY OWN OS', detail: 'BUILDING THE SYSTEM FROM THE GROUND UP' },
]
const FOG = ['#172537', '#291C2A', '#13272C', '#1D1930', '#252016', '#18172F']
const ACC = ['#8AFFF0', '#FF7655', '#D5FF6C', '#A991FF', '#F0C76A', '#A991FF']
const EMI = ['#4F8F86', '#8F3F2D', '#6B8416', '#5B4C99', '#9A6A28', '#5B4C99'] // core glow per phase (dimmed)

// Per-phase choreography, indexed [academics, sports, civiceye, ai agents, current, contact].
// Every value is blended by phase weights, so changing scenes morphs smoothly instead of cutting.
const SPIN  = [0.004, 0.014, 0.007, 0.01, 0.004, 0.0006]       // knot spin
const SCALE = [0.94, 1.04, 1, 0.98, 0.88, 0.78]                 // sculpture scale
const RSP   = [0.0015, 0.05, 0.012, 0.02, 0.006, 0.0008]       // ring spin
const RSC   = [1, 1.08, 1, 1.12, 1.2, 1.7]                     // ring scale
const RAX   = [1.571, 0.4, 1.571, 0.8, 1.2, 1.2]               // ring A tilt
const RAY   = [0, 0.5, 0, 0.25, 0.5, 0.5]
const RBX   = [0, -0.6, 0, -0.35, -0.3, -0.3]                  // ring B tilt
const RBY   = [1.571, 1.759, 0, 0.7, 1.2, 1.2]
const CORE  = [1, 1, 0.8, 0.9, 0.72, 0.55]                    // core size
const SWS   = [0.0003, 0.004, 0.0012, 0.002, 0.0008, 0.0004]   // particle swarm spin
const SWC   = [0.75, 1.3, 1, 1.25, 1.45, 1.9]                 // swarm spread
const W = Array(SECTION_COUNT).fill(0)
const mix = (a) => a.reduce((sum, value, i) => sum + W[i] * value, 0)
const STAR_COLORS = ['#8AFFF0', '#66C7FF', '#FF7655', '#D5FF6C', '#A991FF', '#F0C76A', '#E8EEF8']
const WARP_PARTICLES = 64

export default function PortfolioWorld() {
  const width = useThree((s) => s.size.width)
  const scene = useThree((s) => s.scene)
  const mobile = width < 768
  const motion = input.reduced ? 0 : 1
  const artifact = useRef(), tilt = useRef(), knot = useRef(), knotMat = useRef(), ringA = useRef(), ringAMat = useRef(), ringB = useRef()
  const core = useRef(), coreMat = useRef(), swarm = useRef(), wave = useRef(), waveMat = useRef()
  const dir = useRef(), cyan = useRef(), coral = useRef(), rig = useRef()
  const orb = useRef(), orbLight = useRef(), orbMat = useRef()
  const starsGroup = useRef(), warpGroup = useRef(), warpPoints = useRef(), warpMat = useRef()
  const starNodes = useRef([]), starCoreMats = useRef([]), starGlowMats = useRef([]), starRingNodes = useRef([]), starRingMats = useRef([])
  const cardNodes = useRef([])
  const starWorld = useMemo(() => SECTION_STARS.map(({ position }) => new THREE.Vector3(...position)), [])
  const warpPositions = useMemo(() => new Float32Array(WARP_PARTICLES * 3), [])
  const ev = useRef({ idx: 0, waveT: 1, kick: 0, starKick: 0, revealed: intro.done })
  const cards = useRef()
  const C = useMemo(() => ({
    fog: FOG.map((c) => new THREE.Color(c)), acc: ACC.map((c) => new THREE.Color(c)),
    emi: EMI.map((c) => new THREE.Color(c)), ray: new THREE.Vector3(),
  }), [])
  const stars = useMemo(() => {
    const a = new Float32Array(900 * 3)
    for (let i = 0; i < 900; i++) {
      a[i * 3] = (Math.random() - 0.5) * 34
      a[i * 3 + 1] = (Math.random() - 0.5) * 18
      a[i * 3 + 2] = 10 - Math.random() * 26
    }
    return a
  }, [])

  useFrame(({ camera, pointer, clock }, delta) => {
    const { px, py } = input, t = clock.elapsedTime
    const sd = Number.isFinite(input.sd) ? clamp(input.sd, 0, SECTION_COUNT - 1) : 0
    const safeDelta = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 1 / 60
    const safePx = Number.isFinite(px) ? px : 0, safePy = Number.isFinite(py) ? py : 0
    const safeSpeed = Number.isFinite(input.speed) ? input.speed : 0
    for (let i = 0; i < SECTION_COUNT; i++) W[i] = Math.max(0, 1 - Math.abs(sd - i))
    const idx = sceneState.index, e = ev.current
    if (idx !== e.idx) {
      e.idx = idx; e.waveT = 0; e.kick = 1; e.starKick = 1
      waveMat.current.color.copy(C.acc[idx])
    } // phase change: shockwave + star arrival pulse
    e.kick = damp(e.kick, 0, 3, safeDelta)
    e.starKick = damp(e.starKick, 0, 5, safeDelta)
    // intro reveal: the sculpture grows out of the star, then the cards burst outward from it
    const it = intro.t
    const rv = Math.max(0.0001, eob(clamp((it - TL.FLASH) / 1.6, 0, 1)))
    const rc = Math.max(0.0001, eob(clamp((it - TL.FLASH - 0.7) / 1.4, 0, 1)))
    const starReveal = intro.done ? 1 : clamp((it - TL.BANG) / 1.5, 0, 1)
    const introDive = clamp((it - TL.DIVE) / (TL.FLASH - TL.DIVE), 0, 1)
    const contentReady = intro.done || it >= TL.FLASH
    if (!e.revealed && it >= TL.FLASH) { e.revealed = true; e.waveT = 0; waveMat.current.color.copy(C.acc[0]) }
    cards.current.scale.setScalar(rc)
    cardNodes.current.forEach((node, cardIndex) => { if (node) node.visible = contentReady && cardIndex === idx })
    const beat = W[1] * Math.pow(Math.max(0, Math.sin(t * 7)), 6) * 0.06 * motion // sports: heartbeat

    // Each chapter is a fixed, distinct star in the world. During travel, a curved
    // lane of star-dust connects the two landmarks using the exact camera phase.
    const from = sceneState.from, to = sceneState.to, local = clamp(sceneState.local, 0, 1)
    const travelling = intro.done && from >= 0 && to < SECTION_COUNT && local > 0.001 && local < 0.999
    starsGroup.current.visible = starReveal > 0.001
    for (let i = 0; i < SECTION_COUNT; i++) {
      const star = starNodes.current[i], coreMat = starCoreMats.current[i]
      if (!star || !coreMat) continue
      const active = clamp(1 - Math.abs(sd - i), 0, 1)
      const starVisible = starReveal > 0.001 && (i === idx || (travelling && (i === from || i === to)))
      star.visible = starVisible
      const pulse = 1 + Math.sin(t * 3.2 + i * 0.75) * 0.045 * active
      const introBoost = !intro.done && i === 0 ? 1 + introDive * 2.2 : 1
      star.scale.setScalar(starReveal * (0.68 + active * 0.38 + (i === idx ? e.starKick * 0.2 : 0)) * pulse * introBoost)
      coreMat.opacity = Math.min(1, starReveal * (0.3 + active * 0.62 + (i === idx ? e.starKick * 0.12 : 0)) * (i === 0 ? 1 + introDive * 0.35 : 1))
      starGlowMats.current[i].opacity = starReveal * (0.06 + active * 0.2 + (i === idx ? e.starKick * 0.1 : 0))
      starRingMats.current[i].opacity = starReveal * (0.12 + active * 0.26 + (i === idx ? e.starKick * 0.14 : 0))
      starRingNodes.current[i]?.quaternion.copy(camera.quaternion)
    }

    if (travelling) {
      warpGroup.current.visible = true
      const start = starWorld[from], end = starWorld[to], travelGlow = Math.sin(Math.PI * local)
      for (let i = 0; i < WARP_PARTICLES; i++) {
        const p = i / (WARP_PARTICLES - 1)
        const arc = Math.sin(Math.PI * p) * 0.55
        const jitter = (0.018 + travelGlow * 0.05) * Math.sin(t * 5 + i * 1.73)
        warpPositions[i * 3] = start.x + (end.x - start.x) * p + jitter
        warpPositions[i * 3 + 1] = start.y + (end.y - start.y) * p + arc + Math.cos(t * 4 + i) * jitter
        warpPositions[i * 3 + 2] = start.z + (end.z - start.z) * p + Math.sin(t * 4.5 + i * 1.2) * jitter
      }
      warpPoints.current.geometry.attributes.position.needsUpdate = true
      warpMat.current.color.copy(C.acc[to])
      warpMat.current.opacity = 0.08 + travelGlow * 0.72
      warpMat.current.size = 0.035 + travelGlow * 0.035
    } else {
      warpGroup.current.visible = false
    }

    // sculpture: pointer/drag tilt, phase scale, phase spin
    const r = tilt.current.rotation
    r.y = damp(r.y, clamp(safePx * 0.18, -0.26, 0.26) + input.dragY, 5.5, safeDelta)
    r.x = damp(r.x, clamp(safePy * 0.1, -0.26, 0.26) + input.dragX, 5.5, safeDelta)
    tilt.current.scale.setScalar((mix(SCALE) + e.kick * 0.14 * motion + beat) * rv)
    knot.current.rotation.y += (mix(SPIN) + safeSpeed * 0.06) * motion

    const a = ringA.current
    a.rotation.x = mix(RAX); a.rotation.y = mix(RAY)
    a.rotation.z += (mix(RSP) + safeSpeed * 0.09) * motion
    a.scale.setScalar(mix(RSC))
    a.position.y = Math.sin(t * 1.4) * 2.2 * W[2] * motion // civiceye: scanner sweep
    const b = ringB.current
    b.rotation.x = mix(RBX); b.rotation.y = mix(RBY)
    b.rotation.z -= (mix(RSP) * 0.7 + safeSpeed * 0.07) * motion
    b.scale.setScalar(mix(RSC) * 0.9)

    core.current.position.set(safePx * 0.45 * W[2], -safePy * 0.3 * W[2], 0) // civiceye: the core is an eye that tracks the cursor
    core.current.scale.setScalar(mix(CORE) + beat * 2.5)
    swarm.current.rotation.y += (mix(SWS) + safeSpeed * 0.02) * motion
    swarm.current.scale.setScalar(mix(SWC) * rv)

    // phase colours
    const k = 1 - Math.exp(-safeDelta * 3)
    knotMat.current.color.lerp(C.acc[idx], k)
    ringAMat.current.color.lerp(C.acc[idx], k); ringAMat.current.emissive.lerp(C.acc[idx], k)
    coreMat.current.emissive.lerp(C.emi[idx], k)
    scene.fog?.color.lerp(C.fog[idx], 1 - Math.exp(-safeDelta * 4.6))

    // shockwave on phase change
    const w = wave.current
    if (e.waveT < 1) {
      e.waveT += safeDelta / 1.3
      w.visible = true
      w.scale.setScalar(0.5 + e.waveT * 10)
      waveMat.current.opacity = Math.max(0, 1 - e.waveT) * 0.4
      w.quaternion.copy(camera.quaternion)
    } else w.visible = false

    // lighting follows the pointer
    const d = dir.current.position, c = cyan.current.position, o = coral.current.position
    d.x = damp(d.x, -5 + safePx * 1.5, 4, safeDelta); d.y = damp(d.y, 7 - safePy, 4, safeDelta)
    c.x = damp(c.x, -4 + safePx * 8, 5.5, safeDelta); c.y = damp(c.y, 1.4 - safePy * 4, 5.5, safeDelta)
    o.x = damp(o.x, 4 - safePx * 4, 5.5, safeDelta); o.y = damp(o.y, -1 - safePy * 2, 5.5, safeDelta)
    rig.current.position.z = damp(rig.current.position.z, clamp(camera.position.z - 10, -5, 0), 3, safeDelta)

    // cursor orb
    C.ray.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(5).add(camera.position)
    orb.current.position.lerp(C.ray, 1 - Math.exp(-safeDelta * 9))
    orbLight.current.color.lerp(C.acc[idx], 1 - Math.exp(-safeDelta * 4))
    orbMat.current.color.copy(orbLight.current.color)
    orbLight.current.intensity = 9 + safeSpeed * 25
    orb.current.scale.setScalar(rv)
  })

  return (
    <>
      <fogExp2 attach="fog" args={[0x080b16, 0.018]} />
      <Environment resolution={64} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.8} color="#B9F9FF" position={[-4, 5, 3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} />
        <Lightformer form="rect" intensity={2.1} color="#FF7655" position={[5, 1, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#A991FF" position={[0, -2, -3]} scale={3} />
      </Environment>

      <hemisphereLight args={[0xcfe7ff, 0x090a13, 0.9]} />
      <directionalLight ref={dir} castShadow color="#D7F7FF" intensity={3} position={[-5, 7, 8]}
        shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={30}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10}
        shadow-bias={-0.00015} shadow-normalBias={0.025} />
      <group ref={rig}>
        <pointLight ref={cyan} color="#8AFFF0" intensity={9} distance={18} decay={2} position={[-4, 1.4, 1.2]} />
        <pointLight ref={coral} color="#FF7655" intensity={8} distance={16} decay={2} position={[4, -1, 0]} />
      </group>

      <group ref={orb}>
        <pointLight ref={orbLight} color="#D5FF6C" intensity={9} distance={14} decay={2} />
        <mesh><sphereGeometry args={[0.07, 16, 16]} /><meshBasicMaterial ref={orbMat} color="#D5FF6C" toneMapped={false} /></mesh>
        <mesh scale={3.2}><sphereGeometry args={[0.07, 16, 16]} /><meshBasicMaterial color="#C3CEDF" transparent opacity={0.08} depthWrite={false} /></mesh>
      </group>

      <mesh ref={wave} position={[0.45, 0.3, -2]} visible={false}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial ref={waveMat} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={starsGroup}>
        {SECTION_STARS.map((star, i) => (
          <group key={i} ref={(node) => { starNodes.current[i] = node }} position={star.position}>
            <mesh>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshBasicMaterial ref={(mat) => { starCoreMats.current[i] = mat }} color={STAR_COLORS[i]} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh scale={3.5}>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshBasicMaterial ref={(mat) => { starGlowMats.current[i] = mat }} color={STAR_COLORS[i]} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
            <mesh ref={(node) => { starRingNodes.current[i] = node }}>
              <ringGeometry args={[0.19, 0.23, 32]} />
              <meshBasicMaterial ref={(mat) => { starRingMats.current[i] = mat }} color={STAR_COLORS[i]} transparent opacity={0} depthWrite={false} depthTest={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={warpGroup} visible={false}>
        <points ref={warpPoints}>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[warpPositions, 3]} /></bufferGeometry>
          <pointsMaterial ref={warpMat} color="#E8EEF8" size={0.04} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </points>
      </group>

      <group scale={mobile ? 0.72 : 1}>
        <group ref={artifact} visible={false}>
          <Float speed={1.3} rotationIntensity={0.12 * motion} floatIntensity={0.4 * motion}>
            <group position={[0.45, 0.3, -2]}>
              <group ref={tilt}>
                <mesh ref={knot} castShadow rotation={[0.2, -0.4, 0.15]}>
                  <torusKnotGeometry args={[2.25, 0.34, 128, 24, 2, 3]} />
                  <meshPhysicalMaterial ref={knotMat} {...GLASS} color="#8AFFF0" roughness={0.08} metalness={0.08} transmission={0.92} thickness={0.8} ior={1.46} opacity={0.76} envMapIntensity={1.5} />
                </mesh>
                <mesh ref={ringA} rotation={[1.508, 0.503, 0]}>
                  <torusGeometry args={[3.1, 0.035, 12, 96]} />
                  <meshStandardMaterial ref={ringAMat} color="#8AFFF0" emissive="#8AFFF0" emissiveIntensity={1.2} toneMapped={false} />
                </mesh>
                <mesh ref={ringB} rotation={[-0.628, 1.759, 0]}>
                  <torusGeometry args={[2.8, 0.03, 10, 80]} />
                  <meshStandardMaterial color="#FF7655" emissive="#FF7655" emissiveIntensity={1.2} toneMapped={false} />
                </mesh>
                <Float speed={1.8} rotationIntensity={0.35 * motion} floatIntensity={0.25 * motion}>
                  <mesh ref={core} castShadow>
                    <icosahedronGeometry args={[1.05, 3]} />
                    <meshPhysicalMaterial ref={coreMat} color="#B7D95C" emissive="#4F8F86" emissiveIntensity={0.8} roughness={0.1} metalness={0.12} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.6} />
                  </mesh>
                </Float>
              </group>
            </group>
          </Float>
        </group>

        <group ref={cards}>
          {CARDS.map((c, i) => <FloatingCard key={c.id} card={c} position={mobile ? c.mobile : c.position} motion={motion} nodeRef={(node) => { cardNodes.current[i] = node }} />)}
        </group>

        <points ref={swarm}>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry>
          <pointsMaterial color="#F0C76A" size={0.05} sizeAttenuation transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.45, -2]} receiveShadow>
          <planeGeometry args={[22, 22]} />
          <shadowMaterial transparent opacity={0.28} />
        </mesh>
      </group>
    </>
  )
}
